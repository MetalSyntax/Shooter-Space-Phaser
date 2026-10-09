import Phaser from 'phaser';
import { synth } from '../utils/Synth';
import { BossPart, Mine, Kamikaze } from './Enemy';
import type { LevelDef } from '../managers/LevelManager';
import type MainGame from '../scenes/MainGame';

export type BossState = 'ENTERING' | 'IDLE' | 'ATTACK_SPREAD' | 'ATTACK_LASER' | 'DASH' | 'SPECIAL' | 'DYING';

const WARNING_MS = 3000;
const DEG = Math.PI / 180;

/** Telegraphed beam: thin blinking guide line, then a wide damaging beam that can sweep. */
class Beam {
  private t = 0;
  done = false;

  constructor(
    private boss: Boss,
    private from: number, // radians
    private to: number,
    private telegraphMs: number,
    private fireMs: number,
    private width: number,
  ) {
    synth.playLaserCharge(telegraphMs / 1000);
  }

  update(delta: number, g: Phaser.GameObjects.Graphics): void {
    const b = this.boss;
    const ox = b.x, oy = b.y + b.displayHeight * 0.35;
    const len = 2000;
    const charging = this.t < this.telegraphMs;
    const k = charging ? 0 : Math.min(1, (this.t - this.telegraphMs) / this.fireMs);
    const a = this.from + (this.to - this.from) * k;
    const ex = ox + Math.cos(a) * len, ey = oy + Math.sin(a) * len;

    if (charging) {
      const blink = Math.floor(this.t / 100) % 2 === 0;
      g.lineStyle(2, 0xff2222, blink ? 0.9 : 0.35).lineBetween(ox, oy, ex, ey);
    } else {
      if (this.t - delta < this.telegraphMs) {
        synth.playLaserBeam(this.fireMs / 1000);
        b.scene.fx.shake(0.4);
      }
      const w = this.width + Math.random() * 8;
      g.lineStyle(w, 0xff2244, 0.55).lineBetween(ox, oy, ex, ey);
      g.lineStyle(w / 3, 0xffffff, 0.95).lineBetween(ox, oy, ex, ey);
      const p = b.scene.player;
      // Distance from the player to the beam ray.
      const t = Math.max(0, (p.x - ox) * Math.cos(a) + (p.y - oy) * Math.sin(a));
      const d = Math.hypot(p.x - (ox + Math.cos(a) * t), p.y - (oy + Math.sin(a) * t));
      if (d < w / 2 + 10) b.scene.damagePlayer();
    }
    this.t += delta;
    if (this.t >= this.telegraphMs + this.fireMs) this.done = true;
  }
}

/** Per-archetype brain. `next()` runs when IDLE ends and picks the next state. */
interface Behavior {
  idleMs: number;
  moveSpeed: number;
  setup?(): void;
  next(): void;
  tick?(state: BossState, delta: number): void;
  onPhase?(phase: number): void;
}

/**
 * Finite state machine shared by the 10 sector bosses:
 * ENTERING → IDLE ⇄ (ATTACK_SPREAD | ATTACK_LASER | DASH | SPECIAL) → DYING.
 */
export default class Boss extends Phaser.Physics.Arcade.Sprite {
  declare scene: MainGame;
  state: BossState = 'ENTERING';
  stateTime = 0;
  stateDuration = 0;
  hp: number;
  readonly maxHp: number;
  phase = 1;
  readonly def: LevelDef;
  parts: BossPart[] = [];
  homeY = 140;
  dashTarget = { x: 0, y: 0 };
  beam?: Beam;
  private behavior: Behavior;
  private core: Phaser.GameObjects.Image;
  private gfx: Phaser.GameObjects.Graphics;
  private timers: Record<string, number> = {};
  private speedBoost = 1;

