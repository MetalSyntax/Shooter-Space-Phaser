import Phaser from "phaser";
import { synth } from "../utils/Synth";
import { DifficultySettings, DifficultyLevel } from "./MainMenu";

export default class MainGame extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: any;
  private wasd?: any;

  // Groups
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;

  // Visuals
  private background!: Phaser.GameObjects.TileSprite;
  private starfield!: Phaser.GameObjects.TileSprite;
  private shieldVisual!: Phaser.GameObjects.Arc;

  // UI
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private lives: number = 3;
  private livesText!: Phaser.GameObjects.Text;
  private difficultyText!: Phaser.GameObjects.Text;

  // Logic
  private lastFired: number = 0;
  private baseFireDelay: number = 200;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private settings: any;

  // Powerups State
  private hasShield: boolean = false;
  private rapidFireActive: boolean = false;

  // Touch Controls
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickThumb!: Phaser.GameObjects.Arc;
  private joystickPointer: Phaser.Input.Pointer | null = null;
  private joystickForce: { x: number; y: number } = { x: 0, y: 0 };

  // Buttons
  private rotateLeftBtn!: Phaser.GameObjects.Container;
  private rotateRightBtn!: Phaser.GameObjects.Container;
  private fireBtn!: Phaser.GameObjects.Container;
  private menuBtn!: Phaser.GameObjects.Text;

  private touchControlsVisible: boolean = false;
  private playerRotation: number = -90;

  constructor() {
    super("MainGame");
  }

  init(data: { difficulty: DifficultyLevel }) {
    const diff = data.difficulty || "MEDIUM";
    this.settings = DifficultySettings[diff];
    this.lives = 3;
    this.score = 0;
    this.hasShield = false;
    this.rapidFireActive = false;
    this.playerRotation = -90;
  }

  create() {
    const { width, height } = this.cameras.main;

    // Enable Multi-touch
    this.input.addPointer(3);

    // 1. Backgrounds
    this.starfield = this.add.tileSprite(0, 0, width, height, "star").setOrigin(0, 0).setAlpha(0.3);
    this.background = this.add.tileSprite(0, 0, width, height, "background").setOrigin(0, 0).setAlpha(0.1);

    // 2. Player
    this.player = this.physics.add.sprite(width / 2, height - 100, "ship");
    this.player.setAngle(-90);
    this.player.setDamping(true);
    this.player.setDrag(0.95);
    this.player.setMaxVelocity(400);
    this.player.setCollideWorldBounds(false);

    // Shield Visual
    this.shieldVisual = this.add.circle(0, 0, 30, 0x0000ff, 0.3);
    this.shieldVisual.setStrokeStyle(2, 0x00ffff);
    this.shieldVisual.setVisible(false);

    // 3. Groups
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: "bullet", maxSize: 30, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, defaultKey: "enemyBullet", maxSize: 50, runChildUpdate: true });
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.powerups = this.physics.add.group();

    // 4. Inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys("W,S,A,D,Q,E");
    }

    // 5. Collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, undefined, this);

    // 6. UI
    this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "20px", color: "#fff", fontFamily: "Arial" });
    this.livesText = this.add.text(width - 120, 20, "Lives: 3", { fontSize: "20px", color: "#fff", fontFamily: "Arial" });

    const diffName = Object.keys(DifficultySettings).find((key) => DifficultySettings[key as DifficultyLevel] === this.settings);
    this.difficultyText = this.add.text(width / 2, 20, `${diffName} MODE`, { fontSize: "16px", color: "#ffff00" }).setOrigin(0.5, 0);

    this.menuBtn = this.add.text(20, 60, "MENU", {
      fontSize: "20px",
      color: "#ffffff",
      backgroundColor: "#333333",
      padding: { x: 10, y: 5 }
    })
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenu'));

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => {
        this.scene.start('MainMenu');
      });
    }

    // 7. Spawner
    this.spawnTimer = this.time.addEvent({ delay: this.settings.spawnDelay, callback: this.spawnSequence, callbackScope: this, loop: true });

    // 8. Touch Controls
    this.createTouchControls();

    // Force initial positioning
    this.handleResize({ width, height });

    this.scale.on("resize", this.handleResize, this);
  }

  update(time: number, delta: number) {
    this.background.tilePositionY -= 2;
    this.starfield.tilePositionY -= 0.5;

    if (!this.player.active) return;

    if (this.hasShield) {
      this.shieldVisual.setPosition(this.player.x, this.player.y);
    }

    this.updateJoystick();

    // Movement
    const accel = 600;
    let accelX = 0;
    let accelY = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) accelX = -accel;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) accelX = accel;

    if (this.cursors.up.isDown || this.wasd.W.isDown) accelY = -accel;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) accelY = accel;

    if (this.joystickForce.x !== 0 || this.joystickForce.y !== 0) {
      accelX = this.joystickForce.x * accel;
      accelY = this.joystickForce.y * accel;
    }

    this.player.setAccelerationX(accelX);
    this.player.setAccelerationY(accelY);

    // Rotation
    if (this.wasd.Q.isDown) this.playerRotation -= 3;
    else if (this.wasd.E.isDown) this.playerRotation += 3;

    this.player.setAngle(this.playerRotation);
    this.physics.world.wrap(this.player, 20);

    // Shoot (Keyboard)
    if (this.cursors.space.isDown && time > this.lastFired) {
      this.fireBullet(time);
    }

    // Enemy Logic
    this.enemies.children.iterate((enemy: any) => {
      if (enemy && enemy.active) {
        if (enemy.getData("type") === "weaver") enemy.x += Math.sin(time / 200) * 3;
        if (enemy.getData("type") === "shooter") {
          if (time > enemy.getData("nextShot")) {
            this.fireEnemyBullet(enemy);
            enemy.setData("nextShot", time + 2000);
          }
        }
        if (enemy.y > this.cameras.main.height + 50) enemy.destroy();
      }
      return true;
    });

    this.cleanup();
  }

  private fireBullet(time: number) {
    const angleRad = Phaser.Math.DegToRad(this.playerRotation);
    const offsetDistance = 20;
    const bulletX = this.player.x + Math.cos(angleRad) * offsetDistance;
    const bulletY = this.player.y + Math.sin(angleRad) * offsetDistance;

    const bullet = this.bullets.get(bulletX, bulletY, "bullet");
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setAngle(this.playerRotation);
      const speed = 600;
      bullet.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
      this.lastFired = time + (this.rapidFireActive ? this.baseFireDelay / 2 : this.baseFireDelay);
      synth.playLaser();
    }
  }

  // --- TOUCH CONTROLS ---

  private createTouchControls() {
    // 1. JOYSTICK
    this.joystickBase = this.add.circle(0, 0, 50, 0x333333, 0.5)
      .setStrokeStyle(2, 0x666666).setScrollFactor(0).setDepth(1000).setInteractive();

    this.joystickThumb = this.add.circle(0, 0, 25, 0x00ff00, 0.7)
      .setStrokeStyle(2, 0x00ffff).setScrollFactor(0).setDepth(1001);

    this.joystickBase.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.joystickPointer = pointer; });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer === pointer) this.updateJoystickPos(pointer);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickPointer === pointer) {
        this.joystickPointer = null;
        this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
        this.joystickForce = { x: 0, y: 0 };
      }
    });

    // 2. ROTATION BUTTONS
    this.rotateLeftBtn = this.createButton('↶', 0x00ffff, () => {
      this.tweens.add({ targets: this, playerRotation: this.playerRotation - 15, duration: 100, ease: 'Linear' });
    });

    this.rotateRightBtn = this.createButton('↷', 0x00ffff, () => {
      this.tweens.add({ targets: this, playerRotation: this.playerRotation + 15, duration: 100, ease: 'Linear' });
    });

    // 3. FIRE BUTTON
    this.fireBtn = this.createButton('🔥', 0xff0000, () => {
      this.fireBullet(this.time.now);
    });

    let fireInterval: Phaser.Time.TimerEvent | null = null;
    this.fireBtn.on('pointerdown', () => {
      fireInterval = this.time.addEvent({
        delay: this.rapidFireActive ? this.baseFireDelay / 2 : this.baseFireDelay,
        callback: () => this.fireBullet(this.time.now), loop: true
      });
    });

    const stopFire = () => { if (fireInterval) { fireInterval.remove(); fireInterval = null; } };
    this.fireBtn.on('pointerup', stopFire);
    this.fireBtn.on('pointerout', stopFire);
  }

  private createButton(label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    container.setScrollFactor(0).setDepth(1000);
    const hitArea = new Phaser.Geom.Circle(0, 0, 45); // Slightly smaller hit area to prevent overlap
    const bg = this.add.circle(0, 0, 35, 0x333333, 0.8).setStrokeStyle(2, color);
    const text = this.add.text(0, 0, label, { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    container.add([bg, text]);
    container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    container.on('pointerdown', () => { bg.setFillStyle(color, 0.5); container.setScale(0.9); onClick(); });
    container.on('pointerup', () => { bg.setFillStyle(0x333333, 0.8); container.setScale(1.0); });
    container.on('pointerout', () => { bg.setFillStyle(0x333333, 0.8); container.setScale(1.0); });
    return container;
  }

  private updateJoystickPos(pointer: Phaser.Input.Pointer) {
    const baseX = this.joystickBase.x;
    const baseY = this.joystickBase.y;
    const angle = Phaser.Math.Angle.Between(baseX, baseY, pointer.x, pointer.y);
    const distance = Math.min(Phaser.Math.Distance.Between(baseX, baseY, pointer.x, pointer.y), 50);
    const thumbX = baseX + Math.cos(angle) * distance;
    const thumbY = baseY + Math.sin(angle) * distance;
    this.joystickThumb.setPosition(thumbX, thumbY);
    this.joystickForce.x = (thumbX - baseX) / 50;
    this.joystickForce.y = (thumbY - baseY) / 50;
  }

  private updateJoystick() {
    if (!this.joystickPointer) {
      this.joystickForce = { x: 0, y: 0 };
      this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
    }
  }

  // --- HELPERS ---

  private fireEnemyBullet(enemy: Phaser.GameObjects.Sprite) {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y + 20, "enemyBullet");
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      this.physics.moveToObject(bullet, this.player, 250);
      bullet.setRotation(Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y) + Math.PI / 2);
      synth.playEnemyShoot();
    }
  }

  private spawnSequence() {
    const { width } = this.cameras.main;
    const rand = Math.random();
    const speedMult = this.settings.speedMultiplier;
    let type = "basic", texture = "enemy", velocityY = 150 * speedMult;

    if (rand > 0.8) { type = "shooter"; texture = "enemyShip"; velocityY = 80 * speedMult; }
    else if (rand > 0.6) { type = "weaver"; texture = "enemyWeaver"; velocityY = 200 * speedMult; }

    const x = Phaser.Math.Between(30, width - 30);
    const enemy = this.enemies.create(x, -50, texture);
    enemy.setVelocityY(velocityY);
    enemy.setData("type", type);
    enemy.setData("nextShot", 0);

    if (Math.random() < 0.05) this.spawnPowerup();
  }

  private spawnPowerup() {
    const { width } = this.cameras.main;
    const types = ["powerup_shield", "powerup_rapid", "powerup_bomb"];
    const type = Phaser.Utils.Array.GetRandom(types);
    const pu = this.powerups.create(Phaser.Math.Between(30, width - 30), -50, type);
    pu.setVelocityY(100);
    pu.setData("type", type);
  }

  private collectPowerup(player: any, powerup: any) {
    const type = powerup.getData("type");
    powerup.destroy();
    synth.playPowerUp();
    if (type === "powerup_shield") this.activateShield();
    else if (type === "powerup_rapid") this.activateRapidFire();
    else if (type === "powerup_bomb") this.activateBomb();
  }

  private activateShield() {
    this.hasShield = true;
    this.shieldVisual.setVisible(true);
    this.time.delayedCall(5000, () => { this.hasShield = false; this.shieldVisual.setVisible(false); });
  }

  private activateRapidFire() {
    this.rapidFireActive = true;
    this.time.delayedCall(4000, () => { this.rapidFireActive = false; });
  }

  private activateBomb() {
    synth.playBomb();
    this.cameras.main.flash(500, 255, 255, 255);
    this.enemies.clear(true, true);
    this.enemyBullets.clear(true, true);
  }

  private hitEnemy(bullet: any, enemy: any) {
    if (bullet.active && enemy.active) {
      const explosion = this.add.circle(enemy.x, enemy.y, 5, 0xffaa00);
      this.tweens.add({ targets: explosion, scale: 3, alpha: 0, duration: 200, onComplete: () => explosion.destroy() });
      bullet.destroy();
      enemy.destroy();
      this.score += 10 * this.settings.scoreMulti;
      this.scoreText.setText(`Score: ${this.score}`);
      synth.playExplosion();
    }
  }

  private hitPlayer(player: any, danger: any) {
    if (this.hasShield) { danger.destroy(); return; }
    if (player.active && danger.active) {
      danger.destroy();
      this.lives--;
      this.livesText.setText(`Lives: ${this.lives}`);
      synth.playExplosion();
      this.cameras.main.shake(200, 0.01);
      this.player.setTint(0xff0000);
      this.time.delayedCall(200, () => this.player.clearTint());
      if (this.lives <= 0) this.gameOver();
    }
  }

  private cleanup() {
    const { height } = this.cameras.main;
    const killY = height + 100;
    const clean = (g: Phaser.Physics.Arcade.Group) => {
      g.children.iterate((c: any) => {
        if (c && c.active && (c.y > killY || c.y < -100)) c.destroy();
        return true;
      });
    };
    clean(this.bullets);
    clean(this.enemyBullets);
    clean(this.powerups);
  }

  private handleResize(gameSize: any) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.background.setSize(width, height);
    this.starfield.setSize(width, height);
    this.livesText.setPosition(width - 120, 20);
    this.difficultyText.setPosition(width / 2, 20);
    if (this.menuBtn) this.menuBtn.setPosition(20, 60);

    // REFINED CONTROL POSITIONING
    // Joystick: Bottom Left, moved up for mobile browser bar safety
    const safeBottomMargin = 120;
    const joystickX = 80;
    const joystickY = height - safeBottomMargin;

    if (this.joystickBase) {
      this.joystickBase.setPosition(joystickX, joystickY);
      this.joystickThumb.setPosition(joystickX, joystickY);
    }

    // Action Buttons: Bottom Right Cluster
    // Move them further right to open up the center for the ship
    const buttonBottomY = height - (safeBottomMargin - 10); // ~110 from bottom
    const buttonTopY = height - (safeBottomMargin + 80); // ~200 from bottom

    // Rotate Right: Far bottom right corner
    if (this.rotateRightBtn) this.rotateRightBtn.setPosition(width - 60, buttonBottomY);

    // Rotate Left: To the left of Rotate Right
    if (this.rotateLeftBtn) this.rotateLeftBtn.setPosition(width - 150, buttonBottomY);

    // Fire: Above the two rotation buttons, centered relative to them approx
    if (this.fireBtn) this.fireBtn.setPosition(width - 70, buttonTopY);
  }

  private gameOver() {
    this.player.setActive(false).setVisible(false);
    this.shieldVisual.setVisible(false);
    this.scene.start("GameOver", { score: this.score });
  }
}