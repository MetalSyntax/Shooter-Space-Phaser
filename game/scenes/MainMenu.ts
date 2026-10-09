import Phaser from 'phaser';
import { synth } from '../utils/Synth';
import ScoreManager from '../managers/ScoreManager';
import PixelButton, { pixelText, pixelScale, pixelTitle, sizeTitle, openOverlay } from '../ui/PixelButton';
import { SHIPS, loadShip } from '../entities/Ships';
import { loadCampaign, clearCampaign, newCampaign, CampaignState } from '../managers/LevelManager';
import { loadScheme, saveScheme, nextScheme, SCHEMES } from '../ui/TouchControls';
import { t, getLanguage, setLanguage, Lang } from '../utils/i18n';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export const DifficultySettings = {
  EASY: { speedMultiplier: 1, spawnDelay: 1000, scoreMulti: 1 },
  MEDIUM: { speedMultiplier: 1.5, spawnDelay: 700, scoreMulti: 2 },
  HARD: { speedMultiplier: 2.0, spawnDelay: 400, scoreMulti: 3 }
};

export const DifficultyLabels = (): Record<DifficultyLevel, string> => ({
  EASY: t('easy'),
  MEDIUM: t('normal'),
  HARD: t('hard'),
});

const DIFFS: { key: DifficultyLevel; color: number; descKey: 'easyDesc' | 'normalDesc' | 'hardDesc' }[] = [
  { key: 'EASY', color: 0x33dd66, descKey: 'easyDesc' },
  { key: 'MEDIUM', color: 0xffcc33, descKey: 'normalDesc' },
  { key: 'HARD', color: 0xff4455, descKey: 'hardDesc' },
];

export default class MainMenu extends Phaser.Scene {
  private selectedDifficulty: DifficultyLevel = 'MEDIUM';
  private background!: Phaser.GameObjects.TileSprite;
  private stars: Phaser.GameObjects.Image[] = [];
  private title!: Phaser.GameObjects.Text;
  private saved: CampaignState | null = null;
  private continueBtn?: PixelButton;
  private controlsBtn?: PixelButton;
  private hangarBtn!: PixelButton;
  private guideBtn!: PixelButton;
  private subtitle!: Phaser.GameObjects.Text;
  private ship!: Phaser.GameObjects.Image;
  private shipBob?: Phaser.Tweens.Tween;
  private diffLabel!: Phaser.GameObjects.Text;
  private diffButtons: PixelButton[] = [];
  private diffDesc!: Phaser.GameObjects.Text;
  private startBtn!: PixelButton;
  private recordText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private musicBtn!: PixelButton;
  private sfxBtn!: PixelButton;
  private langBtn!: PixelButton;
  private fullscreenBtn?: PixelButton;

  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;
    const isTouch = this.sys.game.device.input.touch;

    // Same scrolling space backdrop as the game, plus twinkling stars.
    this.background = this.add.tileSprite(0, 0, width, height, 'bg_1').setOrigin(0).setAlpha(0.7);
    this.stars = Array.from({ length: 60 }, () => {
      const star = this.add.image(0, 0, 'star').setAlpha(Phaser.Math.FloatBetween(0.2, 0.8));
      this.tweens.add({ targets: star, alpha: 0.1, duration: Phaser.Math.Between(600, 1800), yoyo: true, loop: -1, delay: Phaser.Math.Between(0, 1500) });
      return star;
    });

    this.title = pixelTitle(this, 'SPACE SHOOTER', '#fff27a', '#ff9d00', '#b3160b');
    this.subtitle = this.add.text(0, 0, 'REMASTERED', pixelText(12, '#4dd9ff')).setOrigin(0.5);
    this.ship = this.add.image(0, 0, `ship_${loadShip()}`).setAngle(-90).setInteractive({ useHandCursor: true })
      .on('pointerup', () => openOverlay(this, 'Hangar'));