  constructor(scene: MainGame, def: LevelDef, hp: number) {
    super(scene, scene.scale.width / 2, -160, `boss_${def.id}`);
    this.def = def;
    this.maxHp = this.hp = hp;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.5).setDepth(8);
    (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // Pulsing glow over the original art's eyes (the vulnerable core).
    this.core = scene.add.image(this.x, this.y, `core_${def.id}`).setDepth(9).setBlendMode('ADD').setAlpha(0.5);
    scene.tweens.add({ targets: this.core, scale: 1.4, alpha: 0.15, duration: 380, yoyo: true, loop: -1 });
    this.gfx = scene.add.graphics().setDepth(7);
    this.homeY = Math.min(160, scene.scale.height * 0.22);

    this.behavior = BEHAVIORS[def.boss](this);
    this.behavior.setup?.();

    synth.playBossSiren();
    synth.setMusicIntensity(true);
    scene.hud.showBossWarning(WARNING_MS, def.bossName);
    scene.time.delayedCall(WARNING_MS, () => {
      scene.tweens.add({
        targets: this, y: this.homeY, duration: 2500, ease: 'Power2',
        onComplete: () => {
          this.parts.forEach(p => { p.armed = p.fireEvery > 0; });
          this.go('IDLE', this.behavior.idleMs);
        },
      });
    });
  }

  get invulnerable(): boolean {
    return this.state === 'ENTERING' || this.state === 'DYING' || this.alpha < 0.5;
  }

  get frenzy(): boolean {
    return this.phase > 1;
  }

  /** Switches state; `duration` ends timed states (0 = the behavior ends it). */
  go(state: BossState, duration = 0): void {
    this.state = state;
    this.stateTime = 0;
    this.stateDuration = duration;
  }

  /** Cooldown helper: runs `fn` every `ms` while called each frame. */
  every(key: string, ms: number, delta: number, fn: () => void): void {
    this.timers[key] = (this.timers[key] ?? 0) - delta;
    if (this.timers[key] <= 0) {
      this.timers[key] = ms;
      fn();
    }
  }

  // --- Shared attacks ---

  private muzzle(ox: number, oy: number) {
    return { x: this.x + ox, y: this.y + this.displayHeight * 0.35 + oy };
  }

  /** `n` bullets centered on the player with `spreadDeg` between them. */
  aimed(n: number, spreadDeg: number, speed = 240, ox = 0, oy = 0): void {
    const m = this.muzzle(ox, oy);
    const p = this.scene.player;
    const base = Phaser.Math.Angle.Between(m.x, m.y, p.x, p.y);
    for (let i = 0; i < n; i++) this.scene.fireEnemyBullet(m.x, m.y, base + (i - (n - 1) / 2) * spreadDeg * DEG, speed, i === 0);
  }

  /** Bullets at absolute angles (degrees, 90 = straight down). */
  fan(anglesDeg: number[], speed = 240, ox = 0, oy = 0): void {
    const m = this.muzzle(ox, oy);
    anglesDeg.forEach((a, i) => this.scene.fireEnemyBullet(m.x, m.y, a * DEG, speed, i === 0));
  }

  ring(n: number, speed = 180, offsetDeg = 0): void {
    for (let i = 0; i < n; i++) this.scene.fireEnemyBullet(this.x, this.y, (360 / n * i + offsetDeg) * DEG, speed, i === 0);
  }

  laser(fromDeg: number, toDeg: number, telegraphMs: number, fireMs: number, width: number): void {
    this.beam = new Beam(this, fromDeg * DEG, toDeg * DEG, telegraphMs, fireMs, width);
    this.go('ATTACK_LASER');
  }

  addPart(texture: string, opts: ConstructorParameters<typeof BossPart>[2], follow: () => { x: number; y: number }): BossPart {
    const part = new BossPart(this.scene, texture, opts);
    part.follow = follow;
    part.armed = this.state !== 'ENTERING' && (part.fireEvery ?? 0) > 0;
    this.parts.push(part);
    return part;
  }

  get aliveParts(): BossPart[] {
    this.parts = this.parts.filter(p => p.active);
    return this.parts;
  }

  // --- Damage / phases ---

