/** The 10-sector campaign: per-level data and localStorage persistence. Phaser-free for Node tests. */
import type { BossKind } from '../generators/BossGenerator.ts';
import { SHIPS, type ShipId } from '../entities/Ships.ts';

import { t, getLanguage } from '../utils/i18n.ts';

export type EnemyKind = 'drone' | 'weaver' | 'gunship' | 'lancer' | 'pod' | 'spreader' | 'splitter' | 'blinker' | 'kamikaze' | 'laser';

/** Enemy color = ability, the same in every sector, so players learn to read threats at a glance. */
export const ABILITIES = {
  red: { color: 0xff3333, hue: 0, name: 'DISPARO DIRIGIDO', nameEn: 'AIMED FIRE' },
  orange: { color: 0xff8a1f, hue: 30, name: 'ABANICO', nameEn: 'SPREAD FAN' },
  yellow: { color: 0xffd21f, hue: 55, name: 'EMBESTIDA', nameEn: 'RAM DASH' },
  green: { color: 0x3dff6e, hue: 120, name: 'SE DIVIDE', nameEn: 'SPLITS' },
  cyan: { color: 0x2ff3ff, hue: 180, name: 'LASER', nameEn: 'LASER BEAM' },
  blue: { color: 0x3d7bff, hue: 220, name: 'ESCUDO', nameEn: 'BUBBLE SHIELD' },
  purple: { color: 0xb04dff, hue: 275, name: 'TELETRANSPORTE', nameEn: 'TELEPORT' },
} as const;
export type AbilityColor = keyof typeof ABILITIES;

export function abilityName(c: AbilityColor): string {
  return getLanguage() === 'en' ? ABILITIES[c].nameEn : ABILITIES[c].name;
}

/** Which enemies shoot (every 5th enemy of a mixed stream is one of these). */
export const SHOOTER_KINDS: EnemyKind[] = ['gunship', 'spreader', 'laser'];
export type WaveKind = 'stream' | 'vformation' | 'pincer' | 'asteroids' | 'shooters' | 'mines' | 'swarm';
export type Decor = 'asteroids' | 'plasma' | 'scrap' | 'buoys' | 'rings' | 'structures' | null;
export type BgFx = 'lightning' | 'distortion' | 'gravity' | 'pulse' | null;

export interface LevelDef {
  id: number;
  name: string;
  palette: string;
  /** Recolor of the original enemy/boss art for this sector's faction (hue rotation, saturation scale). */
  hue: number;
  sat: number;
  space: number;
  nebula: [number, number];
  decor: Decor;
  fx: BgFx;
  bpm: number;
  /** Seconds of waves before the boss alarm. */
  duration: number;
  boss: BossKind;
  bossName: string;
  waves: WaveKind[];
  /** New enemy type introduced in this sector (announced at the start). */
  unlock: EnemyKind | null;
  threat: string;
  threatEn: string;
}

