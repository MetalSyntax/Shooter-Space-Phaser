import Phaser from 'phaser';
import { synth } from '../utils/Synth';
import PixelButton, { pixelText, pixelTitle, sizeTitle } from '../ui/PixelButton';
import { CampaignState, LevelDef, PERKS, PerkKind, applyPerk, rollPerks, saveCampaign, levelDef } from '../managers/LevelManager';
import type { SectorStats } from './MainGame';

/** "SECTOR CLEARED": stats summary, then pick 1 of 3 sector upgrades and jump to the next sector. */
export default class LevelClear extends Phaser.Scene {
  private campaign!: CampaignState;
  private stats!: SectorStats;
  private level!: LevelDef;

  constructor() {
    super('LevelClear');
  }

  init(data: { campaign: CampaignState; stats: SectorStats; level: LevelDef }) {
    this.campaign = data.campaign;
    this.stats = data.stats;
    this.level = data.level;
  }

  create() {
    synth.playVictoryMusic();
    const next = levelDef(this.level.id + 1);
    const bg = this.add.tileSprite(0, 0, 1, 1, `bg_${next.id}`).setOrigin(0).setAlpha(0.6);
    const title = pixelTitle(this, 'SECTOR CLEARED', '#9dffb0', '#22cc55', '#06351a');
    const sub = this.add.text(0, 0, `${this.level.name} · ${this.level.bossName} DESTRUIDO`, pixelText(8, '#c8d0e8')).setOrigin(0.5);

    const { kills, accuracy, bonus } = this.stats;
    const lines = [
      `ENEMIGOS   ${kills}`,
      `PRECISION  ${Math.round(accuracy * 100)}%`,
      `BONUS     +${bonus}`,
      `PUNTOS     ${this.campaign.score}`,
    ];
    // Count the stat lines in one at a time.
    const stats = this.add.text(0, 0, '', pixelText(12, '#ffffff', { lineSpacing: 10 })).setOrigin(0.5, 0);
    lines.forEach((_, i) => this.time.delayedCall(250 * (i + 1), () => {
      stats.setText(lines.slice(0, i + 1).join('\n'));
      synth.playCombo(0);
    }));

    const pickLabel = this.add.text(0, 0, 'ELIGE UNA MEJORA DE SECTOR', pixelText(12, '#ffdd33')).setOrigin(0.5);
    const perks = rollPerks();
    const cards = perks.map((perk, i) => {
      const card = new PixelButton(this, `${i + 1}. ${PERKS[perk].title}\n${PERKS[perk].desc}`, () => this.choose(perk), 0x4dd9ff);
      card.setAlpha(0);
      this.tweens.add({ targets: card, alpha: 1, delay: 1300 + i * 150, duration: 250 });
      return card;
    });
    const nextText = this.add.text(0, 0, `SIGUIENTE: SECTOR ${next.id} · ${next.name}`, pixelText(8, '#8892b0')).setOrigin(0.5);

    const kb = this.input.keyboard;
    perks.forEach((perk, i) => kb?.on(`keydown-${['ONE', 'TWO', 'THREE'][i]}`, () => this.choose(perk)));

    const layout = (width: number, height: number) => {
      const col = Math.min(width - 32, 520);
      bg.setSize(width, height);
      sizeTitle(title, Math.min(col / 15, height * 0.07, 40));
      title.setPosition(width / 2, height * 0.08 + title.height / 2);
      sub.setPosition(width / 2, title.y + title.height / 2 + 16);
      stats.setStyle(pixelText(col < 400 ? 8 : 12, '#ffffff', { lineSpacing: 10 })).setPosition(width / 2, sub.y + 24);
      // Measure with every line so the layout doesn't jump while the stats count in.
      const shown = stats.text;
      const statsH = stats.setText(lines.join('\n')).height;
      stats.setText(shown);
      const statsBottom = stats.y + statsH + 8;
      pickLabel.setStyle(pixelText(col < 400 ? 8 : 12, '#ffdd33')).setPosition(width / 2, statsBottom + 16);
      const cardH = Phaser.Math.Clamp(Math.round(height * 0.085), 44, 64);
      cards.forEach((c, i) => c.layout(col, cardH, Math.min(cardH * 0.22, col / 26)).setPosition(width / 2, pickLabel.y + 24 + cardH / 2 + i * (cardH + 10)));
      nextText.setPosition(width / 2, Math.min(height - 20, pickLabel.y + 24 + 3 * (cardH + 10) + 12));
    };
    layout(this.scale.width, this.scale.height);
    const onResize = (size: Phaser.Structs.Size) => layout(size.width, size.height);
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  private choose(perk: PerkKind) {
    if (!this.scene.isActive()) return;
    synth.playPowerUp();
    const next = { ...applyPerk(this.campaign, perk), level: this.level.id + 1 };
    saveCampaign(next);
    synth.stopMusic();
    this.scene.start('MainGame', { campaign: next });
  }
}
