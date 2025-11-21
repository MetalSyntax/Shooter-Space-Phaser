import Phaser from 'phaser';

export default class GameOver extends Phaser.Scene {
  private score: number = 0;

  constructor() {
    super('GameOver');
  }

  init(data: { score: number }) {
    this.score = data.score;
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add.tileSprite(0, 0, width, height, 'background').setOrigin(0, 0).setAlpha(0.3);

    this.add.text(width / 2, height / 3, 'GAME OVER', {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2, `Final Score: ${this.score}`, {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const restartText = this.add.text(width / 2, height * 0.7, 'Click to Restart', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#00ff00',
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restartText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      loop: -1
    });

    const restartGame = () => {
      this.scene.start('MainGame');
    };

    this.input.on('pointerdown', restartGame);
    this.input.keyboard?.on('keydown-SPACE', restartGame);
    this.input.keyboard?.on('keydown-ENTER', restartGame);
  }
}