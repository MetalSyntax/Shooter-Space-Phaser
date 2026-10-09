/**
 * Zero-asset pixel art: sprites are built at runtime as palette-indexed grids
 * (mirrored for bilateral symmetry, shaded and outlined) and baked into canvas textures.
 * Grid logic is Phaser-free so it can be tested in Node.
 */
import type Phaser from 'phaser';
import type { EncodedSprite } from './OriginalSprites.ts';

/** Grid cells hold palette roles; 0 = transparent. */
export type Grid = number[][];
export const EMPTY = 0, OUTLINE = 1, SHADOW = 2, BODY = 3, LIGHT = 4, CORE = 5, ENGINE = 6, ACCENT = 7;

/** colors[role] for roles 1..7. */
export type Palette = number[];

export const PALETTES: Record<string, Palette> = {
  player:   [0, 0x05070f, 0x1d3a8a, 0x3f6fe0, 0xdfe8ff, 0x5cf2ff, 0xff9a2e, 0xff3b3b],
  military: [0, 0x070b14, 0x1f3a5f, 0x3d6a99, 0x9fb4c8, 0x40e0ff, 0xff9933, 0x6b7a8f],
  nebula:   [0, 0x0d0614, 0x3d1a66, 0x7a3ac9, 0xd6a8ff, 0xff5cf0, 0xffb347, 0x40e0ff],
  copper:   [0, 0x120a05, 0x5a3218, 0xa8642e, 0xf0b27a, 0x5cf2ff, 0xff7a2e, 0x7d7d7d],
  volcanic: [0, 0x1a0805, 0x6b1e0e, 0xb5401c, 0xf08a3c, 0xffe14d, 0xff5522, 0x7a3a22],
  toxic:    [0, 0x050d07, 0x2e1a47, 0x2f8f4e, 0x7cff9b, 0xc6ff3d, 0xb04dff, 0x5a2d82],
  rift:     [0, 0x03121a, 0x0f4a63, 0x1c8fb3, 0x9ff6ff, 0xffffff, 0x3dfcff, 0x7a35ff],
  gold:     [0, 0x0f0c03, 0x6b5310, 0x2f8f4e, 0xffe08a, 0x9dff6e, 0xffb000, 0x1f6b52],
  steel:    [0, 0x08090c, 0x3a3f4a, 0x6e7686, 0xc9d1de, 0xff3344, 0xff9933, 0xffd23d],
  mono:     [0, 0x000000, 0x3a3a3a, 0x8a8a8a, 0xf2f2f2, 0xffffff, 0xbbbbbb, 0x5a5a5a],
  cyber:    [0, 0x10061a, 0x4a1670, 0xc0209f, 0xff7ae0, 0x3dfcff, 0xffffff, 0x7a35ff],
  rock:     [0, 0x0b0907, 0x3e3329, 0x6e5e4c, 0xa89880, 0x6e5e4c, 0x3e3329, 0x8a7a66],
};

// --- PRNG ---

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// --- Grid helpers ---

export const makeGrid = (w: number, h: number): Grid => Array.from({ length: h }, () => new Array(w).fill(EMPTY));

/** Copies the left half onto the right half (bilateral symmetry). */
export function mirror(g: Grid): Grid {
  const w = g[0].length;
  return g.map(row => row.map((v, x) => (x < Math.ceil(w / 2) ? v : row[w - 1 - x])));
}

export const flipV = (g: Grid): Grid => [...g].reverse().map(r => [...r]);

/** Rotates 90° clockwise: a sprite drawn nose-up ends up nose-right (Phaser angle 0). */
export function rotateCW(g: Grid): Grid {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, y) => Array.from({ length: h }, (_, x) => g[h - 1 - x][y]));
}

/** Keeps only cells 4-connected to (sx, sy) so no pixels float loose. */
export function keepConnected(g: Grid, sx: number, sy: number): Grid {
  const h = g.length, w = g[0].length;
  const out = makeGrid(w, h);
  if (!g[sy]?.[sx]) return g;
  const stack = [[sx, sy]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= w || y >= h || !g[y][x] || out[y][x]) continue;
    out[y][x] = g[y][x];
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}

