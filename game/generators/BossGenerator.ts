/** Boss modules (turret, shield orb, core). The hull itself is the original boss art, recolored per sector. */
import { type Grid, generateShip, generateOrb } from './PixelArtGenerator.ts';

export type BossKind =
  | 'goliath' | 'viper' | 'aegis' | 'hydra' | 'miner'
  | 'phantom' | 'carrier' | 'behemoth' | 'titan' | 'leviathan';

export const generateTurret = (seed: number): Grid => generateShip(seed, 8, 8, 0.9);
export const generateShieldOrb = (): Grid => generateOrb(12);

/** Bright pulsing core overlay. */
export const generateCore = (): Grid => generateOrb(8);
