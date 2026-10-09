// Run: node game/generators/generators.test.ts  (prints ASCII previews + asserts symmetry/outline)
import assert from 'node:assert/strict';
import { generateShip, generateAsteroid, generateIcon, decodeSprite, shiftPalette, crop, downsample, tintPalette, EMPTY, OUTLINE, type Grid } from './PixelArtGenerator.ts';
import * as Original from './OriginalSprites.ts';

const chars = ' #s=+o*a';
const show = (g: Grid) => g.map(r => r.map(v => chars[v]).join('')).join('\n');
const symmetric = (g: Grid) => g.every(r => r.every((v, x) => v === r[r.length - 1 - x]));
const outlined = (g: Grid) => g.every((r, y) => r.every((v, x) => {
  if (v === EMPTY || v === OUTLINE) return true;
  // every non-outline pixel is fully enclosed (never touches the canvas border)
  return x > 0 && y > 0 && y < g.length - 1 && x < r.length - 1;
}));

for (let seed = 1; seed <= 50; seed++) {
  const s = generateShip(seed);
  assert.ok(symmetric(s), `ship ${seed} symmetric`);
  assert.ok(outlined(s), `ship ${seed} outlined`);
  assert.equal(s.length, 14);
  assert.ok(s.flat().filter(v => v > OUTLINE).length > 20, `ship ${seed} not too sparse`);
}
assert.deepEqual(generateShip(7), generateShip(7), 'deterministic');
// Original art decodes to rectangular grids whose indices stay inside the palette.
Object.entries(Original).forEach(([name, art]) => {
  const { grid, palette } = decodeSprite(art);
  assert.ok(grid.every(r => r.length === grid[0].length), `${name} rectangular`);
  assert.ok(grid.flat().every(v => v >= 0 && v < palette.length), `${name} indices`);
});
assert.equal(decodeSprite(Original.boss).grid[0].length, 70);

// Hue shift: identity at 0/360°, red -> green at +120°, grey at sat 0.
const pal = [0, 0xff0000, 0x336699];
assert.deepEqual(shiftPalette(pal, 0), pal);
assert.deepEqual(shiftPalette(pal, 360), pal);
assert.equal(shiftPalette(pal, 120)[1], 0x00ff00);
const grey = shiftPalette(pal, 0, 0)[2];
assert.ok(((grey >> 16) & 255) === (grey & 255), 'desaturated');
assert.ok(outlined(generateAsteroid(3, 16)));
assert.ok(symmetric(generateIcon('shield')));

// Variant helpers
const boss = decodeSprite(Original.boss).grid;
const mini = downsample(boss, 2);
assert.equal(mini.length, Math.ceil(boss.length / 2));
assert.equal(mini[0].length, Math.ceil(boss[0].length / 2));
const c = crop(boss, 10, 5, 20, 15);
assert.equal(c.length, 15);
assert.equal(c[0].length, 20);
assert.equal(c[0][0], boss[5][10]);
const tinted = tintPalette([0, 0x808080, 0xffffff], 0x3d7bff, 1);
assert.ok((tinted[1] & 255) > (tinted[1] >> 16 & 255), 'grey becomes blue-ish');
assert.equal(tintPalette([0, 0x123456], 0xff0000, 0)[1], 0x123456, 'amount 0 = identity');

import { generateBossHull, type BossKind } from './BossGenerator.ts';

const bossKinds: BossKind[] = ['goliath', 'viper', 'aegis', 'hydra', 'miner', 'phantom', 'carrier', 'behemoth', 'titan', 'leviathan'];
bossKinds.forEach(kind => {
  const hull = generateBossHull(kind);
  assert.ok(hull.length > 50, `${kind} height`);
  assert.ok(hull[0].length > 40, `${kind} width`);
  assert.ok(hull.flat().some(v => v > 0), `${kind} has pixels`);
});

if (process.argv.includes('--show')) {
  [3, 11, 24].forEach(s => console.log(show(generateShip(s)) + '\n'));
}
console.log('generators ok');

