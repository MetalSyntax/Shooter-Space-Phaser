import Phaser from 'phaser';

export default class Victory extends Phaser.Scene {
    private score: number = 0;

    constructor() {
        super('Victory');
    }

    init(data: { score: number }) {
        this.score = data.score;
    }

    create() {
        const { width, height } = this.cameras.main;

        this.add.tileSprite(0, 0, width, height, 'background').setOrigin(0, 0).setAlpha(0.3);

        // Victory Text (You might want to replace this with an image later if requested)
        this.add.text(width / 2, height / 3, 'VICTORY!', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#ffff00',
            stroke: '#ff0000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // Score Text
        this.add.text(width / 2, height / 2, `Final Score: ${this.score}`, {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Restart Button Image (Reusing the one from GameOver)
        const restartBtn = this.add.image(width / 2, height * 0.7, 'restart_btn')
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // Pulse animation for the button
        this.tweens.add({
            targets: restartBtn,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            loop: -1
        });

        const restartGame = () => {
            this.scene.start('MainGame');
        };

        restartBtn.on('pointerdown', restartGame);
        this.input.keyboard?.on('keydown-SPACE', restartGame);
        this.input.keyboard?.on('keydown-ENTER', restartGame);
    }
}
