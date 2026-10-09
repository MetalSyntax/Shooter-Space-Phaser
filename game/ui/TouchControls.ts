import Phaser from 'phaser';
import { t, getLanguage } from '../utils/i18n';

/**
 * Selectable mobile control schemes:
 *  - drag:    drag anywhere, the ship follows your finger (relative); auto-fire + auto-aim; double tap = bomb.
 *  - twin:    floating twin-stick: left half moves, right half aims and fires.
 *  - classic: fixed joystick + rotate / fire / bomb buttons.
 */
export type ControlScheme = 'drag' | 'twin' | 'classic';

export const SCHEMES: Record<ControlScheme, { label: string; hint: string }> = {
  get drag() {
    return { label: t('schemeDrag'), hint: t('schemeDragHint') };
  },
  get twin() {
    return { label: t('schemeTwin'), hint: t('schemeTwinHint') };
  },
  get classic() {
    return { label: t('schemeClassic'), hint: t('schemeClassicHint') };
  },
};


const ORDER: ControlScheme[] = ['drag', 'twin', 'classic'];
const KEY = 'ss_controls';

export function loadScheme(): ControlScheme {
  try {
    const s = localStorage.getItem(KEY) as ControlScheme;
    return ORDER.includes(s) ? s : 'drag';
  } catch {
    return 'drag';
  }
}

export function saveScheme(s: ControlScheme): void {
  try { localStorage.setItem(KEY, s); } catch { /* ignore */ }
}

export const nextScheme = (s: ControlScheme): ControlScheme => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];

/** What the player reads every frame, whatever the scheme. */
export interface TouchInput {
  force: { x: number; y: number };
  firing: boolean;
  /** Absolute aim in degrees (twin-stick), or null. */
  aim: number | null;
  /** Ship turns toward the nearest enemy by itself (drag scheme). */
  autoAim: boolean;
  /** Position the ship should glide to (drag scheme), or null. */
  dragTarget: { x: number; y: number } | null;
  layout(width: number, height: number): void;
  destroy(): void;
}

interface Hooks {
  onRotate: (deg: number) => void;
  onBomb: () => void;
  ship: () => { x: number; y: number };
}

export function createTouchControls(scene: Phaser.Scene, scheme: ControlScheme, hooks: Hooks): TouchInput {
  scene.input.addPointer(3);
  if (scheme === 'twin') return new TwinControls(scene, hooks);
  if (scheme === 'classic') return new ClassicControls(scene, hooks);
  return new DragControls(scene, hooks);
}

/** Shared base: tracks game objects and input listeners so the scheme can be swapped at runtime. */
abstract class Controls implements TouchInput {
  force = { x: 0, y: 0 };
  firing = false;
  aim: number | null = null;
  autoAim = false;
  dragTarget: { x: number; y: number } | null = null;
  protected objects: Phaser.GameObjects.GameObject[] = [];
  private listeners: [string, (p: Phaser.Input.Pointer) => void][] = [];

  constructor(protected scene: Phaser.Scene, protected hooks: Hooks) {}

  protected on(event: string, fn: (p: Phaser.Input.Pointer) => void): void {
    this.scene.input.on(event, fn);
    this.listeners.push([event, fn]);
  }

  protected track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.objects.push(o);
    return o;
  }

  /** Round on-screen button; swallows its touch so it never starts a drag/stick. */
  protected button(label: string, color: number, onDown: () => void, radius = 35): Phaser.GameObjects.Container {
    const c = this.track(this.scene.add.container(0, 0).setScrollFactor(0).setDepth(1000));
    const bg = this.scene.add.circle(0, 0, radius, 0x333333, 0.7).setStrokeStyle(2, color);
    const text = this.scene.add.text(0, 0, label, { fontFamily: '"Press Start 2P", monospace', fontSize: `${Math.round(radius * 0.5)}px`, color: '#ffffff' }).setOrigin(0.5);
    c.add([bg, text]);
    c.setInteractive(new Phaser.Geom.Circle(0, 0, radius + 8), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      bg.setFillStyle(color, 0.5);
      c.setScale(0.9);
      onDown();
    });
    const reset = () => { bg.setFillStyle(0x333333, 0.7); c.setScale(1); };
    c.on('pointerup', reset);
    c.on('pointerout', reset);
    return c;
  }

  abstract layout(width: number, height: number): void;

  destroy(): void {
    this.listeners.forEach(([e, fn]) => this.scene.input.off(e, fn));
    this.objects.forEach(o => o.destroy());
    this.firing = false;
    this.force = { x: 0, y: 0 };
  }
}

