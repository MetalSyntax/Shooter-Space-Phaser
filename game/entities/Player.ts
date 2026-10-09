import Phaser from 'phaser';
import { synth } from '../utils/Synth';
import type MainGame from '../scenes/MainGame';
import type Bullet from './Bullet';
import type { PerkKind } from '../managers/LevelManager';
import type { ShipDef } from './Ships';

export type PowerKind = 'shield' | 'rapid' | 'spread' | 'missile' | 'drone' | 'magnet';

export const POWER_DURATIONS: Record<PowerKind, number> = {
  shield: 5000, rapid: 6000, spread: 10000, missile: 10000, drone: 12000, magnet: 10000,
};

const ACCEL = 400;
const FIRE_DELAY = 200;
const BULLET_SPEED = 600;
export const MAX_BOMBS = 5;

/** Player ship: physics, input (keyboard, mouse aim, gamepad, touch), power-ups and weapons. */
export default class Player extends Phaser.Physics.Arcade.Sprite {
  declare scene: MainGame;
  lives = 5;
  /** Hyper Bomb charges (secondary fire). */
  bombs = 2;
  aimAngle = -90; // degrees
  /** Shots fired / hits landed, for the sector accuracy stat. */
  shotsFired = 0;
  private perks: Record<PerkKind, number>;
  private fireDelay: number;
  /** Remaining ms per active power-up. */
  powers: Partial<Record<PowerKind, number>> = {};

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private lastFired = 0;
  private nextMissile = 0;
  private nextDroneShot = 0;
  private invulnerable = 0;
  private aimWithPointer = false;
  private shieldWarned = false;
  private shieldVisual: Phaser.GameObjects.Arc;
  private drone?: Phaser.GameObjects.Image;
  private droneOrbit = 0;
  private thruster: Phaser.GameObjects.Particles.ParticleEmitter;

  private ship: ShipDef;
  private speedMult: number;

