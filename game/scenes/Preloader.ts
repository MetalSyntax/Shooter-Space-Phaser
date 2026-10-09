import Phaser from 'phaser';
import {
  PALETTES, renderTexture, renderBackground, hashString, generateShip, generateAsteroid,
  generateOrb, generateMissile, flipV, Grid, makeGrid, outline, mirror, BODY, LIGHT, SHADOW, ACCENT,
  decodeSprite, shiftPalette, tintPalette, crop, downsample, Palette,
} from '../generators/PixelArtGenerator';
import * as Original from '../generators/OriginalSprites';
import type { EncodedSprite } from '../generators/OriginalSprites';
import { generateTurret, generateShieldOrb, generateCore } from '../generators/BossGenerator';
import { LEVELS, ABILITIES, AbilityColor } from '../managers/LevelManager';
import { SHIPS } from '../entities/Ships';


/** Power-ups: the three original orbs, plus hue-shifted copies of the blue one for the newer kinds. */
const POWERUP_ART: Record<string, [EncodedSprite, number, number]> = {
  shield: [Original.powerupBlue, 0, 1], rapid: [Original.powerupYellow, 0, 1], bomb: [Original.powerupRed, 0, 1],
  spread: [Original.powerupBlue, -80, 1], missile: [Original.powerupBlue, 170, 1.1],
  drone: [Original.powerupBlue, 0, 0.1], magnet: [Original.powerupBlue, 80, 1],
};

/** Renders an original sprite 1:1, optionally recolored. */
function renderOriginal(scene: Phaser.Scene, key: string, art: EncodedSprite, hue = 0, sat = 1): void {
  const { grid, palette } = decodeSprite(art);
  renderTexture(scene, key, grid, shiftPalette(palette, hue, sat), 1);
}

/**
 * Enemy fleet derived from the three original designs. Hull = family, color = ability:
 *  - Drone: original weaver (white = no ability; tinted for blinker/kamikaze/splitter babies)
 *  - Pod: weaver body without legs (blue, shielded)
 *  - Gunship: original red ship (red aimed / orange fan / cyan laser)
 *  - Lancer: gunship fuselage without the big wings (yellow, dashes)
 *  - Spiderling: half-size boss (green, splits)
 *  - Asteroid: the original "enemy" rock (big + small fragments)
 */
function renderFleet(scene: Phaser.Scene): void {
  const weaver = decodeSprite(Original.enemyWeaver);
  const ship = decodeSprite(Original.enemyShip);
  const boss = decodeSprite(Original.boss);
  const rock = decodeSprite(Original.enemy);
  // Grey hulls: recolor the red eyes to the ability hue, then wash the hull with the ability color.
  const tint = (p: Palette, c: AbilityColor, amount = 0.6) => tintPalette(shiftPalette(p, ABILITIES[c].hue), ABILITIES[c].color, amount);
  const hue = (p: Palette, c: AbilityColor) => shiftPalette(p, ABILITIES[c].hue, 1.1);

  renderTexture(scene, 'en_drone', weaver.grid, weaver.palette, 1);
  (['purple', 'yellow', 'green'] as const).forEach(c => renderTexture(scene, `en_drone_${c}`, weaver.grid, tint(weaver.palette, c), 1));
  renderTexture(scene, 'en_pod_blue', crop(weaver.grid, 0, 0, 42, 25), tint(weaver.palette, 'blue', 0.6), 1);
  (['red', 'orange', 'cyan'] as const).forEach(c => renderTexture(scene, `en_gunship_${c}`, ship.grid, hue(ship.palette, c), 1));
  renderTexture(scene, 'en_lancer_yellow', crop(ship.grid, 14, 0, 27, 50), hue(ship.palette, 'yellow'), 1);
  renderTexture(scene, 'en_spider_green', downsample(boss.grid, 2), hue(boss.palette, 'green'), 1);
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

    // Per-sector faction sprites
    LEVELS.forEach(level => {
      const pal = PALETTES[level.palette];
      const l = level.id;
      // The boss and its bullets carry the sector's colors.
      renderOriginal(this, `eb_${l}`, Original.enemyBullet, level.hue, level.sat);
      renderOriginal(this, `boss_${l}`, Original.boss, level.hue, level.sat);
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