  damage(amount: number): void {
    if (this.invulnerable) return;
    this.hp = Math.max(0, this.hp - amount);
    this.scene.fx.flashSprite(this);
    this.scene.fx.hitStop();
    this.scene.fx.shake(0.1);
    this.scene.hud.setBossHealth(this.hp / this.maxHp);

    const frac = this.hp / this.maxHp;
    const phase = this.hp <= 0 ? this.phase : frac <= 0.2 && this.def.boss === 'leviathan' ? 3 : frac <= 0.5 ? 2 : 1;
    if (phase > this.phase) {
      this.phase = phase;
      this.setTint(phase === 3 ? 0xff4444 : 0xff9999);
      this.scene.fx.shake(0.5);
      this.scene.fx.floatingText(this.x, this.y + 60, phase === 3 ? 'SELF-DESTRUCT!' : 'FRENZY MODE!', '#ff4444', 28);
      this.scene.cameras.main.flash(300, 255, 0, 0);
      this.behavior.onPhase?.(phase);
    }
    if (this.hp <= 0) this.die();
  }

  private die(): void {
    this.go('DYING');
    this.beam = undefined;
    this.gfx.clear();
    this.parts.forEach(p => p.active && p.destroy());
    this.setVelocity(0, 0);
    let count = 0;
    this.scene.time.addEvent({
      delay: 140, repeat: 14,
      callback: () => {
        count++;
        const ox = Phaser.Math.Between(-this.displayWidth / 2, this.displayWidth / 2);
        const oy = Phaser.Math.Between(-this.displayHeight / 2, this.displayHeight / 2);
        this.scene.fx.explode(this.x + ox, this.y + oy, 1.2);
        this.scene.fx.shake(0.25);
        synth.playExplosion(count % 3 === 0);
        if (count === 15) {
          this.scene.fx.explode(this.x, this.y, 4);
          this.scene.cameras.main.flash(600, 255, 255, 255);
          synth.playExplosion(true);
          this.setVisible(false);
          this.core.setVisible(false);
          this.scene.time.delayedCall(1200, () => this.scene.levelComplete());
        }
      },
    });
  }

  // --- Loop ---

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.core.setPosition(this.x, this.y + this.displayHeight * 0.05);
    if (this.state === 'ENTERING' || this.state === 'DYING') return;
    const dt = delta / 1000;
    this.stateTime += delta;
    const { width } = this.scene.scale;
    const boost = this.speedBoost * (this.frenzy ? 1.5 : 1);

    if (this.state === 'IDLE') {
      const tx = Phaser.Math.Clamp(this.scene.player.x, 90, width - 90);
      const s = this.behavior.moveSpeed * boost * dt;
      this.x += Phaser.Math.Clamp(tx - this.x, -s, s);
      this.y += (this.homeY + Math.sin(time / 600) * 8 - this.y) * Math.min(1, dt * 3);
      if (this.stateTime >= this.stateDuration / boost) this.behavior.next();
    } else if (this.state === 'DASH') {
      const s = 650 * boost * dt;
      const dx = this.dashTarget.x - this.x, dy = this.dashTarget.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= s) {
        this.setPosition(this.dashTarget.x, this.dashTarget.y);
        this.go('IDLE', this.behavior.idleMs * 0.4);
      } else {
        this.x += dx / d * s;
        this.y += dy / d * s;
      }
    }

    this.gfx.clear();
    this.behavior.tick?.(this.state, delta);

    if (this.state === 'ATTACK_LASER' && this.beam) {
      this.beam.update(delta, this.gfx);
      if (this.beam.done) {
        this.beam = undefined;
        this.go('IDLE', this.behavior.idleMs);
      }
    }
    if ((this.state === 'ATTACK_SPREAD' || this.state === 'SPECIAL') && this.stateDuration && this.stateTime >= this.stateDuration) {
      this.go('IDLE', this.behavior.idleMs);
    }
  }

  setSpeedBoost(v: number): void {
    this.speedBoost = v;
  }

  drawGfx(): Phaser.GameObjects.Graphics {
    return this.gfx;
  }

  destroy(fromScene?: boolean): void {
    this.core?.destroy();
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}