    this.diffLabel = this.add.text(0, 0, t('difficulty'), pixelText(12, '#8892b0')).setOrigin(0.5);
    this.diffButtons = DIFFS.map(d => new PixelButton(this, DifficultyLabels()[d.key], () => this.selectDifficulty(d.key), d.color));
    this.diffDesc = this.add.text(0, 0, '', pixelText(8, '#c8d0e8')).setOrigin(0.5);

    // Campaign: continue from the auto-saved sector, or start a new run.
    this.saved = loadCampaign();
    this.startBtn = new PixelButton(this, this.saved ? t('newGame') : t('play'), () => this.startGame(), 0x4dd9ff);
    if (this.saved) {
      const s = this.saved;
      this.continueBtn = new PixelButton(this, `${t('continue')} S${s.level}`, () => this.continueGame(), 0xffdd33);
      this.continueBtn.selected = true;
      this.tweens.add({ targets: this.continueBtn, alpha: 0.75, duration: 600, yoyo: true, loop: -1 });
    } else {
      this.startBtn.selected = true;
      this.tweens.add({ targets: this.startBtn, alpha: 0.75, duration: 600, yoyo: true, loop: -1 });
    }

    const best = ScoreManager.best();
    this.recordText = this.add.text(0, 0, best
      ? `${t('record')} ${best.score} · ${DifficultyLabels()[best.difficulty as DifficultyLevel] ?? best.difficulty}`
      : `${t('record')} --`, pixelText(12, '#ffdd33')).setOrigin(0.5);
    this.hintText = this.add.text(0, 0, isTouch ? '' : t('controlsHintDesktop'), pixelText(8, '#5a6488')).setOrigin(0.5);

    // Hangar (ship select) and the in-game guide; refresh the ship when the hangar closes.
    this.hangarBtn = new PixelButton(this, `${t('shipPrefix')} ${SHIPS[loadShip()].name}`, () => openOverlay(this, 'Hangar'), 0xffdd33);
    this.guideBtn = new PixelButton(this, t('guide'), () => openOverlay(this, 'Guide'), 0x4dd9ff);
    this.events.on('resume', () => {
      this.ship.setTexture(`ship_${loadShip()}`);
      this.hangarBtn.setText(`${t('shipPrefix')} ${SHIPS[loadShip()].name}`);
      this.refreshTexts();
    });

    // Mobile: pick a control scheme
    if (isTouch) {
      const label = () => `${t('controlsPrefix')} ${SCHEMES[loadScheme()].label}`;
      this.controlsBtn = new PixelButton(this, label(), () => {
        saveScheme(nextScheme(loadScheme()));
        this.controlsBtn!.setText(label());
      }, 0x66ccff);
    }

    // Top bar: separate music / sfx toggles + language toggle + fullscreen
    const musicLabel = () => `♪ ${synth.musicMuted ? 'OFF' : 'ON'}`;
    const sfxLabel = () => `SFX ${synth.sfxMuted ? 'OFF' : 'ON'}`;
    const langLabel = () => getLanguage().toUpperCase();

    this.musicBtn = new PixelButton(this, musicLabel(), () => { synth.setMusicMuted(!synth.musicMuted); this.musicBtn.setText(musicLabel()); });
    this.sfxBtn = new PixelButton(this, sfxLabel(), () => { synth.setSfxMuted(!synth.sfxMuted); this.sfxBtn.setText(sfxLabel()); });
    this.langBtn = new PixelButton(this, langLabel(), () => {
      setLanguage(getLanguage() === 'es' ? 'en' : 'es');
      this.langBtn.setText(langLabel());
      this.refreshTexts();
    }, 0x3dff6e);

    if (this.sys.game.device.fullscreen.available) {
      this.fullscreenBtn = new PixelButton(this, '⛶', () => {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      });
    }

    this.selectDifficulty(this.selectedDifficulty);

