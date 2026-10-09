import Phaser from 'phaser';
import type MainGame from '../scenes/MainGame';
import { ABILITIES, type AbilityColor } from '../managers/LevelManager';

/** Base enemy: hit points, score value and off-screen cleanup. Subclasses define movement/attacks. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare scene: MainGame;
  hp = 1;
  points = 10;
  /** Heavy enemies trigger hit-stop + white flash when hit. */
  heavy = false;
  /** Contact with the player doesn't destroy it (turrets, barriers, shield orbs). */
  solid = false;
  /** Absorbs player shots without taking damage (shield orbs, barriers, blinking). */
  invulnerable = false;
  /** Excluded from "wave cleared" checks (boss parts). */
  bossPart = false;
  explosionSize = 1;

  constructor(scene: MainGame, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.enemies.add(this); // enables the body; set velocity only after this
  }

  get speedMult(): number {
    return this.scene.speedMult;
  }

  /** Returns true when this hit destroyed the enemy. */
  damage(amount: number): boolean {
    if (this.invulnerable) return false;
    this.hp -= amount;
    return this.hp <= 0;
  }

  /** Called by the scene right before the enemy is destroyed by the player. */
  onKilled(): void {}

  /** Fires one bullet in the enemy's ability color. */
  protected shoot(angle: number, color: AbilityColor, speed = 250, sound = true): void {
    this.scene.fireEnemyBullet(this.x, this.y + this.displayHeight * 0.4, angle, speed, sound, false, `eb_${color}`);
  }

  protected aimAngle(): number {
    return Phaser.Math.Angle.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const { width, height } = this.scene.scale;
    if (this.y > height + 120 || this.x < -200 || this.x > width + 200) this.destroy();
  }
}

// --- Drones (original weaver hull) ---

/** White drone flying straight down: no ability. */
export class Drone extends Enemy {
  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_drone');
    this.setVelocityY(150 * this.speedMult);
  }
}

/** White drone zig-zagging down. */
export class Weaver extends Enemy {
  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_drone');
    this.points = 15;
    this.setVelocityY(170 * this.speedMult);
  }

  preUpdate(time: number, delta: number): void {
    this.setVelocityX(Math.sin(time / 200) * 180);
    super.preUpdate(time, delta);
  }
}

/** Drone entering from a top corner and curving down in an arc (V formations). */
export class Swooper extends Enemy {
  private heading: number;
  private turn: number;
  private speed: number;

  constructor(scene: MainGame, x: number, y: number, fromLeft: boolean) {
    super(scene, x, y, 'en_drone');
    this.points = 15;
    this.heading = fromLeft ? 10 : 170;
    this.turn = fromLeft ? 55 : -55; // deg/s
    this.speed = 220 * this.speedMult;
  }

  preUpdate(time: number, delta: number): void {
    const target = 100;
    if (Math.abs(this.heading - target) > 1) {
      this.heading += this.turn * delta / 1000;
      if ((this.turn > 0 && this.heading > target) || (this.turn < 0 && this.heading < target)) this.heading = target;
    }
    const rad = Phaser.Math.DegToRad(this.heading);
    this.setVelocity(Math.cos(rad) * this.speed, Math.sin(rad) * this.speed);
    this.setRotation(rad - Math.PI / 2);
    super.preUpdate(time, delta);
  }
}

/** PURPLE · teleport: blinks sideways every few seconds and shoots right after reappearing. */
export class Blinker extends Enemy {
  private timer = 1200;

  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_drone_purple');
    this.hp = 2;
    this.points = 30;
    this.setVelocityY(90 * this.speedMult);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.timer -= delta;
    if (this.timer > 0) return;
    this.timer = 1700;
    this.invulnerable = true;
    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.2, duration: 160, yoyo: true,
      onYoyo: () => {
        this.scene.fx.sparkBurst(this.x, this.y, 6);
        const { width } = this.scene.scale;
        this.x = Phaser.Math.Clamp(this.x + Phaser.Math.Between(-140, 140), 30, width - 30);
      },
      onComplete: () => {
        this.invulnerable = false;
        if (this.active && this.y > 0) this.shoot(this.aimAngle(), 'purple', 260);
      },
    });
  }
}

/** YELLOW · small kamikaze drone that locks on and accelerates into the player. */
export class Kamikaze extends Enemy {
  private speed = 120;

  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_drone_yellow');
    this.setScale(0.7);
    this.points = 15;
    this.explosionSize = 0.7;
  }

  preUpdate(time: number, delta: number): void {
    const p = this.scene.player;
    this.speed = Math.min(this.speed + delta * 0.25, 340 * this.speedMult);
    const heading = Phaser.Math.Angle.RotateTo(this.rotation + Math.PI / 2, Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y), 0.003 * delta);
    this.setRotation(heading - Math.PI / 2).setVelocity(Math.cos(heading) * this.speed, Math.sin(heading) * this.speed);
    super.preUpdate(time, delta);
  }
}

