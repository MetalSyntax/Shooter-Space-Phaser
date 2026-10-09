import Phaser from 'phaser';

export interface BulletOptions {
  texture: string;
  damage?: number;
  homing?: boolean;
  /** Enemy decoy shots: visual only, never hurt the player. */
  fake?: boolean;
}

/** Pooled projectile (player and enemy). Groups use `get()` to recycle and `kill()` to return. */
export default class Bullet extends Phaser.Physics.Arcade.Image {
  damage = 1;
  homing = false;
  fake = false;

  /** Fires along `angle` (radians). Returns null-safe so callers can chain on pooled get(). */
  fire(x: number, y: number, angle: number, speed: number, opts: BulletOptions): this {
    this.enableBody(true, x, y, true, true);
    this.setTexture(opts.texture);
    this.damage = opts.damage ?? 1;
    this.homing = !!opts.homing;
    this.fake = !!opts.fake;
    this.setAlpha(this.fake ? 0.45 : 1).setScale(1);
    this.setRotation(angle).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    return this;
  }

  kill(): void {
    this.disableBody(true, true);
  }

  /** Called by its group (runChildUpdate). */
  update(): void {
    const { width, height } = this.scene.scale;
    if (this.active && (this.y > height + 60 || this.y < -60 || this.x < -60 || this.x > width + 60)) this.kill();
  }
}
