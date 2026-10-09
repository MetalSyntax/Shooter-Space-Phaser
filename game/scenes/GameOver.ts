import Phaser from 'phaser';
import { synth } from '../utils/Synth';
import ScoreManager from '../managers/ScoreManager';
import PixelButton, { pixelText, pixelTitle, sizeTitle } from '../ui/PixelButton';
import type { CampaignState } from '../managers/LevelManager';
import { DifficultyLabels, DifficultyLevel } from './MainMenu';

interface ResultData {
  score: number;
  difficulty?: string;
  newRecord?: boolean;
  /** Sector auto-save to retry from (absent after the final victory). */
  campaign?: CampaignState;
}

/** Results screen with local high-score table. Victory reuses it with a different title and music. */
export default class GameOver extends Phaser.Scene {
  private data_!: ResultData;

  constructor(key = 'GameOver', private titleText = 'GAME OVER', private colors: [string, string, string] = ['#ff8a8a', '#ff1a1a', '#4a0000']) {
    super(key);
  }

  init(data: ResultData) {
    this.data_ = { score: data.score ?? 0, difficulty: data.difficulty ?? 'MEDIUM', newRecord: data.newRecord, campaign: data.campaign };
  }

  protected playMusic() {
    synth.playGameOverMusic();
  }

  create() {
    const { score, difficulty, newRecord, campaign } = this.data_;

    const background = this.add.tileSprite(0, 0, 1, 1, `bg_${campaign?.level ?? 10}`).setOrigin(0).setAlpha(0.5);
    const title = pixelTitle(this, this.titleText, ...this.colors);
    const scoreText = this.add.text(0, 0, `PUNTOS ${score}`, pixelText(16)).setOrigin(0.5);
    const record = this.add.text(0, 0, newRecord ? '¡NUEVO RECORD!' : '', pixelText(12, '#ffdd33')).setOrigin(0.5);
    if (newRecord) this.tweens.add({ targets: record, alpha: 0.3, duration: 400, yoyo: true, loop: -1 });

    // Top 5 local scores with date and difficulty
    const rows = ScoreManager.loadHighScores().slice(0, 5).map((h, i) =>
      `${i + 1}. ${String(h.score).padStart(6)} ${(DifficultyLabels[h.difficulty as DifficultyLevel] ?? h.difficulty).padEnd(7)} ${h.date}`);
    const table = this.add.text(0, 0, ['MEJORES PUNTUACIONES', '', ...rows].join('\n'), pixelText(8, '#aaccff', { lineSpacing: 8 })).setOrigin(0.5, 0);

    // Retry the same sector from its auto-save (with at least 3 lives), or a new run after victory.
    const restartGame = () => {
      synth.stopMusic();
      this.scene.start('MainGame', campaign ? { campaign: { ...campaign, lives: Math.max(campaign.lives, 3) } } : { difficulty });
    };
    const toMenu = () => this.scene.start('MainMenu');
    const restartBtn = new PixelButton(this, campaign ? `REINTENTAR S${campaign.level}` : 'JUGAR DE NUEVO', restartGame, 0x4dd9ff);
    restartBtn.selected = true;
    const menuBtn = new PixelButton(this, 'MENU', toMenu);

    const layout = (width: number, height: number) => {
      const col = Math.min(width - 32, 480);
      background.setSize(width, height);
      sizeTitle(title, Math.min(col / (this.titleText.length + 1.5), height * 0.09, 56));
      title.setPosition(width / 2, height * 0.1 + title.height / 2);
      const below = title.y + title.height / 2;
      scoreText.setStyle(pixelText(col < 400 ? 12 : 16)).setPosition(width / 2, below + height * 0.06);
      record.setPosition(width / 2, scoreText.y + 28);
      table.setStyle(pixelText(col < 400 ? 8 : 12, '#aaccff', { lineSpacing: 8 })).setPosition(width / 2, record.y + 24);
      const btnH = Phaser.Math.Clamp(Math.round(height * 0.09), 40, 60);
      const btnW = Math.min(col, 340);
      restartBtn.layout(btnW, btnH, Math.min(btnH * 0.34, btnW / 13)).setPosition(width / 2, height - 32 - btnH * 1.5 - 10);
      menuBtn.layout(btnW * 0.6, btnH * 0.8).setPosition(width / 2, height - 32 - btnH * 0.4);
    };
    layout(this.scale.width, this.scale.height);
    const onResize = (size: Phaser.Structs.Size) => layout(size.width, size.height);
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    this.input.keyboard?.on('keydown-SPACE', restartGame);
    this.input.keyboard?.on('keydown-ENTER', restartGame);
    this.input.keyboard?.on('keydown-ESC', toMenu);

    this.playMusic();
  }
}
