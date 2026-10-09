/**
 * Boss modules and unique geometric hull silhouettes.
 * Every boss gets a distinct custom geometric frame and silhouette,
 * not just a palette recolor!
 */
import { type Grid, generateShip, generateOrb, crop, downsample, makeGrid, decodeSprite } from './PixelArtGenerator.ts';
import * as Original from './OriginalSprites.ts';

export type BossKind =
  | 'goliath' | 'viper' | 'aegis' | 'hydra' | 'miner'
  | 'phantom' | 'carrier' | 'behemoth' | 'titan' | 'leviathan';

export const generateTurret = (seed: number): Grid => generateShip(seed, 8, 8, 0.9);
export const generateShieldOrb = (): Grid => generateOrb(12);

/** Bright pulsing core overlay. */
export const generateCore = (): Grid => generateOrb(8);

function blit(dest: Grid, src: Grid, ox: number, oy: number): void {
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

function cloneGrid(g: Grid): Grid {
  return g.map(r => [...r]);
}

/**
 * Procedurally generates 10 unique hull frames for each boss archetype
 * using architectural composite geometry, structural wings, plating and cuts.
 */
export function generateBossHull(kind: BossKind): Grid {
  const origBoss = decodeSprite(Original.boss).grid;
  const origShip = decodeSprite(Original.enemyShip).grid;
  const origWeaver = decodeSprite(Original.enemyWeaver).grid;

  switch (kind) {
    case 'goliath': {
      // 1. Heavy broadside dreadnought: reinforced side armored wings
      const base = cloneGrid(origBoss);
      const w = base[0].length + 20, h = base.length;
      const out = makeGrid(w, h);
      blit(out, base, 10, 0);
      const wingL = crop(origShip, 0, 10, 15, 35);
      const wingR = crop(origShip, 40, 10, 15, 35);
      blit(out, wingL, 0, 20);
      blit(out, wingR, w - 15, 20);
      return out;
    }

    case 'viper': {
      // 2. High-speed needle interceptor: narrow aerodynamic fuselage + forward pincer blades
      const core = crop(origBoss, 15, 0, 40, 77);
      const w = 64, h = 80;
      const out = makeGrid(w, h);
      blit(out, core, 12, 0);
      const bladeL = crop(origShip, 10, 0, 12, 45);
      const bladeR = crop(origShip, 33, 0, 12, 45);
      blit(out, bladeL, 0, 25);
      blit(out, bladeR, w - 12, 25);
      return out;
    }

    case 'aegis': {
      // 3. Shield fortress citadel: heavy armor crest on top + wide defensive bulkheads
      const center = crop(origBoss, 10, 10, 50, 60);
      const plate = crop(origWeaver, 0, 0, 42, 20);
      const w = 70, h = 85;
      const out = makeGrid(w, h);
      blit(out, center, 10, 15);
      blit(out, plate, 14, 0);
      return out;
    }

    case 'hydra': {
      // 4. Catamaran twin-fuselage assault platform: dual sponsons with wide center bridge
      const halfL = crop(origBoss, 0, 0, 32, 70);
      const halfR = crop(origBoss, 38, 0, 32, 70);
      const bridge = crop(origShip, 18, 15, 19, 18);
      const w = 84, h = 75;
      const out = makeGrid(w, h);
      blit(out, halfL, 0, 5);
      blit(out, halfR, 52, 5);
      blit(out, bridge, 32, 20);
      return out;
    }

    case 'miner': {
      // 5. Heavy industrial rig: wide spiked base with industrial deployer tongs
      const hull = crop(origBoss, 5, 20, 60, 50);
      const prongs = crop(origWeaver, 5, 15, 32, 20);
      const w = 76, h = 75;
      const out = makeGrid(w, h);
      blit(out, hull, 8, 0);
      blit(out, prongs, 22, 50);
      return out;
    }

    case 'phantom': {
      // 6. Stealth phase raider: sharp angular raked profile with negative-space diamond vents
      const mid = crop(origBoss, 12, 0, 46, 75);
      const out = cloneGrid(mid);
      for (let y = 30; y < 50; y++) {
        for (let x = 17; x < 29; x++) {
          out[y][x] = 0;
        }
      }
      return out;
    }

    case 'carrier': {
      // 7. Mega-hangar flight carrier: massive extended side flight pods
      const main = cloneGrid(origBoss);
      const w = 90, h = 80;
      const out = makeGrid(w, h);
      blit(out, main, 10, 0);
      const podL = crop(origWeaver, 0, 0, 18, 28);
      const podR = crop(origWeaver, 24, 0, 18, 28);
      blit(out, podL, 0, 10);
      blit(out, podR, w - 18, 10);
      return out;
    }

    case 'behemoth': {
      // 8. Spinal siege railgun: elongated heavy beam accelerator down the central axis
      const base = cloneGrid(origBoss);
      const cannon = crop(origShip, 22, 0, 11, 48);
      const w = 78, h = 90;
      const out = makeGrid(w, h);
      blit(out, base, 4, 12);
      blit(out, cannon, 33, 0);
      return out;
    }

    case 'titan': {
      // 9. Singularity engine: hollow circular event-horizon chassis with dark vortex core
      const base = cloneGrid(origBoss);
      const w = 74, h = 74;
      const out = makeGrid(w, h);
      blit(out, base, 2, 0);
      const cx = 37, cy = 37;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d < 14) out[y][x] = 0;
          else if (d >= 14 && d < 18 && out[y][x] !== 0) out[y][x] = 1;
        }
      }
      return out;
    }

    case 'leviathan':
    default: {
      // 10. Apex Mother Core: original full-spec alien battleship
      return cloneGrid(origBoss);
    }
  }
}
