/** Score, combo multiplier and local high-score persistence. No Phaser dependency so it can be tested in Node. */
export interface HighScore {
  score: number;
  date: string;
  difficulty: string;
}

const HS_KEY = 'ss_highscores';
const MAX_SCORES = 10;
export const COMBO_WINDOW = 2500; // ms to chain the next kill
const TIERS = [
  { kills: 15, mult: 3 },
  { kills: 8, mult: 2 },
  { kills: 3, mult: 1.5 },
];

export default class ScoreManager {
  score = 0;
  comboKills = 0;
  comboTimer = 0;

  private difficultyMulti: number;

  constructor(difficultyMulti = 1, initialScore = 0) {
    this.difficultyMulti = difficultyMulti;
    this.score = initialScore;
  }

  get multiplier(): number {
    return TIERS.find(t => this.comboKills >= t.kills)?.mult ?? 1;
  }

  /** Registers a kill and returns the points awarded plus whether the multiplier tier went up. */
  addKill(basePoints: number, crit = false): { points: number; tierUp: boolean } {
    const before = this.multiplier;
    this.comboKills++;
    this.comboTimer = COMBO_WINDOW;
    const points = Math.round(basePoints * this.difficultyMulti * this.multiplier * (crit ? 2 : 1));
    this.score += points;
    return { points, tierUp: this.multiplier > before };
  }

  addPoints(basePoints: number): number {
    const points = Math.round(basePoints * this.difficultyMulti);
    this.score += points;
    return points;
  }

  resetCombo(): void {
    this.comboKills = 0;
    this.comboTimer = 0;
  }

  update(delta: number): void {
    if (this.comboTimer <= 0) return;
    this.comboTimer -= delta;
    if (this.comboTimer <= 0) this.resetCombo();
  }

  static loadHighScores(): HighScore[] {
    try {
      const list = JSON.parse(localStorage.getItem(HS_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  static best(): HighScore | undefined {
    return ScoreManager.loadHighScores()[0];
  }

  /** Saves the score and returns true if it is the new #1. */
  static submit(score: number, difficulty: string): boolean {
    const list = ScoreManager.loadHighScores();
    const isRecord = score > 0 && (list.length === 0 || score > list[0].score);
    if (score > 0) {
      list.push({ score, difficulty, date: new Date().toLocaleDateString('sv') });
      list.sort((a, b) => b.score - a.score);
      try { localStorage.setItem(HS_KEY, JSON.stringify(list.slice(0, MAX_SCORES))); } catch { /* ignore */ }
    }
    return isRecord;
  }
}