// --- The 10 archetypes ---

const orbit = (boss: Boss, radius: number, speed: number, offset: number) => () => {
  const a = boss.scene.time.now / 1000 * speed + offset;
  return { x: boss.x + Math.cos(a) * radius, y: boss.y + Math.sin(a) * radius * 0.8 };
};

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const BEHAVIORS: Record<LevelDef['boss'], (b: Boss) => Behavior> = {
  /** 1: heavy central cannon + shrapnel V; keeps mini-asteroids orbiting as shields. */
  goliath: b => {
    const summon = () => {
      for (let i = b.aliveParts.length; i < 4; i++) {
        b.addPart('asteroid_small', { hp: 3, points: 20, fireEvery: 0 }, orbit(b, 105, 1.4, (Math.PI / 2) * i));
      }
    };
    return {
      idleMs: 1200, moveSpeed: 70,
      setup: summon,
      next: () => (b.aliveParts.length < 2 && Math.random() < 0.5 ? b.go('SPECIAL', 600) : b.go('ATTACK_SPREAD', 2400)),
      tick: (s, d) => {
        if (s === 'SPECIAL' && b.stateTime < d * 2) summon();
        if (s !== 'ATTACK_SPREAD') return;
        b.every('cannon', b.frenzy ? 700 : 1000, d, () => {
          b.scene.fireEnemyBullet(b.x, b.y + b.displayHeight * 0.35, 90 * DEG, 160)?.setScale(2.2);
        });
        b.every('shrapnel', b.frenzy ? 450 : 650, d, () => {
          b.fan([70, 110], 230, -40);
          b.fan([55, 125], 230, 40);
        });
      },
    };
  },

  /** 2: zig-zag dashes, plasma spikes on the diagonals. */
  viper: b => {
    let dashes = 0;
    return {
      idleMs: 700, moveSpeed: 120,
      next: () => {
        if (dashes++ < 3) {
          const { width, height } = b.scene.scale;
          b.dashTarget = { x: b.x < width / 2 ? width - 80 : 80, y: Phaser.Math.Between(80, Math.min(260, height * 0.4)) };
          b.go('DASH');
        } else {
          dashes = 0;
          b.go('ATTACK_SPREAD', 1600);
        }
      },
      tick: (s, d) => {
        if (s === 'DASH') b.every('spikes', b.frenzy ? 110 : 160, d, () => b.fan([45, 135], 260));
        if (s === 'ATTACK_SPREAD') b.every('fan', 400, d, () => b.fan(b.frenzy ? [30, 50, 70, 90, 110, 130, 150] : [40, 65, 90, 115, 140], 230));
      },
    };
  },

  /** 3: rotating shield orbs block frontal shots; flank it. */
  aegis: b => {
    const addOrbs = (n: number, speed: number) => {
      b.aliveParts.forEach(p => p.destroy());
      for (let i = 0; i < n; i++) b.addPart(`shield_${b.def.id}`, { invulnerable: true, fireEvery: 0 }, orbit(b, 88, speed, (Math.PI * 2 * i) / n));
    };
    return {
      idleMs: 1100, moveSpeed: 60,
      setup: () => addOrbs(2, 1.3),
      onPhase: () => addOrbs(3, 1.9),
      next: () => b.go(pick(['ATTACK_SPREAD', 'ATTACK_SPREAD', 'SPECIAL']), 1800),
      tick: (s, d) => {
        if (s === 'ATTACK_SPREAD') b.every('burst', 500, d, () => b.aimed(5, 12, 240));
        if (s === 'SPECIAL') b.every('ring', 600, d, () => b.ring(b.frenzy ? 18 : 12, 170, b.stateTime / 20));
      },
    };
  },

  /** 4: two destructible wing turrets; losing a wing switches the core to concentrated beams. */
  hydra: b => ({
    idleMs: 1000, moveSpeed: 80,
    setup: () => [-1, 1].forEach(side => b.addPart(`turret_${b.def.id}`, { hp: 15, points: 200, fireEvery: 1300 },
      () => ({ x: b.x + side * b.displayWidth * 0.36, y: b.y + 8 }))),
    next: () => {
      if (b.aliveParts.length < 2) {
        if (Math.random() < 0.6) {
          const a = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(b.x, b.y, b.scene.player.x, b.scene.player.y));
          b.laser(a, a, 900, 1200, 26);
        } else b.go('ATTACK_SPREAD', 1200);
      } else b.go('ATTACK_SPREAD', 1800);
    },
    tick: (s, d) => {
      if (s !== 'ATTACK_SPREAD') return;
      if (b.aliveParts.length < 2) b.every('stream', 90, d, () => b.aimed(1, 0, 330));
      else b.every('fan', 800, d, () => b.aimed(3, 15, 230));
    },
  }),

  /** 5: lays proximity mines that burst into rings. */
  miner: b => ({
    idleMs: 1300, moveSpeed: 60,
    next: () => b.go(Math.random() < 0.6 ? 'SPECIAL' : 'ATTACK_SPREAD', 1500),
    tick: (s, d) => {
      if (s === 'SPECIAL') b.every('mine', 350, d, () => {
        if (b.stateTime < (b.frenzy ? 1500 : 1000)) new Mine(b.scene, b.x + Phaser.Math.Between(-40, 40), b.y + 50, Phaser.Math.Between(-60, 60), 80);
      });
      if (s === 'ATTACK_SPREAD') b.every('tri', 500, d, () => b.aimed(3, 20, 220));
    },
  }),

  /** 6: teleports and leaves holographic decoys that fire harmless bursts. */
  phantom: b => ({
    idleMs: 1200, moveSpeed: 90,
    next: () => b.go(Math.random() < 0.5 ? 'SPECIAL' : 'ATTACK_SPREAD', 1600),
    tick: (s, d) => {
      if (s === 'ATTACK_SPREAD') b.every('burst', 420, d, () => b.aimed(3, 10, 260));
      if (s !== 'SPECIAL' || b.stateTime > d * 1.5) return;
      const { width, height } = b.scene.scale;
      b.scene.tweens.add({
        targets: b, alpha: 0, duration: 300, yoyo: true,
        onYoyo: () => {
          b.setPosition(Phaser.Math.Between(90, width - 90), Phaser.Math.Between(90, Math.min(220, height * 0.35)));
          b.aliveParts.forEach(p => p.destroy());
          for (let i = 0; i < (b.frenzy ? 3 : 2); i++) {
            const pos = { x: Phaser.Math.Between(80, width - 80), y: Phaser.Math.Between(80, Math.min(240, height * 0.4)) };
            const decoy = b.addPart(`boss_${b.def.id}`, { hp: 6, points: 50, fireEvery: 700 }, () => pos);
            decoy.fake = true;
            decoy.setAlpha(0.55).setScale(0.8);
          }
        },
      });
    },
  }),

  /** 7: mothership launching kamikaze interceptor swarms; rarely fires itself. */
  carrier: b => ({
    idleMs: 1500, moveSpeed: 50,
    next: () => b.go(Math.random() < 0.75 ? 'SPECIAL' : 'ATTACK_SPREAD', 1800),
    tick: (s, d) => {
      if (s === 'SPECIAL') b.every('launch', b.frenzy ? 220 : 320, d, () => {
        const side = Math.random() < 0.5 ? -1 : 1;
        new Kamikaze(b.scene, b.x + side * b.displayWidth * 0.4, b.y);
      });
      if (s === 'ATTACK_SPREAD') b.every('ring', 900, d, () => b.ring(10, 140));
    },
  }),

  /** 8: telegraphed sweeping mega-laser that cuts half the screen. */
  behemoth: b => {
    let left = true;
    return {
      idleMs: 1000, moveSpeed: 70,
      next: () => {
        if (Math.random() < 0.55) {
          const span = b.frenzy ? 60 : 35;
          b.laser(left ? 90 - span : 90 + span, left ? 90 + span : 90 - span, 1500, 1800, 48);
          left = !left;
        } else b.go('ATTACK_SPREAD', 1600);
      },
      tick: (s, d) => {
        if (s === 'ATTACK_SPREAD') b.every('twin', 300, d, () => {
          const side = Math.floor(b.stateTime / 300) % 2 ? 1 : -1;
          b.aimed(1, 0, 300, side * 36);
        });
      },
    };
  },

  /** 9: gravity vortex dragging the player in while firing dense spirals. */
  titan: b => {
    let spiral = 0;
    return {
      idleMs: 900, moveSpeed: 40,
      next: () => b.go(Math.random() < 0.6 ? 'SPECIAL' : 'ATTACK_SPREAD', b.frenzy ? 4500 : 3500),
      tick: (s, d) => {
        if (s === 'ATTACK_SPREAD') b.every('ring', 700, d, () => b.ring(16, 160, spiral += 11));
        if (s !== 'SPECIAL') return;
        const p = b.scene.player;
        const body = p.body as Phaser.Physics.Arcade.Body;
        const a = Phaser.Math.Angle.Between(p.x, p.y, b.x, b.y);
        const pull = (b.frenzy ? 260 : 170) * d / 1000;
        body.velocity.x += Math.cos(a) * pull;
        body.velocity.y += Math.sin(a) * pull;
        // Collapsing rings show the well.
        const g = b.drawGfx();
        for (let i = 0; i < 4; i++) {
          const r = 40 + ((i * 60 - b.stateTime * 0.12) % 240 + 240) % 240;
          g.lineStyle(2, 0xffffff, 0.15 + 0.2 * (1 - r / 280)).strokeCircle(b.x, b.y, r);
        }
        b.every('spiral', 90, d, () => {
          spiral += 13;
          const arms = b.frenzy ? 4 : 3;
          for (let i = 0; i < arms; i++) b.scene.fireEnemyBullet(b.x, b.y, (spiral + (360 / arms) * i) * DEG, 170, i === 0);
        });
      },
    };
  },

  /** 10: final boss. Fortress (barriers + triple cannons) → Spiral (50%) → Self-destruct frenzy (20%). */
  leviathan: b => {
    let spin = 0;
    return {
      idleMs: 900, moveSpeed: 60,
      setup: () => {
        for (let i = 0; i < 3; i++) {
          b.addPart(`shield_${b.def.id}`, { invulnerable: true, fireEvery: 0 }, () => ({
            x: b.x + Math.sin(b.scene.time.now / 700 + i * 2.1) * b.scene.scale.width * 0.3,
            y: b.y + b.displayHeight * 0.75,
          })).setScale(1.6, 0.7);
        }
      },
      onPhase: phase => {
        if (phase === 2) b.aliveParts.forEach(p => p.destroy());
        if (phase === 3) b.setSpeedBoost(2);
      },
      next: () => b.go(b.phase === 1 ? 'ATTACK_SPREAD' : 'SPECIAL', b.phase === 3 ? 5000 : 2500),
      tick: (s, d) => {
        if (b.phase === 1 && s === 'ATTACK_SPREAD') b.every('triple', 700, d, () => [-50, 0, 50].forEach(ox => b.aimed(1, 0, 250, ox)));
        if (b.phase === 2 && s === 'SPECIAL') {
          b.every('spiral', 110, d, () => {
            spin += 9;
            for (let i = 0; i < 4; i++) b.scene.fireEnemyBullet(b.x, b.y, (spin + 90 * i) * DEG, 170, i === 0);
          });
          b.every('rings', 1400, d, () => b.ring(20, 130, spin));
        }
        if (b.phase === 3) {
          b.every('radial', 380, d, () => b.ring(20, 210, (spin += 9)));
          b.every('aim', 600, d, () => b.aimed(3, 12, 300));
        }
      },
    };
  },
};