    const kb = this.input.keyboard;
    const primary = () => (this.saved ? this.continueGame() : this.startGame());
    kb?.on('keydown-ENTER', primary);
    kb?.on('keydown-SPACE', primary);
    const step = (dir: number) => {
      const i = DIFFS.findIndex(d => d.key === this.selectedDifficulty);
      this.selectDifficulty(DIFFS[Phaser.Math.Wrap(i + dir, 0, DIFFS.length)].key);
    };
    kb?.on('keydown-LEFT', () => step(-1));
    kb?.on('keydown-A', () => step(-1));
    kb?.on('keydown-RIGHT', () => step(1));
    kb?.on('keydown-D', () => step(1));

    this.resizeLayout(width, height);
    const onResize = (gameSize: Phaser.Structs.Size) => this.resizeLayout(gameSize.width, gameSize.height);
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    synth.playMenuMusic();
  }

  private refreshTexts() {
    this.diffLabel.setText(t('difficulty'));
    this.diffButtons.forEach((b, i) => b.setText(DifficultyLabels()[DIFFS[i].key]));
    this.startBtn.setText(this.saved ? t('newGame') : t('play'));
    if (this.continueBtn && this.saved) {
      this.continueBtn.setText(`${t('continue')} S${this.saved.level}`);
    }
    const best = ScoreManager.best();
    this.recordText.setText(best
      ? `${t('record')} ${best.score} · ${DifficultyLabels()[best.difficulty as DifficultyLevel] ?? best.difficulty}`
      : `${t('record')} --`);
    if (!this.sys.game.device.input.touch) {
      this.hintText.setText(t('controlsHintDesktop'));
    }
    this.hangarBtn.setText(`${t('shipPrefix')} ${SHIPS[loadShip()].name}`);
    this.guideBtn.setText(t('guide'));
    if (this.controlsBtn) {
      this.controlsBtn.setText(`${t('controlsPrefix')} ${SCHEMES[loadScheme()].label}`);
    }
    this.selectDifficulty(this.selectedDifficulty);
  }

  update() {
    this.background.tilePositionY -= 0.5;
  }

  /** Stacks every block in one centered column sized from the real viewport (portrait or landscape). */
  private resizeLayout(width: number, height: number) {
    const pad = 16;
    const col = Math.min(width - pad * 2, 560);

    this.background.setSize(width, height);
    this.stars.forEach(s => s.setPosition(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height)));

    // Top bar
    const barH = Phaser.Math.Clamp(Math.round(height * 0.06), 32, 40);
    const barFont = barH * 0.32;
    this.musicBtn.layout(barH * 2.2, barH, barFont).setPosition(pad + barH * 1.1, pad + barH / 2);
    this.sfxBtn.layout(barH * 2.4, barH, barFont).setPosition(pad + barH * 2.2 + 8 + barH * 1.2, pad + barH / 2);
    this.langBtn.layout(barH * 1.6, barH, barFont).setPosition(pad + barH * 4.6 + 16 + barH * 0.8, pad + barH / 2);
    this.fullscreenBtn?.layout(barH, barH, barH * 0.5).setPosition(width - pad - barH / 2, pad + barH / 2);

    // Sizes
    const gapRow = 8;
    this.controlsBtn?.layout(Math.min(col, 300), barH, barFont);
    const navW = (Math.min(col, 420) - gapRow) / 2;
    this.hangarBtn.layout(navW * 1.25, barH, barFont);
    this.guideBtn.layout(navW * 0.75, barH, barFont);
    const short = height < 520; // landscape phones: drop the decorative ship, tighten everything
    sizeTitle(this.title, Math.min((width - pad * 2) / 14.5, height * (short ? 0.08 : 0.09), 56));
    this.ship.setVisible(!short).setScale(pixelScale(this.ship.height, height * 0.09, 2));

    const gap = 8;
    const diffH = Phaser.Math.Clamp(Math.round(height * 0.075), 36, 56);
    const diffW = (col - gap * 2) / 3;
    const diffFont = Math.min(diffH * 0.34, diffW / 9);
    this.diffButtons.forEach(b => b.layout(diffW, diffH, diffFont));

    const startH = Phaser.Math.Clamp(Math.round(height * 0.1), 44, 72);
    const startW = Math.min(col, 380);
    const startFont = Math.min(startH * 0.32, startW / 16);
    this.continueBtn?.layout(startW, startH, startFont);
    this.startBtn.layout(this.saved ? startW * 0.8 : startW, this.saved ? startH * 0.75 : startH, this.saved ? startFont * 0.75 : startFont);

    const small = col < 400 ? 8 : 12;
    this.subtitle.setStyle(pixelText(small, '#4dd9ff'));
    this.diffLabel.setStyle(pixelText(small, '#8892b0'));
    this.recordText.setStyle(pixelText(small, '#ffdd33'));

    // Vertical stack: [height, place(y = top of block)]
    const blocks: [number, (y: number) => void][] = [
      [this.title.displayHeight, y => this.title.setPosition(width / 2, y + this.title.displayHeight / 2)],
      [this.subtitle.height, y => this.subtitle.setPosition(width / 2, y + this.subtitle.height / 2)],
      ...(short ? [] : [[this.ship.displayHeight + 12, (y: number) => this.ship.setPosition(width / 2, y + this.ship.displayHeight / 2 + 6)] as [number, (y: number) => void]]),
      [this.diffLabel.height, y => this.diffLabel.setPosition(width / 2, y + this.diffLabel.height / 2)],
      [diffH, y => this.diffButtons.forEach((b, i) => b.setPosition(width / 2 + (i - 1) * (diffW + gap), y + diffH / 2))],
      [this.diffDesc.height, y => this.diffDesc.setPosition(width / 2, y + this.diffDesc.height / 2)],
      ...(this.continueBtn ? [[startH, (y: number) => this.continueBtn!.setPosition(width / 2, y + startH / 2)] as [number, (y: number) => void]] : []),
      [this.startBtn.height, y => this.startBtn.setPosition(width / 2, y + this.startBtn.height / 2)],
      [this.recordText.height, y => this.recordText.setPosition(width / 2, y + this.recordText.height / 2)],
      [barH, y => {
        const total = this.hangarBtn.width + gapRow + this.guideBtn.width;
        this.hangarBtn.setPosition(width / 2 - total / 2 + this.hangarBtn.width / 2, y + barH / 2);
        this.guideBtn.setPosition(width / 2 + total / 2 - this.guideBtn.width / 2, y + barH / 2);
      }],
      ...(this.controlsBtn ? [[barH, (y: number) => this.controlsBtn!.setPosition(width / 2, y + barH / 2)] as [number, (y: number) => void]] : []),
    ];
    const top = pad * 2 + barH;
    const bottom = height - pad - (this.hintText.text ? 16 : 0);
    const content = blocks.reduce((sum, [h]) => sum + h, 0);
    const spacing = Phaser.Math.Clamp((bottom - top - content) / (blocks.length + 1), 6, height * 0.05);
    let y = top + Math.max(0, (bottom - top - content - spacing * (blocks.length - 1)) / 2);
    blocks.forEach(([h, place]) => { place(y); y += h + spacing; });

    // Restart the bob from the new resting position so the tween doesn't fight the layout.
    this.shipBob?.remove();
    this.shipBob = this.tweens.add({ targets: this.ship, y: this.ship.y - 6, duration: 900, yoyo: true, loop: -1, ease: 'Sine.InOut' });

    this.hintText.setWordWrapWidth(width - pad * 2).setAlign('center').setPosition(width / 2, height - pad - 4);
  }

  private selectDifficulty(diff: DifficultyLevel) {
    this.selectedDifficulty = diff;
    this.diffButtons.forEach((btn, i) => {
      btn.selected = DIFFS[i].key === diff;
      btn.redraw();
    });
    const d = DIFFS.find(x => x.key === diff)!;
    this.diffDesc.setText(t(d.descKey)).setColor(Phaser.Display.Color.IntegerToColor(d.color).rgba);
  }

  private startGame() {
    synth.stopMusic();
    clearCampaign();
    this.scene.start('MainGame', { campaign: newCampaign(this.selectedDifficulty, loadShip()) });
  }

  private continueGame() {
    synth.stopMusic();
    this.scene.start('MainGame', { campaign: this.saved });
  }
}