/** Highlights top edges and shades bottom edges of BODY cells. */
export function shade(g: Grid): Grid {
  return g.map((row, y) => row.map((v, x) => {
    if (v !== BODY) return v;
    if (!g[y - 1]?.[x]) return LIGHT;
    if (!g[y + 1]?.[x]) return SHADOW;
    return v;
  }));
}

/** Pads by 1 and adds a dark 1-px perimeter outline for contrast against space. */
export function outline(g: Grid): Grid {
  const h = g.length + 2, w = g[0].length + 2;
  const p = makeGrid(w, h);
  g.forEach((row, y) => row.forEach((v, x) => { p[y + 1][x + 1] = v; }));
  return p.map((row, y) => row.map((v, x) => {
    if (v) return v;
    const near = p[y - 1]?.[x] || p[y + 1]?.[x] || row[x - 1] || row[x + 1];
    return near ? OUTLINE : EMPTY;
  }));
}

/** Parses a half-sprite mask: '.' empty, '#' body, 'o' core, 'e' engine, 'a' accent. */
export function fromMask(lines: string[]): Grid {
  const map: Record<string, number> = { '.': EMPTY, '#': BODY, 'o': CORE, 'e': ENGINE, 'a': ACCENT, 's': SHADOW, 'l': LIGHT };
  return lines.map(l => [...l].map(c => map[c] ?? EMPTY));
}

/** Mirrors a left-half mask into a full symmetric grid (center column not duplicated when `odd`). */
export function mirrorMask(lines: string[], odd = true): Grid {
  const half = fromMask(lines);
  return half.map(row => [...row, ...[...row].reverse().slice(odd ? 1 : 0)]);
}

// --- Generators ---

/**
 * Random symmetric ship (nose up): spine is always solid, density falls off toward
 * the edges and the tail, then the shape is connected, shaded, lit and outlined.
 */
export function generateShip(seed: number, w = 12, h = 12, density = 0.85): Grid {
  const rnd = mulberry32(seed);
  const half = Math.ceil(w / 2);
  const g = makeGrid(w, h);
  const wingRow = Math.floor(h * (0.3 + rnd() * 0.4));
  const wingSpan = 1 + Math.floor(rnd() * 3); // rows
  const taper = 0.5 + rnd() * 0.6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < half; x++) {
      const fromCenter = (half - 1 - x) / half;        // 0 at spine, ~1 at edge
      const ny = y / (h - 1);
      if (x === half - 1 && y > 0) { g[y][x] = BODY; continue; }
      const nose = ny < 0.25 ? fromCenter * 2.2 : 0;    // pointy front
      const wing = Math.abs(y - wingRow) < wingSpan ? 0.6 : 0; // a wider wing band
      const p = density - fromCenter * taper * 1.4 - nose + wing - Math.abs(ny - 0.55) * 0.6;
      if (rnd() < p) g[y][x] = BODY;
    }
  }
  let s = keepConnected(mirror(g), half - 1, Math.floor(h / 2));
  s = shade(s);
  // Energy core in the middle of the spine, engines on the tail.
  const cy = Math.floor(h * 0.5);
  for (const x of [half - 1, w - half]) {
    if (s[cy][x]) s[cy][x] = CORE;
    let tail = h - 1;
    while (tail > 0 && !s[tail][x]) tail--;
    if (tail > 0) s[tail][x] = ENGINE;
  }
  if (rnd() < 0.6 && s[wingRow][1]) s[wingRow][1] = s[wingRow][w - 2] = ACCENT;
  return outline(s);
}

