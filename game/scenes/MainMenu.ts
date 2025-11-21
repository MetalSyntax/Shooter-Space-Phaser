
import Phaser from 'phaser';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export const DifficultySettings = {
  EASY: { speedMultiplier: 1, spawnDelay: 1000, scoreMulti: 1 },
  MEDIUM: { speedMultiplier: 1.5, spawnDelay: 700, scoreMulti: 2 },
  HARD: { speedMultiplier: 2.0, spawnDelay: 400, scoreMulti: 3 }
};

export default class MainMenu extends Phaser.Scene {
  private selectedDifficulty: DifficultyLevel = 'MEDIUM';
  private diffText!: Phaser.GameObjects.Text;

  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.cameras.main;

    // Parallax Starfield effect
    this.createStarfield(width, height);

    // Title
    this.add.text(width / 2, height / 4, 'SPACE SHOOTER', {
      fontFamily: 'Arial Black',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#0000aa',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5).setShadow(2, 2, '#333333', 2, true, true);

    // Difficulty Selector
    this.add.text(width / 2, height / 2, 'Select Difficulty:', {
      fontFamily: 'Arial', fontSize: '24px', color: '#aaa'
    }).setOrigin(0.5);

    const createDiffBtn = (diff: DifficultyLevel, yOffset: number) => {
      const btn = this.add.text(width / 2, height / 2 + yOffset, diff, {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: this.selectedDifficulty === diff ? '#00ff00' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        this.selectedDifficulty = diff;
        this.updateButtons();
      });

      return btn;
    };

    this.diffText = this.add.text(width / 2, height / 2 + 150, '', { fontSize: '0px' }); // Dummy container
    this.diffText.setData('btns', [
      createDiffBtn('EASY', 40),
      createDiffBtn('MEDIUM', 90),
      createDiffBtn('HARD', 140)
    ]);

    // Start Button
    const startBtn = this.add.text(width / 2, height * 0.85, 'START GAME', {
      fontFamily: 'Arial Black',
      fontSize: '36px',
      color: '#ffff00',
      backgroundColor: '#aa0000',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startBtn,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      loop: -1
    });

    startBtn.on('pointerdown', this.startGame, this);
    
    this.input.keyboard?.on('keydown-ENTER', this.startGame, this);
    this.input.keyboard?.on('keydown-SPACE', this.startGame, this);
  }

  private updateButtons() {
    const btns = this.diffText.getData('btns') as Phaser.GameObjects.Text[];
    btns.forEach(btn => {
      if (btn.text === this.selectedDifficulty) {
        btn.setColor('#00ff00');
        btn.setScale(1.2);
      } else {
        btn.setColor('#ffffff');
        btn.setScale(1);
      }
    });
  }

  private createStarfield(width: number, height: number) {
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      this.add.image(x, y, 'star').setScale(Phaser.Math.FloatBetween(0.5, 1)).setAlpha(0.5);
    }
  }

  private startGame() {
    this.scene.start('MainGame', { difficulty: this.selectedDifficulty });
  }
}
