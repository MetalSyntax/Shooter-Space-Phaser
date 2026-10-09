import Phaser from 'phaser';
import { Enemy, Drone, Weaver, Gunship, Spreader, LaserShip, Lancer, Pod, Splitter, Blinker, Swooper, Fighter, Asteroid, Mine, Kamikaze } from '../entities/Enemy';
import { roster, SHOOTER_KINDS, type EnemyKind, type WaveKind } from './LevelManager';
import type MainGame from '../scenes/MainGame';

type Spawn = [delay: number, spawn: () => void];

const SPAWNERS: Record<EnemyKind, new (scene: MainGame, x: number, y: number) => Enemy> = {
  drone: Drone, weaver: Weaver, gunship: Gunship, spreader: Spreader, laser: LaserShip,
  lancer: Lancer, pod: Pod, splitter: Splitter, blinker: Blinker, kamikaze: Kamikaze,
};
/** Plain drones stay the backbone of every stream; specials are rarer. */
const WEIGHT: Partial<Record<EnemyKind, number>> = { drone: 4, weaver: 3 };

const WAVE_TIMEOUT = 20000;
const BREAK_MS = 1500;

/**
 * Runs the sector's wave pool for `level.duration` seconds (choreographed formations,
 * growing with the wave count), then hands over to the boss.
 */
export default class WaveManager {
  wave = 0;
  /** ms of sector time elapsed (pauses with the scene). */
  sectorTime = 0;
  private pending = 0;
  private elapsed = 0;
  private active = false;
  private done = false;
  private lastKind?: WaveKind;
  private scene: MainGame;

  constructor(scene: MainGame) {
    this.scene = scene;
  }

  start(): void {
    this.scene.time.delayedCall(2200, () => this.nextWave());
  }

  get progress(): number {
    return Math.min(1, this.sectorTime / (this.scene.level.duration * 1000));
  }

  private randX(): number {
    return Phaser.Math.Between(30, this.scene.scale.width - 30);
  }

  private interval(): number {
    return this.scene.spawnDelay;
  }

  private spawn(kind: EnemyKind): void {
    new SPAWNERS[kind](this.scene, this.randX(), -40);
  }

  /** Weighted pick from the sector roster, optionally limited to some kinds. */
  private pickKind(filter: (k: EnemyKind) => boolean): EnemyKind {
    const pool = roster(this.scene.level.id).filter(filter);
    const bag = pool.flatMap(k => Array(WEIGHT[k] ?? 1).fill(k) as EnemyKind[]);
    return Phaser.Utils.Array.GetRandom(bag);
  }

  /**
   * Mixed stream from the sector roster (v1 feel: mostly drones, ~20% ships that fire).
   * Every 5th enemy is a shooter so short streams always include one.
   */
  private classic(count: number, offset = 0): Spawn[] {
    return Array.from({ length: count }, (_, i) => [offset + i * this.interval(), () => {
      this.spawn(this.pickKind(k => (i % 5 === 1 ? SHOOTER_KINDS.includes(k) : !SHOOTER_KINDS.includes(k) && k !== 'kamikaze')));
    }] as Spawn);
  }

  private stream(count: number, make: () => void, offset = 0): Spawn[] {
    return Array.from({ length: count }, (_, i) => [offset + i * this.interval(), make] as Spawn);
  }

  /** 5 swoopers in a "V" entering in an arc from a top corner. */
  private vFormation(fromLeft: boolean, offset = 0): Spawn[] {
    const { width } = this.scene.scale;
    const x = fromLeft ? -30 : width + 30;
    const slots = [[0, 0], [1, -35], [1, 35], [2, -70], [2, 70]];
    return slots.map(([rank, dy]) => [offset + rank * 260, () => new Swooper(this.scene, x, 60 + dy, fromLeft)] as Spawn);
  }

  /** Fighters crossing diagonally from both top corners at once. */
  private pincer(pairs: number): Spawn[] {
    const { width, height } = this.scene.scale;
    const speed = 260;
    const vx = speed * (width / Math.hypot(width, height));
    const vy = speed * (height / Math.hypot(width, height));
    return Array.from({ length: pairs }, (_, i) => [i * 500, () => {
      new Fighter(this.scene, -20, -20, vx, vy);
      new Fighter(this.scene, width + 20, -20, -vx, vy);
    }] as Spawn);
  }

  /** Builds one wave; size grows with the sector and the wave number. */
  private build(kind: WaveKind): Spawn[] {
    const n = Math.min(4 + Math.floor(this.scene.level.id / 2) + Math.floor(this.wave / 2), 12);
    switch (kind) {
      case 'stream': return this.classic(n + Math.floor(n / 2));
      case 'vformation': return [...this.vFormation(true), ...(n > 6 ? this.vFormation(false, 1800) : []), ...this.stream(2, () => this.spawn(this.pickKind(k => SHOOTER_KINDS.includes(k))), 1200)];
      case 'pincer': return this.pincer(Math.ceil(n / 2));
      case 'asteroids': return Array.from({ length: Math.ceil(n / 2) }, (_, i) => [i * 1100, () => new Asteroid(this.scene, this.randX(), -60, true, Phaser.Math.Between(-30, 30), Phaser.Math.Between(70, 110))] as Spawn);
      case 'shooters': return [...this.stream(Math.ceil(n / 2), () => this.spawn(this.pickKind(k => SHOOTER_KINDS.includes(k) || k === 'pod')), 0), ...this.classic(Math.floor(n / 2), 500)];
      case 'mines': return [...this.stream(Math.ceil(n / 2), () => new Mine(this.scene, this.randX(), -30, 0, 70)), ...this.classic(Math.floor(n / 3), 300)];
      case 'swarm': return this.stream(n + 2, () => new Kamikaze(this.scene, this.randX(), -30));
    }
  }

  private nextWave(): void {
    if (this.done) return;
    if (this.sectorTime >= this.scene.level.duration * 1000) {
      this.done = true;
      this.scene.startBoss();
      return;
    }
    const pool = this.scene.level.waves;
    let kind = pool[this.wave % pool.length];
    if (this.wave >= pool.length) kind = Phaser.Utils.Array.GetRandom(pool.filter(k => k !== this.lastKind)) ?? kind;
    this.lastKind = kind;
    const spawns = this.build(kind);
    this.wave++;
    this.scene.hud.announce(`WAVE ${this.wave}`);
    if (this.wave % 2 === 1) this.scene.spawnPowerup(); // a guaranteed drop every other wave
    this.pending = spawns.length;
    this.elapsed = 0;
    this.active = true;
    spawns.forEach(([delay, spawn]) => this.scene.time.delayedCall(800 + delay, () => {
      if (!this.done) spawn();
      this.pending--;
    }));
  }

  /** Skips straight to the boss (debug / tests). */
  skipToBoss(): void {
    this.sectorTime = this.scene.level.duration * 1000;
    this.active = false;
    this.nextWave();
  }

  update(delta: number): void {
    if (this.done) return;
    this.sectorTime += delta;
    if (!this.active) return;
    this.elapsed += delta;
    const cleared = this.pending === 0 && this.scene.countWaveEnemies() === 0;
    if (cleared || this.elapsed > WAVE_TIMEOUT) {
      this.active = false;
      this.scene.time.delayedCall(BREAK_MS, () => this.nextWave());
    }
  }
}
