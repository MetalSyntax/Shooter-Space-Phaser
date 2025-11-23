
import Phaser from 'phaser';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export const DifficultySettings = {
  EASY: { speedMultiplier: 1, spawnDelay: 1000, scoreMulti: 1 },
  MEDIUM: { speedMultiplier: 1.5, spawnDelay: 700, scoreMulti: 2 },
  HARD: { speedMultiplier: 2.0, spawnDelay: 400, scoreMulti: 3 }
};

export default class MainMenu extends Phaser.Scene {
  private selectedDifficulty: DifficultyLevel = 'MEDIUM';
  private titleText!: Phaser.GameObjects.Text;
  private diffLabel!: Phaser.GameObjects.Text;
  private diffButtons: Phaser.GameObjects.Image[] = [];
  private startBtn!: Phaser.GameObjects.Image;
  private fullscreenBtn!: Phaser.GameObjects.Text;
  private starfield!: Phaser.GameObjects.Group;

  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.cameras.main;

    // Parallax Starfield effect
    this.createStarfield(width, height);

    // Title
    this.titleText = this.add.text(0, 0, 'SPACE SHOOTER', {
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#0000aa',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5).setShadow(2, 2, '#333333', 2, true, true);

    // Difficulty Selector Label
    this.diffLabel = this.add.text(0, 0, 'Select Difficulty:', {
      fontFamily: 'Arial', fontSize: '24px', color: '#aaa'
    }).setOrigin(0.5);

    // Difficulty Buttons
    const difficulties: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];
    this.diffButtons = difficulties.map(diff => {
      const texture = this.getTextureKey(diff, this.selectedDifficulty === diff);
      const btn = this.add.image(0, 0, texture)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.setData('difficulty', diff);

      btn.on('pointerdown', () => {
        this.selectedDifficulty = diff;
        this.updateButtons();
      });

      return btn;
    });

    // Start Button
    this.startBtn = this.add.image(0, 0, 'start_game')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: this.startBtn,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      loop: -1
    });

    this.startBtn.on('pointerdown', this.startGame, this);

    this.input.keyboard?.on('keydown-ENTER', this.startGame, this);
    this.input.keyboard?.on('keydown-ENTER', this.startGame, this);
    this.input.keyboard?.on('keydown-SPACE', this.startGame, this);

    // Fullscreen Button
    this.fullscreenBtn = this.add.text(width - 20, 20, 'FULLSCREEN', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        } else {
          this.scale.startFullscreen();
        }
      });

    // Initial Layout
    this.resizeLayout(width, height);

    // Handle Resize
    this.scale.on('resize', (gameSize: any) => {
      this.resizeLayout(gameSize.width, gameSize.height);
    }, this);
  }

  private resizeLayout(width: number, height: number) {
    const isLandscape = width > height;

    // 1. Title Layout
    // Scale title to fit width with some padding
    const titleBaseSize = isLandscape ? 64 : 48;
    const titleScale = Math.min(width / 500, 1);
    this.titleText.setFontSize(titleBaseSize * titleScale);
    this.titleText.setPosition(width / 2, height * (isLandscape ? 0.15 : 0.15));

    // 2. Difficulty Section
    const diffLabelY = height * (isLandscape ? 0.35 : 0.35);
    this.diffLabel.setPosition(width / 2, diffLabelY);
    this.diffLabel.setFontSize(isLandscape ? 24 : 20);

    if (isLandscape) {
      // Horizontal layout for buttons in landscape
      const totalWidth = width * 0.6;
      const spacing = totalWidth / 3;
      const startX = width / 2 - spacing;
      const btnY = height * 0.55;

      this.diffButtons.forEach((btn, index) => {
        btn.setPosition(startX + (spacing * index), btnY);
        btn.setScale(0.6);
      });
    } else {
      // Vertical layout for buttons in portrait
      const startY = height * 0.45;
      const spacing = 50;

      this.diffButtons.forEach((btn, index) => {
        btn.setPosition(width / 2, startY + (spacing * index));
        btn.setScale(0.6);
      });
    }

    // 3. Start Button
    this.startBtn.setPosition(width / 2, height * (isLandscape ? 0.85 : 0.85));
    this.startBtn.setPosition(width / 2, height * (isLandscape ? 0.85 : 0.85));
    this.startBtn.setScale(isLandscape ? 1 : 0.8);

    // 4. Fullscreen Button
    if (this.fullscreenBtn) {
      this.fullscreenBtn.setPosition(width - 20, 20);
    }

    // Re-create starfield to cover new area if needed
    // (Simple approach: just ensure we have enough stars scattered)
  }

  private updateButtons() {
    this.diffButtons.forEach(btn => {
      const diff = btn.getData('difficulty') as DifficultyLevel;
      const isActive = diff === this.selectedDifficulty;
      btn.setTexture(this.getTextureKey(diff, isActive));
    });
  }

  private getTextureKey(diff: DifficultyLevel, isActive: boolean): string {
    const state = isActive ? 'active' : 'disable';
    return `${diff.toLowerCase()}_${state}`;
  }

  private createStarfield(width: number, height: number) {
    // Clear existing if any (though we usually just add more or reset scene)
    // Create new starfield group
    this.starfield = this.add.group();

    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const star = this.add.image(x, y, 'star').setScale(Phaser.Math.FloatBetween(0.5, 1)).setAlpha(0.5);
      this.starfield.add(star);
    }
  }

  private startGame() {
    this.scene.start('MainGame', { difficulty: this.selectedDifficulty });
  }
}
