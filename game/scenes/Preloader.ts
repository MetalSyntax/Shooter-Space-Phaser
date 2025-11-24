
import Phaser from 'phaser';

export default class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Create a simple loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x3b82f6, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      this.generateTextures();
      this.scene.start('MainMenu');
    });

    // Load assets specified in original requirements
    this.load.image('ship', 'Img/ship.png');
    this.load.image('bullet', 'Img/bullet.png');
    this.load.image('enemy', 'Img/enemy.png');
    this.load.image('background', 'Img/background.png');

    // Load new enemy assets
    this.load.image('enemyShip', 'Img/enemy-ship.png');
    this.load.image('enemyWeaver', 'Img/enemy-weaver.png');
    this.load.image('enemyBullet', 'Img/bullet-enemy.png');
    this.load.image('boss', 'Img/boss.png');

    // Load power-up assets
    this.load.image('powerup_shield', 'Img/power-up-blue.png');
    this.load.image('powerup_rapid', 'Img/power-up-yellow.png');
    this.load.image('powerup_bomb', 'Img/power-up-red.png');

    // UI Assets
    this.load.image('easy_active', 'Img/Easy-enable.png');
    this.load.image('easy_disable', 'Img/Easy-disable.png');
    this.load.image('medium_active', 'Img/Medium-enable.png');
    this.load.image('medium_disable', 'Img/Medium-disable.png');
    this.load.image('hard_active', 'Img/Hard-enable.png');
    this.load.image('hard_disable', 'Img/Hard-disable.png');
    this.load.image('start_game', 'Img/start-game.png');
    this.load.image('restart_btn', 'Img/Restart.png');
    this.load.image('game_over_text', 'Img/game-over.png');
    this.load.image('victory_text', 'Img/victory.png');
    this.load.image('game_title', 'Img/Space-shooter.png');
    this.load.image('fullscreen_btn', 'Img/fullscreen.png');
    this.load.image('menu_btn', 'Img/menu.png');

    // Fallbacks if local files are missing (using placeholders for robustness)
    this.load.on('loaderror', (file: { key: string }) => {
      console.warn(`Asset missing: ${file.key}. Generating placeholder.`);
    });
  }

  private generateTextures() {
    // Ensure we have textures even if load failed, or generate new ones for new features
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Fallback: Player Ship
    if (!this.textures.exists('ship')) {
      graphics.clear();
      graphics.fillStyle(0x00ff00, 1);
      graphics.fillTriangle(0, 30, 30, 30, 15, 0); // Pointing Up
      graphics.generateTexture('ship', 30, 30);
    }

    // Fallback: Basic Enemy
    if (!this.textures.exists('enemy')) {
      graphics.clear();
      graphics.fillStyle(0xff0000, 1);
      graphics.fillRect(0, 0, 30, 30);
      graphics.generateTexture('enemy', 30, 30);
    }

    // Fallback: Bullet
    if (!this.textures.exists('bullet')) {
      graphics.clear();
      graphics.fillStyle(0xffff00, 1);
      graphics.fillRect(0, 0, 8, 8);
      graphics.generateTexture('bullet', 8, 8);
    }

    // Fallback: Background
    if (!this.textures.exists('background')) {
      graphics.clear();
      graphics.fillStyle(0x000033, 1);
      graphics.fillRect(0, 0, 64, 64);
      graphics.generateTexture('background', 64, 64);
    }

    // --- New Textures for Features ---

    // Enemy Shooter (only if enemyShip wasn't loaded)
    if (!this.textures.exists('enemyShip')) {
      graphics.clear();
      graphics.fillStyle(0xff00ff, 1); // Purple
      graphics.fillTriangle(0, 0, 30, 0, 15, 30); // Pointing down
      graphics.generateTexture('enemyShip', 30, 30);
    }

    // Enemy Weaver (only if not loaded)
    if (!this.textures.exists('enemyWeaver')) {
      graphics.clear();
      graphics.fillStyle(0xffaa00, 1); // Orange
      graphics.fillCircle(15, 15, 15);
      graphics.generateTexture('enemyWeaver', 30, 30);
    }

    // Enemy Bullet (only if not loaded)
    if (!this.textures.exists('enemyBullet')) {
      graphics.clear();
      graphics.fillStyle(0xff5555, 1); // Reddish
      graphics.fillCircle(4, 4, 4);
      graphics.generateTexture('enemyBullet', 8, 8);
    }

    // Powerup: Shield (only if not loaded)
    if (!this.textures.exists('powerup_shield')) {
      graphics.clear();
      graphics.fillStyle(0x0000ff, 1);
      graphics.lineStyle(2, 0xffffff);
      graphics.strokeCircle(15, 15, 13);
      graphics.fillCircle(15, 15, 10);
      graphics.generateTexture('powerup_shield', 30, 30);
    }

    // Powerup: Rapid Fire (only if not loaded)
    if (!this.textures.exists('powerup_rapid')) {
      graphics.clear();
      graphics.fillStyle(0xffff00, 1);
      graphics.fillTriangle(15, 2, 28, 28, 2, 28);
      graphics.generateTexture('powerup_rapid', 30, 30);
    }

    // Powerup: Bomb (only if not loaded)
    if (!this.textures.exists('powerup_bomb')) {
      graphics.clear();
      graphics.fillStyle(0xff0000, 1);
      graphics.fillCircle(15, 15, 12);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(13, 2, 4, 6); // Fuse
      graphics.generateTexture('powerup_bomb', 30, 30);
    }

    // Starfield particle (Simple white dot)
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture('star', 4, 4);
  }
}
