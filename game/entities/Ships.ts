/** Player ships: recolors of the original ship, each with its own stats and unique ability. Phaser-free. */
export type ShipId = 'vanguard' | 'striker' | 'phantom' | 'bulwark' | 'nova';

export interface ShipDef {
  name: string;
  /** Hue rotation applied to the original (blue) ship art. */
  hue: number;
  sat: number;
  color: number;
  ability: string;
  desc: string;
  lives: number;
  speed: number;     // movement multiplier
  fireRate: number;  // >1 = faster
  extraShots: number;
  bombs: number;
  /** Wingman drone that never expires. */
  permanentDrone?: boolean;
  /** Shield duration (ms) granted at the start of every sector. */
  sectorShield?: number;
  /** Invulnerability after a hit (ms). */
  invulnMs: number;
}

export const SHIPS: Record<ShipId, ShipDef> = {
  vanguard: { name: 'VANGUARD', hue: 0, sat: 1, color: 0x3f6fe0, ability: 'EQUILIBRADA', desc: 'LA NAVE ORIGINAL. 3 HYPER BOMBS AL INICIO', lives: 5, speed: 1, fireRate: 1, extraShots: 0, bombs: 3, invulnMs: 1000 },
  striker: { name: 'STRIKER', hue: 150, sat: 1.1, color: 0xff3b3b, ability: 'DOBLE CANON', desc: 'SIEMPRE DISPARA DOBLE Y +15% CADENCIA', lives: 4, speed: 0.95, fireRate: 1.15, extraShots: 1, bombs: 2, invulnMs: 1000 },
  phantom: { name: 'PHANTOM', hue: 60, sat: 1, color: 0xb04dff, ability: 'EVASION', desc: '+30% VELOCIDAD E INVULNERABILIDAD MAS LARGA', lives: 4, speed: 1.3, fireRate: 1, extraShots: 0, bombs: 2, invulnMs: 1800 },
  bulwark: { name: 'BULWARK', hue: -100, sat: 1, color: 0x3dff6e, ability: 'BLINDAJE', desc: '7 VIDAS Y ESCUDO AL EMPEZAR CADA SECTOR', lives: 7, speed: 0.85, fireRate: 0.95, extraShots: 0, bombs: 2, sectorShield: 8000, invulnMs: 1000 },
  nova: { name: 'NOVA', hue: -185, sat: 1.2, color: 0xffcf40, ability: 'DRON PERMANENTE', desc: 'UN DRON TELEDIRIGIDO TE ACOMPANA SIEMPRE', lives: 4, speed: 1, fireRate: 0.9, extraShots: 0, bombs: 2, permanentDrone: true, invulnMs: 1000 },
};

export const SHIP_ORDER = Object.keys(SHIPS) as ShipId[];
const KEY = 'ss_ship';

export function loadShip(): ShipId {
  try {
    const s = localStorage.getItem(KEY) as ShipId;
    return s in SHIPS ? s : 'vanguard';
  } catch {
    return 'vanguard';
  }
}

export function saveShip(id: ShipId): void {
  try { localStorage.setItem(KEY, id); } catch { /* ignore */ }
}
