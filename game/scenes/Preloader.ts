import Phaser from 'phaser';
import {
  PALETTES, renderTexture, renderBackground, hashString, generateShip, generateAsteroid,
  generateOrb, generateMissile, flipV, Grid, makeGrid, outline, mirror, BODY, LIGHT, SHADOW, ACCENT,
  decodeSprite, shiftPalette, tintPalette, crop, downsample, Palette,
} from '../generators/PixelArtGenerator';
import * as Original from '../generators/OriginalSprites';
import type { EncodedSprite } from '../generators/OriginalSprites';
import { generateTurret, generateShieldOrb, generateCore, generateBossHull } from '../generators/BossGenerator';
import { LEVELS, ABILITIES, AbilityColor } from '../managers/LevelManager';
import { SHIPS } from '../entities/Ships';


/** Power-ups: the three original orbs, plus hue-shifted copies of the blue one for the newer kinds. */
const POWERUP_ART: Record<string, [EncodedSprite, number, number]> = {
  shield: [Original.powerupBlue, 0, 1], rapid: [Original.powerupYellow, 0, 1], bomb: [Original.powerupRed, 0, 1],
  spread: [Original.powerupBlue, -80, 1], missile: [Original.powerupBlue, 170, 1.1],
  drone: [Original.powerupBlue, 0, 0.1], magnet: [Original.powerupBlue, 80, 1],
};

/** Helper to overlay grid B onto grid A at (ox, oy) */
function blitGrid(dest: Grid, src: Grid, ox: number, oy: number): void {
  src.forEach((row, y) => {
    row.forEach((val, x) => {
      if (val !== 0) {
        const dy = oy + y;
        const dx = ox + x;
        if (dy >= 0 && dy < dest.length && dx >= 0 && dx < dest[0].length) {
          dest[dy][dx] = val;
        }
      }
    });
  });
}

/** Renders an original sprite 1:1, optionally recolored. */
function renderOriginal(scene: Phaser.Scene, key: string, art: EncodedSprite, hue = 0, sat = 1): void {
  const { grid, palette } = decodeSprite(art);
  renderTexture(scene, key, grid, shiftPalette(palette, hue, sat), 1);
}

/**
 * Enemy fleet derived from the three original designs.
 * Each variety now has a UNIQUE GEOMETRIC SILHOUETTE, not just a tint:
 *  - Drone: original weaver hull (35x42)
 *  - Blinker: compact telemetry diamond core with phase apertures
 *  - Kamikaze: raked needle-nose dart with stub wings
 *  - Pod: weaver body without legs + armored bulkhead
 *  - Gunship: original heavy red ship (50x55)
 *  - Spreader: extended wide multi-barrel wingspan platform
 *  - LaserShip: spinal beam rail with forward emitter crest
 *  - Lancer: sleek high-velocity fuselage without wide wings
 *  - Spiderling: downsampled spider dreadnought
 *  - Asteroid: the original "enemy" rock (big + small fragments)
 */
