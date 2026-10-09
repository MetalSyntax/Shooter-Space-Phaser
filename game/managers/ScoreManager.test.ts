// Run: node game/managers/ScoreManager.test.ts
import assert from 'node:assert/strict';
import ScoreManager, { COMBO_WINDOW } from './ScoreManager.ts';

const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
};

const sm = new ScoreManager(2);
assert.equal(sm.addKill(10).points, 20);
sm.addKill(10);
const third = sm.addKill(10);
assert.equal(third.tierUp, true);
assert.equal(sm.multiplier, 1.5);
assert.equal(third.points, 30);
assert.equal(sm.addKill(10, true).points, 60);

sm.update(COMBO_WINDOW + 1);
assert.equal(sm.multiplier, 1);
for (let i = 0; i < 15; i++) sm.addKill(10);
assert.equal(sm.multiplier, 3);
sm.resetCombo();
assert.equal(sm.multiplier, 1);

assert.equal(ScoreManager.submit(0, 'EASY'), false);
assert.equal(ScoreManager.submit(100, 'EASY'), true);
assert.equal(ScoreManager.submit(50, 'HARD'), false);
assert.equal(ScoreManager.submit(200, 'HARD'), true);
assert.deepEqual(ScoreManager.loadHighScores().map(h => h.score), [200, 100, 50]);
assert.equal(ScoreManager.best()?.difficulty, 'HARD');

console.log('ScoreManager ok');
