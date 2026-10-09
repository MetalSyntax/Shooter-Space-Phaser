import Phaser from "phaser";
import { synth } from "../utils/Synth";
import { DifficultySettings, DifficultyLevel, DifficultyLabels } from "./MainMenu";
import Player, { PowerKind, MAX_BOMBS } from "../entities/Player";
import Bullet from "../entities/Bullet";
import { SHIPS } from "../entities/Ships";
import { Enemy } from "../entities/Enemy";
import Boss from "../entities/Boss";
import WaveManager from "../managers/WaveManager";
import ParticleManager from "../managers/ParticleManager";
import ScoreManager from "../managers/ScoreManager";
import { CampaignState, LevelDef, levelDef, newCampaign, saveCampaign, clearCampaign, LEVELS, levelThreat } from "../managers/LevelManager";
import HUD from "../ui/HUD";
import { createTouchControls, loadScheme, SCHEMES, TouchInput, ControlScheme } from "../ui/TouchControls";
import { t, getLanguage } from "../utils/i18n";

type Drop = PowerKind | "bomb";
const DROPS: Drop[] = ["shield", "rapid", "bomb", "spread", "missile", "drone", "magnet"];
const DROP_LABELS: Record<Drop, string> = {
  shield: "SHIELD", rapid: "RAPID FIRE", bomb: "+1 HYPER BOMB", spread: "SPREAD SHOT",
  missile: "MISSILES", drone: "HOMING DRONE", magnet: "MAGNET",
};
const DROP_CHANCE = 0.07;
const CRIT_CHANCE = 0.1;
const BOSS_HP_BY_DIFF: Record<DifficultyLevel, number> = { EASY: 0.8, MEDIUM: 1, HARD: 1.25 };

export interface SectorStats {
  kills: number;
  accuracy: number;
  bonus: number;
}

export default class MainGame extends Phaser.Scene {
  // Shared with entities/managers
  player!: Player;
  bullets!: Phaser.Physics.Arcade.Group;
  enemyBullets!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  powerups!: Phaser.Physics.Arcade.Group;
  fx!: ParticleManager;
  hud!: HUD;
  touch?: TouchInput;
  private scheme?: ControlScheme;
  isTouch = false;
  level!: LevelDef;
  campaign!: CampaignState;
  speedMult = 1;
  spawnDelay = 700;

  private difficulty: DifficultyLevel = "MEDIUM";
  private scoreManager!: ScoreManager;
  private waves!: WaveManager;
  private boss?: Boss;
  private ended = false;
  private kills = 0;
  private hits = 0;

  private background!: Phaser.GameObjects.TileSprite;

  constructor() {
    super("MainGame");
  }

  init(data: { campaign?: CampaignState; difficulty?: DifficultyLevel }) {
    this.campaign = data.campaign ?? newCampaign(data.difficulty || "MEDIUM");
    const diff = this.campaign.difficulty as DifficultyLevel;
    this.difficulty = diff in DifficultySettings ? diff : "MEDIUM";
    this.level = levelDef(this.campaign.level);
    const settings = DifficultySettings[this.difficulty];
    // Each sector ramps speed and spawn rate on top of the chosen difficulty.
    this.speedMult = settings.speedMultiplier * (1 + (this.level.id - 1) * 0.05);
    this.spawnDelay = settings.spawnDelay * (1 - (this.level.id - 1) * 0.04);
    this.boss = undefined;
    this.touch = undefined;
    this.scheme = undefined;
    this.ended = false;
    this.kills = 0;
    this.hits = 0;
  }