/** Ship follows the finger with a 1.4x relative offset; holding fires; double tap = bomb. */
class DragControls extends Controls {
  autoAim = true;
  private pointer: Phaser.Input.Pointer | null = null;
  private start = { x: 0, y: 0 };
  private shipStart = { x: 0, y: 0 };
  private downAt = 0;
  private lastTap = 0;
  private ring: Phaser.GameObjects.Arc;
  private bomb: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, hooks: Hooks) {
    super(scene, hooks);
    this.ring = this.track(scene.add.circle(0, 0, 26).setStrokeStyle(3, 0x4dd9ff, 0.7).setScrollFactor(0).setDepth(999).setVisible(false));
    this.bomb = this.button('B', 0x66ccff, hooks.onBomb, 28);

    this.on('pointerdown', p => {
      if (this.pointer) return;
      const now = scene.time.now;
      if (now - this.lastTap < 300) hooks.onBomb(); // double tap
      this.pointer = p;
      this.downAt = now;
      this.start = { x: p.x, y: p.y };
      this.shipStart = { ...hooks.ship() };
      this.dragTarget = { ...this.shipStart };
      this.firing = true;
      this.ring.setPosition(p.x, p.y).setVisible(true);
    });
    this.on('pointermove', p => {
      if (p !== this.pointer) return;
      const { width, height } = scene.scale;
      this.dragTarget = {
        x: Phaser.Math.Clamp(this.shipStart.x + (p.x - this.start.x) * 1.4, 20, width - 20),
        y: Phaser.Math.Clamp(this.shipStart.y + (p.y - this.start.y) * 1.4, 20, height - 20),
      };
      this.ring.setPosition(p.x, p.y);
    });
    this.on('pointerup', p => {
      if (p !== this.pointer) return;
      if (scene.time.now - this.downAt < 200) this.lastTap = scene.time.now;
      this.pointer = null;
      this.dragTarget = null;
      this.firing = false;
      this.ring.setVisible(false);
    });
  }

  layout(width: number, height: number): void {
    this.bomb.setPosition(width - 46, height * 0.62);
  }
}

/** A stick that appears wherever the thumb lands. */
class FloatingStick {
  pointer: Phaser.Input.Pointer | null = null;
  vec = { x: 0, y: 0 };
  base: Phaser.GameObjects.Arc;
  thumb: Phaser.GameObjects.Arc;

  constructor(private scene: Phaser.Scene, color: number) {
    this.base = scene.add.circle(0, 0, 50, 0x333333, 0.35).setStrokeStyle(2, color, 0.6).setScrollFactor(0).setDepth(1000);
    this.thumb = scene.add.circle(0, 0, 24, color, 0.6).setScrollFactor(0).setDepth(1001);
    this.rest(0, 0);
  }

  /** Faint resting position so players know where to put their thumbs. */
  rest(x: number, y: number): void {
    this.base.setPosition(x, y).setAlpha(0.35);
    this.thumb.setPosition(x, y).setAlpha(0.35);
  }

  grab(p: Phaser.Input.Pointer): void {
    this.pointer = p;
    this.base.setPosition(p.x, p.y).setAlpha(1);
    this.thumb.setPosition(p.x, p.y).setAlpha(1);
  }

  move(p: Phaser.Input.Pointer): void {
    const a = Phaser.Math.Angle.Between(this.base.x, this.base.y, p.x, p.y);
    const d = Math.min(Phaser.Math.Distance.Between(this.base.x, this.base.y, p.x, p.y), 50);
    this.thumb.setPosition(this.base.x + Math.cos(a) * d, this.base.y + Math.sin(a) * d);
    this.vec = { x: Math.cos(a) * d / 50, y: Math.sin(a) * d / 50 };
  }

  release(x: number, y: number): void {
    this.pointer = null;
    this.vec = { x: 0, y: 0 };
    this.rest(x, y);
  }
}