/** Lumpy, unsymmetric rock lit from the top-left, with craters. */
export function generateAsteroid(seed: number, size: number): Grid {
  const rnd = mulberry32(seed);
  const r = size / 2;
  const bumps = Array.from({ length: 8 }, () => 0.78 + rnd() * 0.22);
  const g = makeGrid(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r, dy = y + 0.5 - r;
      const a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2) * 8;
      const i = Math.floor(a) % 8;
      const edge = r * (bumps[i] + (bumps[(i + 1) % 8] - bumps[i]) * (a - Math.floor(a)));
      if (Math.hypot(dx, dy) < edge) g[y][x] = dx + dy < -r * 0.4 ? LIGHT : dx + dy > r * 0.5 ? SHADOW : BODY;
    }
  }
  for (let c = 0; c < Math.max(1, size / 8); c++) {
    const cx = Math.floor(r * 0.5 + rnd() * r), cy = Math.floor(r * 0.5 + rnd() * r);
    if (g[cy]?.[cx]) g[cy][cx] = SHADOW;
    if (g[cy]?.[cx + 1]) g[cy][cx + 1] = SHADOW;
  }
  return outline(g);
}

/** Round glowing orb (enemy bullets, mines, shield orbs). */
export function generateOrb(size: number, ring = false): Grid {
  const r = size / 2;
  const g = makeGrid(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
    if (d < r) g[y][x] = ring && d < r - 2 ? EMPTY : d < r * 0.45 ? CORE : d < r * 0.75 ? LIGHT : BODY;
  }
  return outline(g);
}

/** 5x5 glyphs for power-up icons. */
const GLYPHS: Record<string, string[]> = {
  shield:  ['.###.', '#...#', '#.#.#', '#...#', '.###.'],
  rapid:   ['..#..', '.##..', '#####', '..##.', '..#..'],
  bomb:    ['..#..', '.###.', '#####', '.###.', '..#..'],
  spread:  ['#.#.#', '#.#.#', '.###.', '..#..', '..#..'],
  missile: ['..#..', '.###.', '.###.', '#####', '#.#.#'],
  drone:   ['.#.#.', '#####', '.#o#.', '#####', '.#.#.'],
  magnet:  ['#...#', '#...#', '#...#', '#...#', '.###.'],
};

/** 11x11 orb with a glyph, then outlined. */
export function generateIcon(kind: string): Grid {
  const g = makeGrid(11, 11);
  for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
    const d = Math.hypot(x - 5, y - 5);
    if (d <= 5.4) g[y][x] = d > 4.4 ? LIGHT : BODY;
  }
  (GLYPHS[kind] ?? GLYPHS.bomb).forEach((row, y) => [...row].forEach((c, x) => {
    if (c !== '.') g[y + 3][x + 3] = c === 'o' ? ENGINE : CORE;
  }));
  return outline(g);
}

export const generateMissile = (): Grid => outline([
  [ENGINE, SHADOW, BODY, BODY, LIGHT, EMPTY],
  [ENGINE, BODY, BODY, BODY, LIGHT, CORE],
  [ENGINE, SHADOW, BODY, BODY, LIGHT, EMPTY],
]);

// --- Original v1 art ---

const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Turns an encoded original sprite into a grid + palette (palette[0] unused = transparent). */
export function decodeSprite(s: EncodedSprite): { grid: Grid; palette: Palette } {
  return {
    grid: s.rows.map(r => [...r].map(c => (c === '.' ? EMPTY : CHARS.indexOf(c) + 1))),
    palette: [0, ...s.palette],
  };
}

/** Rotates hue (degrees) and scales saturation of every palette color: one sprite, many factions. */
export function shiftPalette(p: Palette, hueDeg: number, sat = 1): Palette {
  if (!hueDeg && sat === 1) return p;
  return p.map((c, i) => {
    if (i === 0) return c;
    let r = (c >> 16 & 255) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h /= 6;
    }
    h = ((h + hueDeg / 360) % 1 + 1) % 1;
    s = Math.min(1, s * sat);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    const f = (t: number) => {
      t = (t + 1) % 1;
      return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp;
    };
    [r, g, b] = s === 0 ? [l, l, l] : [f(h + 1 / 3), f(h), f(h - 1 / 3)];
    return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
  });
}