/** BLUE · pod (weaver body) protected by a bubble shield that soaks 3 hits. */
export class Pod extends Enemy {
  private shield = 3;
  private bubble: Phaser.GameObjects.Arc;
  private cooldown = 1500;

  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_pod_blue');
    this.hp = 2;
    this.points = 35;
    this.heavy = true;
    this.bubble = scene.add.circle(x, y, 32, ABILITIES.blue.color, 0.18).setStrokeStyle(2, ABILITIES.blue.color, 0.9).setDepth(6);
    this.setVelocityY(60 * this.speedMult);
  }

  damage(amount: number): boolean {
    if (this.shield > 0) {
      this.shield--;
      this.bubble.setFillStyle(0xffffff, 0.5);
      this.scene.time.delayedCall(60, () => this.bubble.active && this.bubble.setFillStyle(ABILITIES.blue.color, 0.18));
      if (this.shield === 0) {
        this.scene.fx.shieldRipple(this.x, this.y, 32);
        this.bubble.setVisible(false);
      }
      return false;
    }
    return super.damage(amount);
  }

  preUpdate(time: number, delta: number): void {
    this.setVelocityX(Math.sin(time / 600) * 60);
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.bubble.setPosition(this.x, this.y);
    this.cooldown -= delta;
    if (this.cooldown <= 0 && this.y > 0) {
      this.shoot(this.aimAngle(), 'blue', 200);
      this.cooldown = 2500;
    }
  }

  destroy(fromScene?: boolean): void {
    this.bubble?.destroy();
    super.destroy(fromScene);
  }
}

// --- Gunships (original red ship hull) ---

/** RED · the original shooter: aimed shot every 2 s. */
export class Gunship extends Enemy {
  protected cooldown = 800;

  constructor(scene: MainGame, x: number, y: number, texture = 'en_gunship_red') {
    super(scene, x, y, texture);
    this.hp = 2;
    this.points = 25;
    this.heavy = true;
    this.setVelocityY(80 * this.speedMult);
  }

  protected attack(): void {
    this.shoot(this.aimAngle(), 'red');
  }

  protected get fireEvery(): number {
    return 2000;
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.cooldown -= delta;
    if (this.cooldown <= 0 && this.y > 0) {
      this.attack();
      this.cooldown = this.fireEvery;
    }
  }
}

/** ORANGE · fan of 3-5 shots. */
export class Spreader extends Gunship {
  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_gunship_orange');
    this.hp = 3;
    this.points = 35;
    this.setVelocityY(70 * this.speedMult);
  }

  protected attack(): void {
    const base = this.aimAngle();
    const n = this.scene.level.id >= 8 ? 5 : 3;
    for (let i = 0; i < n; i++) this.shoot(base + (i - (n - 1) / 2) * 0.26, 'orange', 230, i === 0);
  }

  protected get fireEvery(): number {
    return 2300;
  }
}

/** CYAN · parks near the top and fires a telegraphed vertical laser. */
export class LaserShip extends Gunship {
  private gfx: Phaser.GameObjects.Graphics;
  private beam = 0; // ms into the current telegraph+beam

  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_gunship_cyan');
    this.hp = 3;
    this.points = 40;
    this.cooldown = 1800;
    this.gfx = scene.add.graphics().setDepth(5);
  }

  protected attack(): void {
    this.beam = 1;
  }

  protected get fireEvery(): number {
    return 3800;
  }

  preUpdate(time: number, delta: number): void {
    // Hover around 22% of the screen while charging/firing, then drift down.
    const parkY = this.scene.scale.height * 0.22;
    this.setVelocityY(this.beam > 0 ? 0 : this.y < parkY ? 120 : 25 * this.speedMult);
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.gfx.clear();
    if (this.beam <= 0) return;
    this.beam += delta;
    const top = this.y + this.displayHeight * 0.45;
    const h = this.scene.scale.height;
    if (this.beam < 800) {
      this.gfx.lineStyle(2, ABILITIES.cyan.color, Math.floor(this.beam / 100) % 2 ? 0.9 : 0.3).lineBetween(this.x, top, this.x, h);
    } else if (this.beam < 1300) {
      this.gfx.fillStyle(ABILITIES.cyan.color, 0.55).fillRect(this.x - 9, top, 18, h);
      this.gfx.fillStyle(0xffffff, 0.9).fillRect(this.x - 3, top, 6, h);
      const p = this.scene.player;
      if (Math.abs(p.x - this.x) < 18 && p.y > top) this.scene.damagePlayer();
    } else this.beam = 0;
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}

/** YELLOW · lancer (gunship fuselage): stops, telegraphs, then rams toward the player. */
export class Lancer extends Enemy {
  private phase: 'enter' | 'aim' | 'dash' = 'enter';
  private timer = 0;
  private stopY: number;

  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_lancer_yellow');
    this.hp = 2;
    this.points = 30;
    this.stopY = scene.scale.height * Phaser.Math.FloatBetween(0.15, 0.3);
    this.setVelocityY(200 * this.speedMult);
  }

  preUpdate(time: number, delta: number): void {
    if (this.phase === 'enter' && this.y >= this.stopY) {
      this.phase = 'aim';
      this.timer = 650;
      this.setVelocity(0, 0);
    } else if (this.phase === 'aim') {
      this.timer -= delta;
      const a = this.aimAngle();
      this.setRotation(a - Math.PI / 2);
      this.setTint(Math.floor(this.timer / 80) % 2 ? 0xffffff : ABILITIES.yellow.color);
      if (this.timer <= 0) {
        this.phase = 'dash';
        this.clearTint();
        const speed = 520 * this.speedMult;
        this.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
      }
    }
    super.preUpdate(time, delta);
  }
}

