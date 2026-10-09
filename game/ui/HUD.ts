import Phaser from 'phaser';
import type { PowerKind } from '../entities/Player';
import { POWER_DURATIONS } from '../entities/Player';
import { COMBO_WINDOW } from '../managers/ScoreManager';
import PixelButton, { PIXEL_FONT } from './PixelButton';

const DEPTH = 900;
const POWER_ICONS: Record<PowerKind, string> = {
  shield: 'powerup_shield', rapid: 'powerup_rapid', spread: 'powerup_spread',
  missile: 'powerup_missile', drone: 'powerup_drone', magnet: 'powerup_magnet',
};
const TEXT = { fontFamily: PIXEL_FONT, color: '#ffffff', stroke: '#000000', strokeThickness: 4 };

/** Score, combo bar, ship-icon lives, power-up timers, boss bar and announcements. */
export default class HUD {
  private scoreText: Phaser.GameObjects.Text;
  private hiText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private bars: Phaser.GameObjects.Graphics;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private powerIcons = new Map<PowerKind, Phaser.GameObjects.Image>();
  private pauseBtn: PixelButton;
  private bossLabel?: Phaser.GameObjects.Text;
  private bossName = '';
  private bombText: Phaser.GameObjects.Text;
  private livesExtra: Phaser.GameObjects.Text;
  private bossFrac = -1;

  constructor(private scene: Phaser.Scene, difficulty: string, best: number, onPause: () => void, private shipTexture = 'ship') {
    const fix = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => o.setScrollFactor(0).setDepth(DEPTH);
    this.scoreText = fix(scene.add.text(20, 16, 'SCORE 0', { ...TEXT, fontSize: '16px' }));
    this.hiText = fix(scene.add.text(20, 40, `HI ${best} · ${difficulty}`, { ...TEXT, fontSize: '8px', color: '#aaaaaa' }));
    this.comboText = fix(scene.add.text(20, 60, '', { ...TEXT, fontSize: '8px', color: '#ffdd33' }));
    this.bars = fix(scene.add.graphics());
    this.livesExtra = fix(scene.add.text(0, 24, '', { ...TEXT, fontSize: '8px' }).setOrigin(1, 0));
    this.bombText = fix(scene.add.text(0, 52, '', { ...TEXT, fontSize: '8px', color: '#66ccff' }).setOrigin(1, 0));
    this.pauseBtn = fix(new PixelButton(scene, 'II', onPause, 0x4dd9ff).layout(40, 36, 12));
    (Object.keys(POWER_ICONS) as PowerKind[]).forEach(kind => {
      this.powerIcons.set(kind, fix(scene.add.image(0, 0, POWER_ICONS[kind]).setDisplaySize(26, 26).setVisible(false)));
    });
  }

  setScore(score: number): void {
    this.scoreText.setText(`SCORE ${score}`);
    this.scene.tweens.add({ targets: this.scoreText, scale: 1.15, duration: 60, yoyo: true });
  }

  setLives(lives: number): void {
    this.livesExtra.setText(lives > 5 ? `+${lives - 5}` : '');
    lives = Math.min(lives, 5);
    while (this.lifeIcons.length > lives) this.lifeIcons.pop()!.destroy();
    while (this.lifeIcons.length < lives) {
      this.lifeIcons.push(this.scene.add.image(0, 0, this.shipTexture).setAngle(-90).setDisplaySize(22, 22).setScrollFactor(0).setDepth(DEPTH));
    }
    this.layout();
    this.lifeIcons.forEach(i => i.setTint(lives === 1 ? 0xff4444 : 0xffffff));
  }

  layout(): void {
    const { width } = this.scene.scale;
    this.pauseBtn.setPosition(width - 12 - 20, 12 + 18);
    const right = width - 12 - 40 - 20;
    this.bombText.setX(width - 12);
    const shift = this.livesExtra.text ? 28 : 0;
    this.livesExtra.setX(right + 12);
    this.lifeIcons.forEach((icon, i) => icon.setPosition(right - shift - i * 26, 30));
  }

  /** Draws per-frame elements: combo timer, power-up rings and boss bar. */
  setBombs(n: number): void {
    this.bombText.setText(`HYPER BOMB x${n}`);
  }