export const LEVELS: LevelDef[] = [
  { id: 1, name: 'ASTEROID BELT', palette: 'military', hue: 0, sat: 1, space: 0x060a18, nebula: [0x1a3a7a, 0x4a7ad0], decor: 'asteroids', fx: null, bpm: 110, duration: 90, boss: 'goliath', bossName: 'GOLIATH-CORE', waves: ['stream', 'asteroids', 'vformation'], unlock: null, threat: 'DRONES BLANCOS · GUNSHIPS ROJOS DISPARAN', threatEn: 'WHITE DRONES · RED GUNSHIPS FIRE' },
  { id: 2, name: 'CAELUM NEBULA', palette: 'nebula', hue: -80, sat: 1, space: 0x0c0618, nebula: [0x4a1a7a, 0xc04ad0], decor: 'plasma', fx: null, bpm: 110, duration: 95, boss: 'viper', bossName: 'VIPER-STING', waves: ['stream', 'vformation', 'pincer'], unlock: 'lancer', threat: 'NUEVO: LANCER AMARILLO · EMBESTIDA', threatEn: 'NEW: YELLOW LANCER · RAM DASH' },
  { id: 3, name: 'ORBITAL SCRAPYARD', palette: 'copper', hue: 30, sat: 0.8, space: 0x0e0905, nebula: [0x5a3218, 0xa8642e], decor: 'scrap', fx: null, bpm: 110, duration: 100, boss: 'aegis', bossName: 'AEGIS-FORTRESS', waves: ['stream', 'asteroids', 'shooters', 'pincer'], unlock: 'pod', threat: 'NUEVO: POD AZUL · ESCUDO', threatEn: 'NEW: BLUE POD · BUBBLE SHIELD' },
  { id: 4, name: 'PLASMA STORM', palette: 'volcanic', hue: 15, sat: 1.2, space: 0x140505, nebula: [0x7a1a0e, 0xff5522], decor: 'plasma', fx: 'lightning', bpm: 128, duration: 100, boss: 'hydra', bossName: 'HYDRA-TWIN', waves: ['vformation', 'pincer', 'shooters', 'stream'], unlock: 'spreader', threat: 'NUEVO: GUNSHIP NARANJA · ABANICO', threatEn: 'NEW: ORANGE GUNSHIP · SPREAD FAN' },
  { id: 5, name: 'THE MINEFIELD', palette: 'steel', hue: 0, sat: 0.35, space: 0x040406, nebula: [0x1a1a24, 0x33334a], decor: 'buoys', fx: null, bpm: 128, duration: 105, boss: 'miner', bossName: 'DREAD-MINER', waves: ['mines', 'stream', 'shooters', 'vformation'], unlock: 'splitter', threat: 'NUEVO: ARANA VERDE · SE DIVIDE', threatEn: 'NEW: GREEN SPIDER · SPLITS ON DEATH' },
  { id: 6, name: 'QUANTUM RIFT', palette: 'rift', hue: 180, sat: 1, space: 0x03101a, nebula: [0x0f4a63, 0x3dfcff], decor: null, fx: 'distortion', bpm: 128, duration: 105, boss: 'phantom', bossName: 'PHANTOM-CRUISER', waves: ['pincer', 'vformation', 'shooters', 'swarm'], unlock: 'blinker', threat: 'NUEVO: DRON PURPURA · TELETRANSPORTE', threatEn: 'NEW: PURPLE DRONE · TELEPORTS' },
  { id: 7, name: 'GAS GIANT RINGS', palette: 'gold', hue: 110, sat: 1, space: 0x061208, nebula: [0x1f6b52, 0xffcf40], decor: 'rings', fx: null, bpm: 128, duration: 110, boss: 'carrier', bossName: 'SOLARIS-CARRIER', waves: ['swarm', 'stream', 'asteroids', 'vformation'], unlock: 'kamikaze', threat: 'NUEVO: ENJAMBRE AMARILLO · KAMIKAZE', threatEn: 'NEW: YELLOW SWARM · KAMIKAZE RAM' },
  { id: 8, name: 'HYPERION OUTPOST', palette: 'steel', hue: 0, sat: 0.15, space: 0x07080c, nebula: [0x2a3040, 0x6e7686], decor: 'structures', fx: null, bpm: 140, duration: 110, boss: 'behemoth', bossName: 'BEHEMOTH-LASER', waves: ['shooters', 'pincer', 'vformation', 'mines'], unlock: 'laser', threat: 'NUEVO: GUNSHIP CIAN · LASER', threatEn: 'NEW: CYAN GUNSHIP · BEAM LASER' },
  { id: 9, name: 'EVENT HORIZON', palette: 'mono', hue: 0, sat: 0, space: 0x000000, nebula: [0x2a2a2a, 0x9a9a9a], decor: null, fx: 'gravity', bpm: 140, duration: 115, boss: 'titan', bossName: 'GRAVITY-TITAN', waves: ['swarm', 'pincer', 'mines', 'shooters', 'vformation'], unlock: null, threat: 'TODAS LAS AMENAZAS', threatEn: 'ALL THREATS ACTIVE' },
  { id: 10, name: 'THE MOTHER CORE', palette: 'cyber', hue: -60, sat: 1.2, space: 0x0a0414, nebula: [0x4a1670, 0x3dfcff], decor: 'structures', fx: 'pulse', bpm: 145, duration: 120, boss: 'leviathan', bossName: 'OMNI-LEVIATHAN', waves: ['swarm', 'pincer', 'shooters', 'mines', 'vformation', 'asteroids'], unlock: null, threat: 'ULTIMA BATALLA', threatEn: 'FINAL SHOWDOWN' },
];