/** Left half of the screen moves, right half aims and fires (floating sticks). */
class TwinControls extends Controls {
  private move: FloatingStick;
  private aimStick: FloatingStick;
  private bomb: Phaser.GameObjects.Container;
  private home = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };

  constructor(scene: Phaser.Scene, hooks: Hooks) {
    super(scene, hooks);
    this.move = new FloatingStick(scene, 0x00ff88);
    this.aimStick = new FloatingStick(scene, 0xff5555);
    [this.move.base, this.move.thumb, this.aimStick.base, this.aimStick.thumb].forEach(o => this.track(o));
    this.bomb = this.button('B', 0x66ccff, hooks.onBomb, 26);

    this.on('pointerdown', p => {
      const left = p.x < scene.scale.width / 2;
      const stick = left ? this.move : this.aimStick;
      if (!stick.pointer) stick.grab(p);
    });
    this.on('pointermove', p => {
      if (p === this.move.pointer) {
        this.move.move(p);
        this.force = { ...this.move.vec };
      } else if (p === this.aimStick.pointer) {
        this.aimStick.move(p);
        const { x, y } = this.aimStick.vec;
        const mag = Math.hypot(x, y);
        this.aim = mag > 0.25 ? Phaser.Math.RadToDeg(Math.atan2(y, x)) : this.aim;
        this.firing = mag > 0.25;
      }
    });
    this.on('pointerup', p => {
      if (p === this.move.pointer) {
        this.move.release(this.home.left.x, this.home.left.y);
        this.force = { x: 0, y: 0 };
      } else if (p === this.aimStick.pointer) {
        this.aimStick.release(this.home.right.x, this.home.right.y);
        this.firing = false;
      }
    });
  }

  layout(width: number, height: number): void {
    this.home = { left: { x: 90, y: height - 130 }, right: { x: width - 90, y: height - 130 } };
    if (!this.move.pointer) this.move.rest(this.home.left.x, this.home.left.y);
    if (!this.aimStick.pointer) this.aimStick.rest(this.home.right.x, this.home.right.y);
    this.bomb.setPosition(width - 46, height - 250);
  }
}

/** Original layout: fixed joystick + rotate / fire / bomb buttons. */
class ClassicControls extends Controls {
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private pointer: Phaser.Input.Pointer | null = null;
  private rotateLeft: Phaser.GameObjects.Container;
  private rotateRight: Phaser.GameObjects.Container;
  private fireBtn: Phaser.GameObjects.Container;
  private bombBtn: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, hooks: Hooks) {
    super(scene, hooks);
    this.base = this.track(scene.add.circle(0, 0, 50, 0x333333, 0.5)
      .setStrokeStyle(2, 0x666666).setScrollFactor(0).setDepth(1000).setInteractive());
    this.thumb = this.track(scene.add.circle(0, 0, 25, 0x00ff00, 0.7)
      .setStrokeStyle(2, 0x00ffff).setScrollFactor(0).setDepth(1001));

    this.base.on('pointerdown', (pointer: Phaser.Input.Pointer) => { this.pointer = pointer; });
    this.on('pointermove', p => { if (this.pointer === p) this.updateThumb(p); });
    this.on('pointerup', p => {
      if (this.pointer !== p) return;
      this.pointer = null;
      this.thumb.setPosition(this.base.x, this.base.y);
      this.force = { x: 0, y: 0 };
    });

    this.rotateLeft = this.button('↶', 0x00ffff, () => hooks.onRotate(-15));
    this.rotateRight = this.button('↷', 0x00ffff, () => hooks.onRotate(15));
    this.fireBtn = this.button('F', 0xff0000, () => { this.firing = true; });
    this.bombBtn = this.button('B', 0x66ccff, hooks.onBomb);
    const stopFire = () => { this.firing = false; };
    this.fireBtn.on('pointerup', stopFire);
    this.fireBtn.on('pointerout', stopFire);
  }

  private updateThumb(pointer: Phaser.Input.Pointer): void {
    const { x, y } = this.base;
    const angle = Phaser.Math.Angle.Between(x, y, pointer.x, pointer.y);
    const distance = Math.min(Phaser.Math.Distance.Between(x, y, pointer.x, pointer.y), 50);
    const tx = x + Math.cos(angle) * distance;
    const ty = y + Math.sin(angle) * distance;
    this.thumb.setPosition(tx, ty);
    this.force = { x: (tx - x) / 50, y: (ty - y) / 50 };
  }

  layout(width: number, height: number): void {
    // Kept clear of the mobile browser bar.
    const safeBottom = 120;
    this.base.setPosition(80, height - safeBottom);
    if (!this.pointer) this.thumb.setPosition(80, height - safeBottom);
    this.rotateRight.setPosition(width - 60, height - (safeBottom - 10));
    this.rotateLeft.setPosition(width - 150, height - (safeBottom - 10));
    this.fireBtn.setPosition(width - 70, height - (safeBottom + 80));
    this.bombBtn.setPosition(width - 160, height - (safeBottom + 80));
  }
}