function renderFleet(scene: Phaser.Scene): void {
  const weaver = decodeSprite(Original.enemyWeaver);
  const ship = decodeSprite(Original.enemyShip);
  const boss = decodeSprite(Original.boss);
  const rock = decodeSprite(Original.enemy);

  const tint = (p: Palette, c: AbilityColor, amount = 0.6) => tintPalette(shiftPalette(p, ABILITIES[c].hue), ABILITIES[c].color, amount);
  const hue = (p: Palette, c: AbilityColor) => shiftPalette(p, ABILITIES[c].hue, 1.1);

  // 1. Drones & aerial specialists
  renderTexture(scene, 'en_drone', weaver.grid, weaver.palette, 1);
  
  // Blinker (Purple): Compact telemetry chassis
  const blinkerGrid = crop(weaver.grid, 6, 0, 30, 30);
  renderTexture(scene, 'en_drone_purple', blinkerGrid, tint(weaver.palette, 'purple', 0.65), 1);

  // Kamikaze (Yellow): Sleek arrowhead ram-dart
  const kamikazeGrid = crop(ship.grid, 18, 0, 19, 36);
  renderTexture(scene, 'en_drone_yellow', kamikazeGrid, hue(ship.palette, 'yellow'), 1);

  // Splitter baby (Green): miniature weaver drone
  renderTexture(scene, 'en_drone_green', weaver.grid, tint(weaver.palette, 'green', 0.65), 1);

  // Pod (Blue): Weaver body armored pod
  renderTexture(scene, 'en_pod_blue', crop(weaver.grid, 0, 0, 42, 25), tint(weaver.palette, 'blue', 0.6), 1);

  // 2. Heavy Gunships
  renderTexture(scene, 'en_gunship_red', ship.grid, hue(ship.palette, 'red'), 1);

  // Spreader (Orange): Wide broadside multi-gun variant
  const spreaderBase = crop(ship.grid, 0, 10, 55, 40);
  const spreaderGrid = makeGrid(65, 40);
  blitGrid(spreaderGrid, spreaderBase, 5, 0);
  renderTexture(scene, 'en_gunship_orange', spreaderGrid, hue(ship.palette, 'orange'), 1);

  // LaserShip (Cyan): Heavy spinal lance with emitter hood
  const laserSpine = crop(ship.grid, 16, 0, 23, 50);
  const laserCrest = crop(weaver.grid, 11, 0, 20, 15);
  const laserGrid = makeGrid(35, 55);
  blitGrid(laserGrid, laserSpine, 6, 5);
  blitGrid(laserGrid, laserCrest, 7, 0);
  renderTexture(scene, 'en_gunship_cyan', laserGrid, hue(ship.palette, 'cyan'), 1);

  // Lancer (Yellow): Sleek aerodynamic interceptor
  renderTexture(scene, 'en_lancer_yellow', crop(ship.grid, 14, 0, 27, 50), hue(ship.palette, 'yellow'), 1);

  // Spiderling (Green): Broodmother spider
  renderTexture(scene, 'en_spider_green', downsample(boss.grid, 2), hue(boss.palette, 'green'), 1);

  // Hazards
  renderTexture(scene, 'asteroid', rock.grid, rock.palette, 1);
  renderTexture(scene, 'asteroid_small', downsample(rock.grid, 2), rock.palette, 1);
  (Object.keys(ABILITIES) as AbilityColor[]).forEach(c => renderOriginal(scene, `eb_${c}`, Original.enemyBullet, ABILITIES[c].hue, 1.1));
}

