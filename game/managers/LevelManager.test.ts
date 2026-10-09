// Run: node game/managers/LevelManager.test.ts
import assert from 'node:assert/strict';
import { LEVELS, roster, SHOOTER_KINDS, newCampaign, applyPerk, rollPerks, saveCampaign, loadCampaign, clearCampaign, levelDef, MAX_LIVES } from './LevelManager.ts';

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};

assert.equal(LEVELS.length, 10);
assert.equal(new Set(LEVELS.map(l => l.boss)).size, 10, '10 distinct bosses');
LEVELS.forEach(l => assert.ok(l.duration >= 90 && l.duration <= 120, `${l.name} duration`));
assert.ok(LEVELS.every((l, i) => i === 0 || l.bpm >= LEVELS[i - 1].bpm), 'tempo never drops');
assert.equal(levelDef(99).id, 10);
assert.deepEqual(roster(1), ['drone', 'weaver', 'gunship']);
assert.ok(roster(2).includes('lancer') && !roster(2).includes('pod'));
assert.equal(new Set(roster(10)).size, 10, 'every kind unlocked by the end');
assert.ok(LEVELS.every(l => roster(l.id).some(k => SHOOTER_KINDS.includes(k))), 'every sector has shooters');

for (let i = 0; i < 20; i++) {
  const p = rollPerks();
  assert.equal(new Set(p).size, 3);
}

assert.equal(newCampaign('EASY', 'bulwark').lives, 7);
assert.equal(newCampaign('EASY').ship, 'vanguard');
let c = newCampaign('HARD');
c = applyPerk(c, 'nanotech');
assert.equal(c.lives, 6);
for (let i = 0; i < 10; i++) c = applyPerk(c, 'nanotech');
assert.equal(c.lives, MAX_LIVES);
c = applyPerk(c, 'magazine');
assert.equal(c.perks.magazine, 1);

assert.equal(loadCampaign(), null);
saveCampaign({ ...c, level: 4 });
assert.equal(loadCampaign()?.level, 4);
clearCampaign();
assert.equal(loadCampaign(), null);
store.ss_campaign = '{broken';
assert.equal(loadCampaign(), null);

console.log('LevelManager ok');