/** Yellow lancers crossing the screen diagonally (pincer attack). */
export class Fighter extends Enemy {
  constructor(scene: MainGame, x: number, y: number, vx: number, vy: number) {
    super(scene, x, y, 'en_lancer_yellow');
    this.points = 20;
    this.setVelocity(vx * this.speedMult, vy * this.speedMult);
    this.setRotation(Math.atan2(vy, vx) - Math.PI / 2);
  }
}

// --- Spiderling (half-size boss hull) ---

/** GREEN · spiderling: twin diagonal shots; splits into two green drones when destroyed. */
export class Splitter extends Enemy {
  private cooldown = 1200;

  constructor(scene: MainGame, x: number, y: number) {
    super(scene, x, y, 'en_spider_green');
    this.hp = 4;
    this.points = 40;
    this.heavy = true;
    this.explosionSize = 1.2;
    this.setVelocityY(60 * this.speedMult);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.cooldown -= delta;
    if (this.cooldown <= 0 && this.y > 0) {
      this.shoot(Phaser.Math.DegToRad(65), 'green', 220);
      this.shoot(Phaser.Math.DegToRad(115), 'green', 220, false);
      this.cooldown = 2000;
    }
  }

  onKilled(): void {
    [-1, 1].forEach(side => {
      const baby = new Weaver(this.scene, this.x + side * 16, this.y);
      baby.setTexture('en_drone_green').setScale(0.6);
      baby.hp = 1;
    });
  }
}

// --- Hazards ---

/** The original "enemy" art is an asteroid: tumbles, drifts and breaks into fragments. */
export class Asteroid extends Enemy {
  private big: boolean;

  constructor(scene: MainGame, x: number, y: number, big: boolean, vx = 0, vy = 90) {
    super(scene, x, y, big ? 'asteroid' : 'asteroid_small');
    this.big = big;
    this.hp = big ? 3 : 1;
    this.points = big ? 30 : 10;
    this.heavy = big;
    this.explosionSize = big ? 1.4 : 0.6;
    this.setVelocity(vx * this.speedMult, vy * this.speedMult);
    this.setAngularVelocity(Phaser.Math.Between(-90, 90));
  }

  onKilled(): void {
    if (!this.big) return;
    const pieces = Phaser.Math.Between(2, 3);
    for (let i = 0; i < pieces; i++) {
      new Asteroid(this.scene, this.x, this.y, false, Phaser.Math.Between(-120, 120), Phaser.Math.Between(60, 160));
    }
  }
}

/** Proximity mine: drifts toward the player and bursts into an 8-bullet ring after 3 s. */
export class Mine extends Enemy {
  private fuse = 3000;

  constructor(scene: MainGame, x: number, y: number, vx = 0, vy = 60) {
    super(scene, x, y, `en_mine_${scene.level.id}`);
    this.hp = 2;
    this.points = 20;
    this.setVelocity(vx, vy);
    this.setAngularVelocity(120);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.fuse -= delta;
    this.scene.physics.accelerateToObject(this, this.scene.player, 40, 90, 90);
    if (this.fuse < 800) this.setTint(Math.floor(this.fuse / 100) % 2 ? 0xffffff : 0xff3333);
    if (this.fuse <= 0) {
      for (let i = 0; i < 8; i++) this.scene.fireEnemyBullet(this.x, this.y, (Math.PI * 2 * i) / 8, 170, i === 0);
      this.scene.fx.explode(this.x, this.y, 0.6);
      this.destroy();
    }
  }
}

/**
 * A boss-mounted part positioned every frame by `follow()`:
 * turrets, shield orbs, orbiting rocks, barriers, decoys.
 */
export class BossPart extends Enemy {
  armed = false;
  fireEvery = 1800;
  /** Decoys fire harmless holographic shots. */
  fake = false;
  private cooldown = 1200;
  follow: () => { x: number; y: number } = () => ({ x: this.x, y: this.y });

  constructor(scene: MainGame, texture: string, opts: Partial<Pick<BossPart, 'hp' | 'points' | 'invulnerable' | 'fireEvery'>> = {}) {
    super(scene, -200, -200, texture);
    Object.assign(this, { hp: 8, points: 150, heavy: true, solid: true, bossPart: true, explosionSize: 1.2 }, opts);
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
  }

  preUpdate(time: number, delta: number): void {
    const { x, y } = this.follow();
    this.setPosition(x, y);
    super.preUpdate(time, delta);
    if (!this.active || !this.armed) return;
    const p = this.scene.player;
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y) - Math.PI / 2);
    this.cooldown -= delta;
    if (this.cooldown <= 0) {
      this.scene.fireEnemyBulletAt(this.x, this.y, 250, this.fake);
      this.cooldown = this.fireEvery;
    }
  }
}