  constructor(scene: MainGame, x: number, y: number, lives: number, perks: Record<PerkKind, number>, ship: ShipDef, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.lives = lives;
    this.perks = perks;
    this.ship = ship;
    this.speedMult = ship.speed * (1 + 0.15 * perks.engine);
    this.fireDelay = FIRE_DELAY * Math.pow(0.9, perks.plasma) / ship.fireRate;
    this.bombs = ship.bombs;
    this.setDepth(10).setAngle(this.aimAngle).setDamping(true).setDrag(0.85)
      .setMaxVelocity(250 * this.speedMult).setCollideWorldBounds(true);

    this.shieldVisual = scene.add.circle(x, y, 30, 0x0066ff, 0.25).setStrokeStyle(2, 0x00ffff).setVisible(false).setDepth(11);
    this.thruster = scene.fx.createThruster(this);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = scene.input.keyboard.addKeys('W,S,A,D,Q,E') as Record<string, Phaser.Input.Keyboard.Key>;
      scene.input.keyboard.on('keydown-X', () => this.useBomb());
      scene.input.keyboard.on('keydown-B', () => this.useBomb());
    }
    // Hyper Bomb: right click on desktop, B on gamepad.
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.rightButtonDown()) this.useBomb(); });
    scene.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 1) this.useBomb();
    });
    // Desktop twin-stick: moving the mouse hands aiming to the cursor; Q/E take it back.
    if (!scene.isTouch) {
      scene.input.on('pointermove', () => { this.aimWithPointer = true; });
    }
  }

  useBomb(): void {
    if (this.bombs <= 0 || !this.active) return;
    this.bombs--;
    this.scene.hyperBomb();
  }

  has(kind: PowerKind): boolean {
    return (this.powers[kind] ?? 0) > 0;
  }

  activate(kind: PowerKind, duration = POWER_DURATIONS[kind]): void {
    // Never shorten a longer/permanent effect (e.g. Nova's permanent drone).
    this.powers[kind] = Math.max(this.powers[kind] ?? 0, duration);
    if (kind === 'shield') {
      this.shieldWarned = false;
      this.shieldVisual.setVisible(true).setAlpha(1);
    }
    if (kind === 'drone' && !this.drone) {
      this.drone = this.scene.add.image(this.x, this.y, 'drone').setDepth(10);
    }
  }

  private expire(kind: PowerKind): void {
    delete this.powers[kind];
    if (kind === 'shield') this.shieldVisual.setVisible(false);
    if (kind === 'drone') {
      this.drone?.destroy();
      this.drone = undefined;
    }
  }

  rotateBy(deg: number): void {
    this.aimWithPointer = false;
    this.scene.tweens.add({ targets: this, aimAngle: this.aimAngle + deg, duration: 100 });
  }

  /** Returns what happened so the scene can react (combo reset, fx). */
  takeHit(): 'shielded' | 'ignored' | 'damaged' | 'dead' {
    if (this.has('shield')) {
      this.scene.fx.shieldRipple(this.x, this.y, 30);
      synth.playShieldHit();
      return 'shielded';
    }
    if (this.invulnerable > 0 || !this.active) return 'ignored';

    this.lives--;
    this.invulnerable = this.ship.invulnMs;
    this.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => this.clearTint());
    this.scene.tweens.add({ targets: this, alpha: 0.3, duration: 100, yoyo: true, repeat: 4, onComplete: () => this.setAlpha(1) });
    if (this.lives === 1) synth.playCriticalWarning();
    return this.lives <= 0 ? 'dead' : 'damaged';
  }

  update(time: number, delta: number): void {
    if (!this.active) return;
    const pad = this.scene.input.gamepad?.total ? this.scene.input.gamepad.getPad(0) : undefined;
    const touch = this.scene.touch;
    const k = this.keys;

    // --- Movement ---
    let ax = 0;
    let ay = 0;
    if (this.cursors?.left.isDown || k.A?.isDown) ax = -1;
    else if (this.cursors?.right.isDown || k.D?.isDown) ax = 1;
    if (this.cursors?.up.isDown || k.W?.isDown) ay = -1;
    else if (this.cursors?.down.isDown || k.S?.isDown) ay = 1;
    if (pad && (Math.abs(pad.leftStick.x) > 0.2 || Math.abs(pad.leftStick.y) > 0.2)) {
      ax = pad.leftStick.x;
      ay = pad.leftStick.y;
    }
    if (touch && (touch.force.x !== 0 || touch.force.y !== 0)) {
      ax = touch.force.x;
      ay = touch.force.y;
    }
    const accel = ACCEL * this.speedMult;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (touch?.dragTarget) {
      // Drag scheme: glide to the finger's target (velocity-driven, so collisions still work).
      const t = touch.dragTarget;
      body.maxVelocity.set(900);
      this.setAcceleration(0, 0).setVelocity((t.x - this.x) * 12, (t.y - this.y) * 12);
    } else {
      body.maxVelocity.set(250 * this.speedMult);
      this.setAcceleration(ax * accel, ay * accel);
    }

    // --- Aim ---
    if (k.Q?.isDown) { this.aimAngle -= 3; this.aimWithPointer = false; }
    else if (k.E?.isDown) { this.aimAngle += 3; this.aimWithPointer = false; }
    if (pad && Math.hypot(pad.rightStick.x, pad.rightStick.y) > 0.3) {
      this.aimWithPointer = false;
      this.aimTowards(Phaser.Math.RadToDeg(Math.atan2(pad.rightStick.y, pad.rightStick.x)), delta);
    } else if (this.aimWithPointer) {
      const p = this.scene.input.activePointer;
      this.aimTowards(Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.x, this.y, p.worldX, p.worldY)), delta);
    } else if (touch?.aim != null) {
      this.aimTowards(touch.aim, delta);
    } else if (touch?.autoAim) {
      // Auto-aim at the nearest enemy ahead, otherwise straight up.
      const t = this.scene.nearestTarget(this.x, this.y);
      const ahead = t && t.y < this.y - 30;
      this.aimTowards(ahead ? Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.x, this.y, t.x, t.y)) : -90, delta);
    }
    this.setAngle(this.aimAngle);

    // --- Fire ---
    const mouseFire = !this.scene.isTouch && this.scene.input.activePointer.leftButtonDown();
    const padFire = !!pad && (pad.A || pad.R2 > 0.3 || pad.R1);
    if ((this.cursors?.space.isDown || mouseFire || padFire || touch?.firing) && time > this.lastFired) {
      this.fire(time);
    }

    this.updatePowers(time, delta);
    this.updateHoming(delta);
    this.scene.fx.updateThruster(this.thruster, this);
    if (this.invulnerable > 0) this.invulnerable -= delta;
  }

  /** Smoothly rotates toward a target angle instead of snapping. */
  private aimTowards(targetDeg: number, delta: number): void {
    const diff = Phaser.Math.Angle.ShortestBetween(this.aimAngle, targetDeg);
    this.aimAngle += Phaser.Math.Clamp(diff, -0.6 * delta, 0.6 * delta);
  }

  private spawnBullet(x: number, y: number, angleDeg: number, texture = 'bullet', speed = BULLET_SPEED, damage = 1, homing = false): void {
    const b = this.scene.bullets.get() as Bullet | null;
    if (!b) return;
    b.fire(x, y, Phaser.Math.DegToRad(angleDeg), speed, { texture, damage, homing });
    this.shotsFired++;
  }

  private fire(time: number): void {
    const rad = Phaser.Math.DegToRad(this.aimAngle);
    const bx = this.x + Math.cos(rad) * 20;
    const by = this.y + Math.sin(rad) * 20;
    const extra = this.perks.magazine + this.ship.extraShots;
    if (this.has('spread')) {
      // 3 to 5 projectiles in an arc.
      const n = Math.min(5, 3 + extra);
      for (let i = 0; i < n; i++) this.spawnBullet(bx, by, this.aimAngle + (i - (n - 1) / 2) * 15);
    } else {
      // Standard: single, or parallel double/triple with the magazine perk.
      const n = Math.min(3, 1 + extra);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 10;
        this.spawnBullet(bx - Math.sin(rad) * off, by + Math.cos(rad) * off, this.aimAngle);
      }
    }
    this.lastFired = time + (this.has('rapid') ? this.fireDelay / 2 : this.fireDelay);
    synth.playLaser();

    if (this.has('missile') && time > this.nextMissile) {
      // Launch sideways from both wings; homing steers them onto targets.
      this.spawnBullet(this.x, this.y, this.aimAngle - 70, 'missile', 300, 2, true);
      this.spawnBullet(this.x, this.y, this.aimAngle + 70, 'missile', 300, 2, true);
      this.nextMissile = time + 700;
      synth.playMissile();
    }
  }

  private updatePowers(time: number, delta: number): void {
    (Object.keys(this.powers) as PowerKind[]).forEach(kind => {
      this.powers[kind]! -= delta;
      if (this.powers[kind]! <= 0) this.expire(kind);
    });

    if (this.has('shield')) {
      this.shieldVisual.setPosition(this.x, this.y);
      if (this.powers.shield! < 1500) {
        if (!this.shieldWarned) { this.shieldWarned = true; synth.playShieldWarning(); }
        this.shieldVisual.setAlpha(Math.floor(time / 120) % 2 ? 1 : 0.3);
      }
    }

    if (this.drone) {
      this.droneOrbit += delta * 0.004;
      this.drone.setPosition(this.x + Math.cos(this.droneOrbit) * 45, this.y + Math.sin(this.droneOrbit) * 45);
      if (time > this.nextDroneShot) {
        const target = this.scene.nearestTarget(this.drone.x, this.drone.y);
        const angle = target
          ? Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(this.drone.x, this.drone.y, target.x, target.y))
          : this.aimAngle;
        this.spawnBullet(this.drone.x, this.drone.y, angle, 'orb', 320, 1, true);
        this.nextDroneShot = time + 450;
      }
    }

    if (this.has('magnet')) {
      this.scene.powerups.getChildren().forEach(obj => {
        const pu = obj as Phaser.Physics.Arcade.Image;
        if (pu.active && Phaser.Math.Distance.Between(pu.x, pu.y, this.x, this.y) < 350) {
          this.scene.physics.moveToObject(pu, this, 350);
        }
      });
    }
  }

  /** Steers homing missiles toward the nearest target. */
  private updateHoming(delta: number): void {
    this.scene.bullets.getChildren().forEach(obj => {
      const m = obj as Bullet;
      if (!m.active || !m.homing) return;
      const target = this.scene.nearestTarget(m.x, m.y);
      const body = m.body as Phaser.Physics.Arcade.Body;
      let heading = Math.atan2(body.velocity.y, body.velocity.x);
      if (target) {
        heading = Phaser.Math.Angle.RotateTo(heading, Phaser.Math.Angle.Between(m.x, m.y, target.x, target.y), 0.006 * delta);
      }
      const speed = Math.min(body.velocity.length() + delta * 0.6, 550);
      m.setRotation(heading).setVelocity(Math.cos(heading) * speed, Math.sin(heading) * speed);
    });
  }

  destroy(fromScene?: boolean): void {
    this.shieldVisual.destroy();
    this.drone?.destroy();
    this.thruster.destroy();
    super.destroy(fromScene);
  }
}