/** Cuts a rectangle out of a sprite (used to derive new hull variants from the originals). */
export const crop = (g: Grid, x: number, y: number, w: number, h: number): Grid =>
  g.slice(y, y + h).map(r => r.slice(x, x + w));

/** Halves (or more) the resolution by sampling, for miniature variants. */
export const downsample = (g: Grid, f: number): Grid =>
  g.filter((_, y) => y % f === 0).map(r => r.filter((_, x) => x % f === 0));

/** Blends every color toward `color` keeping its brightness: colors grey art with an ability color. */
export function tintPalette(p: Palette, color: number, amount: number): Palette {
  const cr = color >> 16 & 255, cg = color >> 8 & 255, cb = color & 255;
  return p.map((c, i) => {
    if (i === 0) return c;
    const r = c >> 16 & 255, g = c >> 8 & 255, b = c & 255;
    const luma = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
    // Lift dark pixels so near-black hulls still read as the ability color.
    const mix = (v: number, t: number) => Math.round(v + (Math.min(255, t * (0.3 + luma * 1.4)) - v) * amount);
    return (mix(r, cr) << 16) | (mix(g, cg) << 8) | mix(b, cb);
  });
}

// --- Rendering ---

/** Bakes a grid into a Phaser canvas texture (`cell` screen pixels per grid pixel). */
export function renderTexture(scene: Phaser.Scene, key: string, grid: Grid, palette: Palette, cell = 3): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const h = grid.length, w = grid[0].length;
  const tex = scene.textures.createCanvas(key, w * cell, h * cell)!;
  const ctx = tex.getContext();
  grid.forEach((row, y) => row.forEach((v, x) => {
    if (!v) return;
    ctx.fillStyle = `#${palette[v].toString(16).padStart(6, '0')}`;
    ctx.fillRect(x * cell, y * cell, cell, cell);
  }));
  tex.refresh();
}

/**
 * Tileable sector backdrop: chunky value-noise nebula in two colors plus stars.
 * Drawn on a coarse grid so it reads as pixel art when tiled.
 */
export function renderBackground(scene: Phaser.Scene, key: string, seed: number, space: number, nebula: [number, number], size = 256): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const rnd = mulberry32(seed);
  const tex = scene.textures.createCanvas(key, size, size)!;
  const ctx = tex.getContext();
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = hex(space);
  ctx.fillRect(0, 0, size, size);

  // Periodic value noise so the tile wraps seamlessly.
  const n = 8;
  const lattice = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd()));
  const cell = 4;
  for (let y = 0; y < size; y += cell) for (let x = 0; x < size; x += cell) {
    const fx = (x / size) * n, fy = (y / size) * n;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    const s = (t: number) => t * t * (3 - 2 * t);
    const v = (i: number, j: number) => lattice[(j + n) % n][(i + n) % n];
    const top = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * s(tx);
    const bot = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * s(tx);
    const val = top + (bot - top) * s(ty);
    if (val > 0.55) {
      // Quantized alpha steps keep the banded retro look.
      ctx.globalAlpha = Math.round((val - 0.55) * 6) / 6 * 0.35;
      ctx.fillStyle = hex(val > 0.72 ? nebula[1] : nebula[0]);
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 90; i++) {
    const big = rnd() < 0.12;
    ctx.fillStyle = rnd() < 0.2 ? hex(nebula[1]) : '#ffffff';
    ctx.globalAlpha = 0.4 + rnd() * 0.6;
    const x = Math.floor(rnd() * size / 2) * 2, y = Math.floor(rnd() * size / 2) * 2;
    ctx.fillRect(x, y, 2, 2);
    if (big) {
      ctx.fillRect(x - 2, y, 6, 2);
      ctx.fillRect(x, y - 2, 2, 6);
    }
  }
  ctx.globalAlpha = 1;
  tex.refresh();
}