export default class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    const { width, height } = this.cameras.main;
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x3b82f6, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });
    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      this.generateTextures();
      this.scene.start('MainMenu');
    });
    // The only file loaded: the pixel font. Every sprite is generated below.
    this.load.font('Press Start 2P', 'fonts/PressStart2P-Regular.ttf', 'truetype');
  }

  private generateTextures() {
    const player = PALETTES.player;

    // Player and weapons: original v1 art
    renderOriginal(this, 'ship', Original.ship);
    Object.entries(SHIPS).forEach(([id, s]) => renderOriginal(this, `ship_${id}`, Original.ship, s.hue, s.sat));
    renderOriginal(this, 'bullet', Original.bullet);
    renderTexture(this, 'missile', generateMissile(), player, 3);
    renderTexture(this, 'orb', generateOrb(4), player, 2);
    renderTexture(this, 'drone', generateShip(hashString('drone'), 6, 6, 1), player, 3);

    // Rocks and power-ups
    renderFleet(this);
    Object.entries(POWERUP_ART).forEach(([kind, [art, hue, sat]]) => renderOriginal(this, `powerup_${kind}`, art, hue, sat));

    // Per-sector faction sprites & UNIQUE boss hull structures
    const bossOrig = decodeSprite(Original.boss);
    LEVELS.forEach(level => {
      const pal = PALETTES[level.palette];
      const l = level.id;
      // The boss bullet carries the sector's colors.
      renderOriginal(this, `eb_${l}`, Original.enemyBullet, level.hue, level.sat);
      
      // Each boss has a unique geometric silhouette generated by generateBossHull
      const bossHullGrid = generateBossHull(level.boss);
      const bossPal = shiftPalette(bossOrig.palette, level.hue, level.sat);
      renderTexture(this, `boss_${l}`, bossHullGrid, bossPal, 1);

      renderTexture(this, `en_mine_${l}`, this.mine(), pal, 3);
      renderTexture(this, `turret_${l}`, flipV(generateTurret(hashString(`turret:${l}`))), pal, 3);
      renderTexture(this, `shield_${l}`, generateShieldOrb(), pal, 3);
      renderTexture(this, `core_${l}`, generateCore(), pal, 3);
      renderBackground(this, `bg_${l}`, hashString(level.name), level.space, level.nebula);
    });
    this.generateDecor();

    // Particles / UI dots (Graphics is enough for these)
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 2, 2);
    graphics.generateTexture('star', 2, 2);
    graphics.clear();
    graphics.fillRect(0, 0, 4, 4);
    graphics.generateTexture('spark', 4, 4);
    graphics.clear();
    [8, 6, 4].forEach((r, i) => {
      graphics.fillStyle(0xffffff, 0.25 + i * 0.25);
      graphics.fillRect(8 - r, 8 - r, r * 2, r * 2);
    });
    graphics.generateTexture('smoke', 16, 16);
    graphics.destroy();
  }

  /** Spiky proximity mine. */
  private mine(): Grid {
    const g = generateOrb(7).map(r => r.slice(1, -1)).slice(1, -1);
    const m = makeGrid(11, 11);
    g.forEach((row, y) => row.forEach((v, x) => { m[y + 2][x + 2] = v; }));
    [[5, 0], [5, 1], [0, 5], [1, 5], [1, 1], [2, 2]].forEach(([x, y]) => { m[y][x] = ACCENT; m[10 - y][x] = ACCENT; m[y][10 - x] = ACCENT; m[10 - y][10 - x] = ACCENT; });
    return outline(m);
  }

  /** Background parallax props for each sector theme. */
  private generateDecor() {
    renderTexture(this, 'decor_asteroids', generateAsteroid(77, 26), PALETTES.rock, 3);
    renderTexture(this, 'decor_plasma', generateOrb(14, true), PALETTES.nebula, 3);
    renderTexture(this, 'decor_buoys', generateOrb(5), PALETTES.steel, 3);

    // Scrap: a broken hull (holes punched in a generated ship).
    const scrap = generateShip(hashString('scrap'), 16, 14, 1).map((r, y) => r.map((v, x) => ((x * 7 + y * 3) % 5 === 0 ? 0 : v)));
    renderTexture(this, 'decor_scrap', scrap, PALETTES.copper, 3);

    // Station girder: symmetric lattice
    const girder = makeGrid(20, 12);
    girder.forEach((row, y) => row.forEach((_, x) => {
      if (x < 10 && (y === 0 || y === 11 || x === 0 || (x + y) % 6 === 0 || (x - y + 12) % 6 === 0)) row[x] = y % 11 === 0 ? LIGHT : BODY;
    }));
    renderTexture(this, 'decor_structures', outline(mirror(girder)), PALETTES.steel, 3);

    // Planet ring: flat ellipse band
    const ring = makeGrid(60, 14);
    ring.forEach((row, y) => row.forEach((_, x) => {
      const d = Math.hypot((x - 29.5) / 30, (y - 6.5) / 7);
      if (d < 1 && d > 0.7) row[x] = y < 7 ? LIGHT : d > 0.85 ? SHADOW : BODY;
    }));
    renderTexture(this, 'decor_rings', ring, PALETTES.gold, 3);
  }
}
