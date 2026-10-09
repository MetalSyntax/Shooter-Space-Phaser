import Phaser from 'phaser';
import { PIXEL_FONT } from '../ui/PixelButton';

/** Centralizes particles, flashes, floating combat text, hit-stop and trauma-based screen shake. */
export default class ParticleManager {
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private trauma = 0;
  private hitStopping = false;

  constructor(private scene: Phaser.Scene) {
    this.smoke = scene.add.particles(0, 0, 'smoke', {
      emitting: false, lifespan: { min: 600, max: 1100 }, speed: { min: 10, max: 60 },
      scale: { start: 0.4, end: 1.6 }, alpha: { start: 0.45, end: 0 }, tint: 0x555566,
    }).setDepth(5);
    this.debris = scene.add.particles(0, 0, 'spark', {
      emitting: false, lifespan: { min: 400, max: 900 }, speed: { min: 60, max: 220 },
      scale: { start: 0.7, end: 0.2 }, rotate: { min: 0, max: 360 }, tint: [0x888888, 0x666666, 0xaa8866],
    }).setDepth(6);
    this.sparks = scene.add.particles(0, 0, 'spark', {
      emitting: false, lifespan: { min: 200, max: 500 }, speed: { min: 120, max: 380 },
      scale: { start: 0.8, end: 0 }, blendMode: 'ADD', color: [0xffffff, 0xffdd55, 0xff6600, 0x661100],
    }).setDepth(7);
  }

  /** Blue/orange plasma trail; emission rate scales with ship speed. */
  createThruster(target: Phaser.Physics.Arcade.Sprite): Phaser.GameObjects.Particles.ParticleEmitter {
    const emitter = this.scene.add.particles(0, 0, 'spark', {
      lifespan: 280, blendMode: 'ADD', color: [0x99e6ff, 0x3399ff, 0xff8800, 0x441100],
      scale: { start: 0.6, end: 0 },
      speed: { onEmit: () => 60 + (target.body?.velocity.length() ?? 0) * 0.6 },
      angle: { onEmit: () => target.angle + 180 + Phaser.Math.Between(-12, 12) },
      frequency: 30,
    }).setDepth(4);
    emitter.startFollow(target);
    return emitter;
  }

  updateThruster(emitter: Phaser.GameObjects.Particles.ParticleEmitter, target: Phaser.Physics.Arcade.Sprite): void {
    const rad = target.rotation;
    emitter.followOffset.set(-Math.cos(rad) * 16, -Math.sin(rad) * 16);
    const speed = target.body?.velocity.length() ?? 0;
    emitter.frequency = speed > 40 ? 12 : 40;
    emitter.quantity = speed > 150 ? 2 : 1;
  }

  explode(x: number, y: number, size = 1): void {
    this.sparks.explode(Math.round(14 * size), x, y);
    this.debris.explode(Math.round(8 * size), x, y);
    this.smoke.explode(Math.round(5 * size), x, y);
    const flash = this.scene.add.circle(x, y, 10 * size, 0xffffff, 0.9).setDepth(8).setBlendMode('ADD');
    this.scene.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 180, onComplete: () => flash.destroy() });
  }

  sparkBurst(x: number, y: number, count = 5): void {
    this.sparks.explode(count, x, y);
  }

  shieldRipple(x: number, y: number, radius: number): void {
    const ring = this.scene.add.circle(x, y, radius).setStrokeStyle(4, 0x66ffff).setDepth(9);
    this.scene.tweens.add({ targets: ring, scale: 1.8, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
  }

  floatingText(x: number, y: number, text: string, color = '#ffffff', size = 18): void {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: PIXEL_FONT, fontSize: `${Math.round(size * 0.6 / 4) * 4}px`, color, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(50).setScale(0.5);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: t, y: y - 50, alpha: 0, delay: 350, duration: 600, onComplete: () => t.destroy() });
  }

  /** Brief physics freeze (~2 frames) to sell heavy impacts. */
  hitStop(ms = 35): void {
    if (this.hitStopping) return;
    this.hitStopping = true;
    this.scene.physics.world.pause();
    this.scene.time.delayedCall(ms, () => {
      this.hitStopping = false;
      this.scene.physics.world.resume();
    });
  }

  flashSprite(sprite: Phaser.GameObjects.Sprite, ms = 60): void {
    sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(ms, () => sprite.active && sprite.clearTint());
  }

  /** Adds trauma (0..1). Shake offset = trauma² and decays exponentially. */
  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(delta: number): void {
    const cam = this.scene.cameras.main;
    if (this.trauma <= 0.001) {
      this.trauma = 0;
      cam.setScroll(0, 0);
      return;
    }
    const s = this.trauma * this.trauma * 14;
    cam.setScroll(Phaser.Math.FloatBetween(-s, s), Phaser.Math.FloatBetween(-s, s));
    this.trauma *= Math.exp(-delta / 180);
  }
}
