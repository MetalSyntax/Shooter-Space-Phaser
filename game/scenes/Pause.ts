import Phaser from 'phaser';
import { synth } from '../utils/Synth';
import PixelButton, { pixelText, openOverlay } from '../ui/PixelButton';
import type { CampaignState } from '../managers/LevelManager';
import { loadScheme, saveScheme, nextScheme, SCHEMES } from '../ui/TouchControls';

/** Modal overlay launched on top of a paused MainGame. */
export default class Pause extends Phaser.Scene {
  private campaign!: CampaignState;

  constructor() {
    super('Pause');
  }

  init(data: { campaign: CampaignState }) {
    this.campaign = data.campaign;
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive();
    // Shrink rows on short (landscape phone) screens so all options fit.
    const btnH = Phaser.Math.Clamp(Math.round(Math.min(height * 0.08, (height - 140) / 7 - 10)), 30, 52);
    const btnW = Math.min(width - 32, 320);
    const gap = 10;
    const rows = this.sys.game.device.input.touch ? 7 : 6;
    const top = (height - rows * (btnH + gap)) / 2 + btnH / 2 + 24;
    this.add.text(width / 2, top - btnH - 24, 'PAUSA', pixelText(width < 400 ? 24 : 32, '#4dd9ff', { stroke: '#000', strokeThickness: 6 })).setOrigin(0.5);

    const resume = () => {
      this.scene.resume('MainGame');
      this.scene.stop();
    };
    const musicLabel = () => `♪ MUSICA: ${synth.musicMuted ? 'OFF' : 'ON'}`;
    const sfxLabel = () => `SFX: ${synth.sfxMuted ? 'OFF' : 'ON'}`;
    const ctrlLabel = () => `CONTROLES: ${SCHEMES[loadScheme()].label}`;

    const items: [string, (b: PixelButton) => void][] = [
      ['▶ REANUDAR', resume],
      ['REINICIAR', () => {
        this.scene.stop('MainGame');
        this.scene.start('MainGame', { campaign: this.campaign });
      }],
      [musicLabel(), b => { synth.setMusicMuted(!synth.musicMuted); b.setText(musicLabel()); }],
      [sfxLabel(), b => { synth.setSfxMuted(!synth.sfxMuted); b.setText(sfxLabel()); }],
      // Mobile only: switch control scheme (applied when the game resumes).
      ...(this.sys.game.device.input.touch ? [[ctrlLabel(), (b: PixelButton) => { saveScheme(nextScheme(loadScheme())); b.setText(ctrlLabel()); }] as [string, (b: PixelButton) => void]] : []),
      ['GUIA', () => openOverlay(this, 'Guide')],
      ['MENU PRINCIPAL', () => {
        this.scene.stop('MainGame');
        this.scene.start('MainMenu');
      }],
    ];

    items.forEach(([label, action], i) => {
      const b: PixelButton = new PixelButton(this, label, () => action(b), i === 0 ? 0x4dd9ff : 0xffdd33)
        .layout(btnW, btnH, Math.min(btnH * 0.3, btnW / 16))
        .setPosition(width / 2, top + i * (btnH + gap));
      b.selected = i === 0;
      b.redraw();
    });

    this.input.keyboard?.on('keydown-ESC', resume);
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === 9) resume();
    });
  }
}