  create() {
    const { width, height } = this.scale;
    this.isTouch = this.sys.game.device.input.touch;
    this.scoreManager = new ScoreManager(DifficultySettings[this.difficulty].scoreMulti, this.campaign.score);
    saveCampaign(this.campaign); // auto-save at the start of every sector
    this.input.mouse?.disableContextMenu();

    // Procedural sector backdrop + themed parallax props
    this.background = this.add.tileSprite(0, 0, width, height, `bg_${this.level.id}`).setOrigin(0, 0).setScrollFactor(0).setDepth(-10);
    this.setupBackgroundFx();

    // Groups (bullets are pooled and recycle themselves off-screen)
    this.bullets = this.physics.add.group({ classType: Bullet, maxSize: 150, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, maxSize: 300, runChildUpdate: true });
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    this.fx = new ParticleManager(this);
    const shipId = this.campaign.ship && this.campaign.ship in SHIPS ? this.campaign.ship : "vanguard";
    const ship = SHIPS[shipId];
    const diffText = DifficultyLabels()[this.difficulty] ?? this.difficulty;
    this.hud = new HUD(this, `${diffText} · S${this.level.id}`, ScoreManager.best()?.score ?? 0, () => this.pauseGame(), `ship_${shipId}`);
    this.player = new Player(this, width / 2, height - 100, this.campaign.lives, this.campaign.perks, ship, `ship_${shipId}`);
    if (ship.permanentDrone) this.player.activate("drone", Infinity);
    if (ship.sectorShield) this.player.activate("shield", ship.sectorShield);
    this.setupTouch();
    this.hud.setLives(this.player.lives);
    this.hud.setBombs(this.player.bombs);
    this.hud.setScore(this.scoreManager.score);

    // Collisions
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as Bullet, e as Enemy));
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => this.onPlayerContact(e as Enemy));
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => this.onPlayerContact(b as Bullet));
    this.physics.add.overlap(this.player, this.powerups, (_p, pu) => this.collectPowerup(pu as Phaser.Physics.Arcade.Image));

    // Pause: ESC, on-screen button, or gamepad START
    this.input.keyboard?.on("keydown-ESC", () => this.pauseGame());
    this.input.gamepad?.on("down", (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 9) this.pauseGame();
    });

    this.waves = new WaveManager(this);
    this.waves.start();
    this.hud.announce(`SECTOR ${this.level.id}\n${this.level.name}`, "#ffdd33");
    this.time.delayedCall(1700, () => this.hud.announce(levelThreat(this.level), this.level.unlock ? "#ff9d4d" : "#c8d0e8", 12));
    if (this.isTouch) this.time.delayedCall(3400, () => this.hud.announce(SCHEMES[loadScheme()].hint, "#8892b0", 12));
    this.events.on("resume", () => this.setupTouch());

    this.handleResize({ width, height });
    this.scale.on("resize", this.handleResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this.handleResize, this));

    synth.playCombatMusic(this.level.bpm, this.level.id);
  }

  update(time: number, delta: number) {
    this.background.tilePositionY -= 0.6 + this.level.id * 0.05;
    if (this.level.fx === "distortion") this.background.tilePositionX = Math.sin(time / 700) * 12;

    this.player.update(time, delta);
    this.waves.update(delta);
    this.scoreManager.update(delta);
    this.fx.update(delta);
    this.hud.update({ mult: this.scoreManager.multiplier, timer: this.scoreManager.comboTimer }, this.player.powers, this.boss ? -1 : this.waves.progress);
    this.cleanupPowerups();
  }

  /** Themed background behavior per sector (props drifting by, lightning, pulse...). */
  private setupBackgroundFx() {
    const { decor, fx } = this.level;
    if (decor) {
      this.time.addEvent({
        delay: 2600, loop: true, startAt: 2000,
        callback: () => {
          const { width, height } = this.scale;
          const s = this.add.image(Phaser.Math.Between(0, width), -80, `decor_${decor}`)
            .setDepth(-5).setAlpha(Phaser.Math.FloatBetween(0.25, 0.5)).setScale(Phaser.Math.FloatBetween(0.6, 1.3))
            .setAngle(decor === "rings" || decor === "structures" ? 0 : Phaser.Math.Between(0, 360));
          this.tweens.add({ targets: s, y: height + 120, angle: s.angle + Phaser.Math.Between(-40, 40), duration: Phaser.Math.Between(12000, 20000), onComplete: () => s.destroy() });
        },
      });
    }
    if (fx === "lightning") {
      this.time.addEvent({ delay: 5000, loop: true, callback: () => { if (Math.random() < 0.7) this.cameras.main.flash(120, 255, 140, 90); } });
    }
    if (fx === "pulse") this.tweens.add({ targets: this.background, alpha: 0.6, duration: 60000 / this.level.bpm, yoyo: true, loop: -1 });
    if (fx === "gravity") this.tweens.add({ targets: this.background, tileScaleX: 1.08, tileScaleY: 1.08, duration: 3000, yoyo: true, loop: -1, ease: "Sine.InOut" });
  }

  /** Builds the selected mobile scheme; rebuilt on resume if it was changed in the pause menu. */
  private setupTouch() {
    if (!this.isTouch) return;
    const scheme = loadScheme();
    if (scheme === this.scheme && this.touch) return;
    this.touch?.destroy();
    this.scheme = scheme;
    this.touch = createTouchControls(this, scheme, {
      onRotate: deg => this.player.rotateBy(deg),
      onBomb: () => this.player.useBomb(),
      ship: () => ({ x: this.player.x, y: this.player.y }),
    });
    this.touch.layout(this.scale.width, this.scale.height);
  }

  private pauseGame() {
    if (this.ended || !this.scene.isActive()) return;
    this.scene.launch("Pause", { campaign: this.campaign });
    this.scene.pause();
  }

  // --- API used by entities/managers ---

  countWaveEnemies(): number {
    return (this.enemies.getChildren() as Enemy[]).filter(e => e.active && !e.bossPart).length;
  }

  /** Default texture = the sector's boss-colored bullet; regular enemies pass their ability color. */
  fireEnemyBullet(x: number, y: number, angle: number, speed = 250, sound = true, fake = false, texture = `eb_${this.level.id}`): Bullet | null {
    const bullet = this.enemyBullets.get() as Bullet | null;
    if (!bullet) return null;
    bullet.fire(x, y, angle, speed * (0.85 + this.speedMult * 0.1), { texture, fake });
    if (sound) synth.playEnemyShoot();
    return bullet;
  }

  fireEnemyBulletAt(x: number, y: number, speed = 250, fake = false) {
    this.fireEnemyBullet(x, y, Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y), speed, true, fake);
  }

  nearestTarget(x: number, y: number): Phaser.GameObjects.Sprite | undefined {
    let best: Phaser.GameObjects.Sprite | undefined;
    let bestDist = Infinity;
    const check = (t: Phaser.GameObjects.Sprite) => {
      if (!t.active || t.y < 0) return;
      const d = Phaser.Math.Distance.Squared(x, y, t.x, t.y);
      if (d < bestDist) { bestDist = d; best = t; }
    };
    (this.enemies.getChildren() as Enemy[]).forEach(e => !e.invulnerable && check(e));
    if (this.boss && !this.boss.invulnerable) check(this.boss);
    return best;
  }

  spawnPowerup(x = Phaser.Math.Between(30, this.scale.width - 30), y = -30) {
    const kind = Phaser.Utils.Array.GetRandom(DROPS);
    const pu = this.powerups.create(x, y, `powerup_${kind}`) as Phaser.Physics.Arcade.Image;
    pu.setVelocityY(100).setData("kind", kind);
  }

  startBoss() {
    const hp = Math.round((60 + this.level.id * 15) * BOSS_HP_BY_DIFF[this.difficulty]);
    this.boss = new Boss(this, this.level, hp);
    this.physics.add.overlap(this.boss, this.bullets, (_b, bullet) => this.hitBoss(bullet as Bullet));
    this.physics.add.overlap(this.player, this.boss, () => {
      if (this.boss?.invulnerable) return;
      this.damagePlayer();
      this.player.setVelocityY(300);
    });
  }

  damagePlayer() {
    const result = this.player.takeHit();
    if (result !== "damaged" && result !== "dead") return;
    this.scoreManager.resetCombo();
    this.hud.setLives(this.player.lives);
    this.fx.explode(this.player.x, this.player.y, 0.6);
    this.fx.shake(0.55);
    synth.playExplosion();
    if (result === "dead") this.gameOver();
  }

  /** Secondary fire: expanding shockwave that wipes enemy bullets and hurts everything. */
  hyperBomb() {
    const { x, y } = this.player;
    synth.playBomb();
    this.cameras.main.flash(300, 180, 220, 255);
    this.fx.shake(0.6);
    this.fx.explode(x, y, 2);
    const wave = this.add.circle(x, y, 20).setStrokeStyle(10, 0x66ccff, 0.9).setDepth(20);
    this.tweens.add({ targets: wave, scale: Math.max(this.scale.width, this.scale.height) / 10, alpha: 0, duration: 600, ease: "Cubic.Out", onComplete: () => wave.destroy() });
    (this.enemyBullets.getChildren() as Bullet[]).forEach(b => {
      if (b.active) { this.fx.sparkBurst(b.x, b.y, 2); b.kill(); }
    });
    [...(this.enemies.getChildren() as Enemy[])].forEach(e => {
      if (e.active && e.damage(5)) this.killEnemy(e);
    });
    this.damageBoss(5);
    this.hud.setBombs(this.player.bombs);
  }

  /** Boss destroyed: bonus, then perk selection (or the final victory). */
  levelComplete() {
    if (this.ended) return;
    this.ended = true;
    const accuracy = this.player.shotsFired ? Math.min(1, this.hits / this.player.shotsFired) : 0;
    const bonus = Math.round((accuracy * 1000 + this.kills * 10) * this.level.id);
    this.scoreManager.score += bonus;
    const stats: SectorStats = { kills: this.kills, accuracy, bonus };
    const campaign: CampaignState = { ...this.campaign, score: this.scoreManager.score, lives: this.player.lives };
    synth.setMusicIntensity(false);

    if (this.level.id >= LEVELS.length) {
      const newRecord = ScoreManager.submit(campaign.score, this.difficulty);
      clearCampaign();
      this.scene.start("Victory", { score: campaign.score, difficulty: this.difficulty, newRecord });
      return;
    }
    this.scene.start("LevelClear", { campaign, stats, level: this.level });
  }

  // --- Combat ---

  private hitEnemy(bullet: Bullet, enemy: Enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.kill();
    this.hits++;
    if (enemy.invulnerable) {
      this.fx.sparkBurst(bullet.x, bullet.y, 3);
      return;
    }
    if (enemy.damage(bullet.damage)) {
      this.killEnemy(enemy);
      return;
    }
    this.fx.sparkBurst(enemy.x, enemy.y);
    if (enemy.heavy) {
      this.fx.flashSprite(enemy);
      this.fx.hitStop();
      this.fx.shake(0.08);
    }
  }

  private hitBoss(bullet: Bullet) {
    if (!bullet.active || !this.boss || this.boss.invulnerable) return;
    this.hits++;
    this.fx.sparkBurst(bullet.x, bullet.y);
    this.damageBoss(bullet.damage);
    bullet.kill();
  }

  private damageBoss(amount: number) {
    if (!this.boss || this.boss.invulnerable) return;
    this.boss.damage(amount);
    if (this.boss.state !== "DYING") return;
    const points = this.scoreManager.addPoints(1000 * this.level.id);
    this.fx.floatingText(this.boss.x, this.boss.y, `${this.level.bossName} DESTROYED +${points}`, "#ffdd33", 24);
    this.hud.setScore(this.scoreManager.score);
  }

  private killEnemy(enemy: Enemy) {
    const { x, y } = enemy;
    const crit = Math.random() < CRIT_CHANCE;
    const { points, tierUp } = this.scoreManager.addKill(enemy.points, crit);
    this.kills++;
    enemy.onKilled();
    enemy.destroy();

    this.fx.explode(x, y, enemy.explosionSize);
    this.fx.shake(0.12 * enemy.explosionSize);
    this.fx.floatingText(x, y, crit ? `CRITICAL! +${points}` : `+${points}`, crit ? "#ff5555" : "#ffffff", crit ? 20 : 16);
    if (tierUp) {
      const mult = this.scoreManager.multiplier;
      this.fx.floatingText(x, y - 30, `COMBO x${mult.toFixed(1)}`, "#ffdd33", 22);
      synth.playCombo(mult >= 3 ? 2 : mult >= 2 ? 1 : 0);
    }
    synth.playExplosion(enemy.heavy);
    this.hud.setScore(this.scoreManager.score);
    if (Math.random() < DROP_CHANCE) this.spawnPowerup(x, y);
  }

  private onPlayerContact(danger: Enemy | Bullet) {
    if (!danger.active || this.ended) return;
    if (danger instanceof Bullet) {
      danger.kill();
      if (!danger.fake) this.damagePlayer();
      return;
    }
    if (danger.solid) {
      this.damagePlayer();
      return;
    }
    if (this.player.has("shield")) {
      this.fx.shieldRipple(this.player.x, this.player.y, 30);
      this.killEnemy(danger);
      return;
    }
    this.fx.explode(danger.x, danger.y, danger.explosionSize);
    danger.destroy();
    this.damagePlayer();
  }

  private collectPowerup(pu: Phaser.Physics.Arcade.Image) {
    if (!pu.active) return;
    const kind = pu.getData("kind") as Drop;
    pu.destroy();
    synth.playPowerUp();
    this.fx.floatingText(this.player.x, this.player.y - 30, DROP_LABELS[kind], "#00ffcc", 16);
    if (kind === "bomb") {
      this.player.bombs = Math.min(MAX_BOMBS, this.player.bombs + 1);
      this.hud.setBombs(this.player.bombs);
    } else this.player.activate(kind);
  }

  // --- Lifecycle ---

  private cleanupPowerups() {
    const { width, height } = this.scale;
    [...(this.powerups.getChildren() as Phaser.Physics.Arcade.Image[])].forEach(p => {
      if (p.y > height + 100 || p.x < -100 || p.x > width + 100) p.destroy();
    });
  }

  private handleResize(gameSize: { width: number; height: number }) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);
    this.background.setSize(width, height);
    this.hud.layout();
    this.touch?.layout(width, height);
  }

  private gameOver() {
    this.player.setActive(false).setVisible(false);
    if (this.ended) return;
    this.ended = true;
    const score = this.scoreManager.score;
    const newRecord = ScoreManager.submit(score, this.difficulty);
    synth.setMusicIntensity(false);
    // Retry restarts the current sector from its auto-save (score/perks at sector start).
    this.scene.start("GameOver", { score, difficulty: this.difficulty, newRecord, campaign: this.campaign });
  }
}