  /** `sectorProgress` 0..1 until the boss alarm (negative hides the bar). */
  update(combo: { mult: number; timer: number }, powers: Partial<Record<PowerKind, number>>, sectorProgress = -1): void {
    const g = this.bars.clear();

    if (sectorProgress >= 0) {
      const { width } = this.scene.scale;
      const w = Math.min(width * 0.3, 200);
      const x = width / 2 - w / 2;
      g.fillStyle(0x000000, 0.5).fillRect(x, 34, w, 4);
      g.fillStyle(0xff4455, 1).fillRect(x, 34, w * sectorProgress, 4);
      g.fillStyle(0xff4455, 1).fillRect(x + w - 2, 31, 4, 10); // boss marker
    }

    this.comboText.setText(combo.timer > 0 && combo.mult > 1 ? `COMBO x${combo.mult.toFixed(1)}` : '');
    if (combo.timer > 0) {
      g.fillStyle(0x000000, 0.5).fillRect(20, 80, 120, 5);
      g.fillStyle(0xffdd33, 1).fillRect(20, 80, 120 * (combo.timer / COMBO_WINDOW), 5);
    }

    let i = 0;
    this.powerIcons.forEach((icon, kind) => {
      const left = powers[kind] ?? 0;
      icon.setVisible(left > 0);
      if (left <= 0) return;
      const x = 36 + i * 40;
      const y = 112;
      icon.setPosition(x, y).setAlpha(left < 1500 && Math.floor(left / 150) % 2 ? 0.4 : 1);
      g.lineStyle(3, 0x333333, 0.8).strokeCircle(x, y, 17);
      g.lineStyle(3, 0x00ffcc, 1).beginPath()
        .arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, left / POWER_DURATIONS[kind]), false)
        .strokePath();
      i++;
    });

    if (this.bossFrac >= 0) {
      const { width } = this.scene.scale;
      const w = Math.min(width * 0.6, 420);
      const x = width / 2 - w / 2;
      const y = 58;
      const color = this.bossFrac > 0.5 ? 0xff9900 : 0xff2222;
      g.fillStyle(0x000000, 0.6).fillRect(x, y, w, 12);
      g.fillStyle(color, 1).fillRect(x, y, w * this.bossFrac, 12);
      g.lineStyle(2, 0xffffff, 1).strokeRect(x, y, w, 12);
      g.lineStyle(2, 0xffffff, 0.8).lineBetween(x + w / 2, y - 3, x + w / 2, y + 15); // phase-2 threshold
      this.bossLabel?.setPosition(width / 2, y - 4);
    }
  }

  setBossHealth(frac: number): void {
    this.bossFrac = frac;
    this.bossLabel ??= this.scene.add.text(0, 0, this.bossName, { ...TEXT, fontSize: '8px', color: '#ffaaaa' })
      .setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH);
  }

  announce(text: string, color = '#00ffff', size?: number): void {
    const { width, height } = this.scene.scale;
    const t = this.scene.add.text(width / 2, height * 0.4, text, { ...TEXT, fontSize: `${size ? (width < 500 ? 8 : size) : width < 500 ? 16 : 24}px`, color, strokeThickness: 6, align: 'center', wordWrap: { width: width - 32 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH).setAlpha(0).setScale(0.6);
    this.scene.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 300, ease: 'Back.Out', hold: 900, yoyo: true, onComplete: () => t.destroy() });
  }

  /** Red pulsing overlay + flashing warning text for the boss entrance. */
  showBossWarning(ms: number, name: string): void {
    this.bossName = name;
    const { width, height } = this.scene.scale;
    const overlay = this.scene.add.rectangle(0, 0, width, height, 0xff0000, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH - 1);
    const text = this.scene.add.text(width / 2, height * 0.4, `WARNING\n${name}\nAPPROACHING`, {
      ...TEXT, fontSize: `${width < 600 ? 12 : 24}px`, lineSpacing: 12, color: '#ff3333', align: 'center', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH);
    const repeats = Math.floor(ms / 500) - 1;
    this.scene.tweens.add({ targets: overlay, fillAlpha: 0.25, duration: 250, yoyo: true, repeat: repeats });
    this.scene.tweens.add({
      targets: text, alpha: 0.2, duration: 250, yoyo: true, repeat: repeats,
      onComplete: () => { overlay.destroy(); text.destroy(); this.setBossHealth(1); },
    });
  }
}