export function levelThreat(level: LevelDef): string {
  return getLanguage() === 'en' ? level.threatEn : level.threat;
}

export type PerkKind = 'engine' | 'plasma' | 'nanotech' | 'magazine';

export const PERKS: Record<PerkKind, { title: string; desc: string; titleEn: string; descEn: string }> = {
  engine: { title: 'OVERCLOCK MOTORES', desc: '+15% VELOCIDAD', titleEn: 'ENGINE OVERCLOCK', descEn: '+15% SPEED' },
  plasma: { title: 'CONDENSADOR PLASMA', desc: '+10% CADENCIA', titleEn: 'PLASMA CAPACITOR', descEn: '+10% FIRE RATE' },
  nanotech: { title: 'PLACAS NANOTEC', desc: '+1 VIDA', titleEn: 'NANOTECH PLATING', descEn: '+1 LIFE' },
  magazine: { title: 'CARGADOR EXTENDIDO', desc: '+1 PROYECTIL', titleEn: 'EXTENDED MAGAZINE', descEn: '+1 PROJECTILE' },
};

export function perkInfo(p: PerkKind): { title: string; desc: string } {
  const isEn = getLanguage() === 'en';
  return {
    title: isEn ? PERKS[p].titleEn : PERKS[p].title,
    desc: isEn ? PERKS[p].descEn : PERKS[p].desc,
  };
}

export interface CampaignState {
  difficulty: string;
  /** Player ship chosen in the hangar (older saves default to vanguard). */
  ship?: ShipId;
  level: number;      // 1..10
  score: number;      // score at the start of `level`
  lives: number;
  perks: Record<PerkKind, number>;
}

const SAVE_KEY = 'ss_campaign';
export const START_LIVES = 5;
export const MAX_LIVES = 9;

export const newCampaign = (difficulty: string, ship: ShipId = 'vanguard'): CampaignState => ({
  difficulty, ship, level: 1, score: 0, lives: SHIPS[ship].lives,
  perks: { engine: 0, plasma: 0, nanotech: 0, magazine: 0 },
});

export const levelDef = (level: number): LevelDef => LEVELS[Math.min(Math.max(level, 1), LEVELS.length) - 1];

const BASE_ROSTER: EnemyKind[] = ['drone', 'weaver', 'gunship'];

/** Enemies available in a sector: the starters plus every unlock so far. */
export const roster = (level: number): EnemyKind[] =>
  [...BASE_ROSTER, ...LEVELS.slice(0, level).map(l => l.unlock).filter((k): k is EnemyKind => !!k)];

/** Three distinct random perks to choose from. */
export function rollPerks(rnd = Math.random): PerkKind[] {
  const all = Object.keys(PERKS) as PerkKind[];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 3);
}

export function applyPerk(state: CampaignState, perk: PerkKind): CampaignState {
  const next = { ...state, perks: { ...state.perks, [perk]: state.perks[perk] + 1 } };
  if (perk === 'nanotech') next.lives = Math.min(MAX_LIVES, next.lives + 1);
  return next;
}

export function saveCampaign(state: CampaignState): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

export function loadCampaign(): CampaignState | null {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return s && typeof s.level === 'number' && s.perks ? s : null;
  } catch {
    return null;
  }
}

export function clearCampaign(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
