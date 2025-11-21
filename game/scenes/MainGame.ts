
import Phaser from 'phaser';
import { synth } from '../utils/Synth';
import { DifficultySettings, DifficultyLevel } from './MainMenu';

export default class MainGame extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors?: any;
  private wasd?: any;
  
  // Groups
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  
  // Visuals
  private background!: Phaser.GameObjects.TileSprite;
  private starfield!: Phaser.GameObjects.TileSprite;
  private shieldVisual!: Phaser.GameObjects.Arc;
  
  // UI
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private lives: number = 3;
  private livesText!: Phaser.GameObjects.Text;
  private difficultyText!: Phaser.GameObjects.Text;
  
  // Logic
  private lastFired: number = 0;
  private fireDelay: number = 200;
  private baseFireDelay: number = 200;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private settings: any;
  
  // Powerups State
  private hasShield: boolean = false;
  private rapidFireActive: boolean = false;

  constructor() {
    super('MainGame');
  }

  init(data: { difficulty: DifficultyLevel }) {
    const diff = data.difficulty || 'MEDIUM';
    this.settings = DifficultySettings[diff];
    this.lives = 3;
    this.score = 0;
    this.hasShield = false;
    this.rapidFireActive = false;
  }

  create() {
    const { width, height } = this.cameras.main;

    // 1. Backgrounds
    // Creating a parallax effect with two layers
    this.starfield = this.add.tileSprite(0, 0, width, height, 'star').setOrigin(0, 0).setAlpha(0.3);
    // Main background texture - set alpha to blend with background color
    this.background = this.add.tileSprite(0, 0, width, height, 'background').setOrigin(0, 0).setAlpha(0.1);
    
    // 2. Player
    // Rotate -90 degrees because the asset usually faces right, but we fly up
    this.player = this.physics.add.sprite(width / 2, height - 100, 'ship');
    this.player.setAngle(-90); 
    this.player.setDamping(true);
    this.player.setDrag(0.95);
    this.player.setMaxVelocity(400);
    this.player.setCollideWorldBounds(false); // Allow wrapping
    
    // Shield Visual
    this.shieldVisual = this.add.circle(0, 0, 30, 0x0000ff, 0.3);
    this.shieldVisual.setStrokeStyle(2, 0x00ffff);
    this.shieldVisual.setVisible(false);

    // 3. Groups
    this.bullets = this.physics.add.group({ 
      classType: Phaser.Physics.Arcade.Image, 
      defaultKey: 'bullet',
      maxSize: 30, 
      runChildUpdate: true 
    });
    this.enemyBullets = this.physics.add.group({ 
      classType: Phaser.Physics.Arcade.Image, 
      defaultKey: 'enemyBullet',
      maxSize: 50, 
      runChildUpdate: true 
    });
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.powerups = this.physics.add.group();

    // 4. Inputs
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    }

    // 5. Collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, undefined, this);

    // 6. UI
    this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '20px', color: '#fff', fontFamily: 'Arial' });
    this.livesText = this.add.text(width - 120, 20, 'Lives: 3', { fontSize: '20px', color: '#fff', fontFamily: 'Arial' });
    // Difficulty Indicator
    const diffName = Object.keys(DifficultySettings).find(key => DifficultySettings[key as DifficultyLevel] === this.settings);
    this.difficultyText = this.add.text(width / 2, 20, `${diffName} MODE`, { fontSize: '16px', color: '#ffff00' }).setOrigin(0.5, 0);

    // 7. Spawner
    this.spawnTimer = this.time.addEvent({
      delay: this.settings.spawnDelay,
      callback: this.spawnSequence,
      callbackScope: this,
      loop: true
    });

    this.scale.on('resize', this.handleResize, this);
  }

  update(time: number, delta: number) {
    // Parallax
    this.background.tilePositionY -= 2;
    this.starfield.tilePositionY -= 0.5; // Slower for depth

    if (!this.player.active) return;

    // Shield Follow
    if (this.hasShield) {
      this.shieldVisual.setPosition(this.player.x, this.player.y);
    }

    // Movement
    const accel = 600;
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.player.setAccelerationX(-accel);
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.player.setAccelerationX(accel);
    } else {
      this.player.setAccelerationX(0);
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.player.setAccelerationY(-accel);
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.player.setAccelerationY(accel);
    } else {
      this.player.setAccelerationY(0);
    }

    // Screen Wrap (appear on opposite side)
    this.physics.world.wrap(this.player, 20);

    // Shoot
    if ((this.cursors.space.isDown || this.input.activePointer.isDown) && time > this.lastFired) {
      this.fireBullet(time);
    }

    // Enemy Logic (Custom update loop for complex patterns)
    this.enemies.children.iterate((enemy: any) => {
      if (enemy && enemy.active) {
        if (enemy.getData('type') === 'weaver') {
          enemy.x += Math.sin(time / 200) * 3;
        }
        
        // Shooter logic
        if (enemy.getData('type') === 'shooter') {
          if (time > enemy.getData('nextShot')) {
            this.fireEnemyBullet(enemy);
            enemy.setData('nextShot', time + 2000);
          }
        }

        if (enemy.y > this.cameras.main.height + 50) {
          enemy.destroy();
        }
      }
      return true;
    });

    this.cleanup();
  }

  private fireBullet(time: number) {
    const bullet = this.bullets.get(this.player.x, this.player.y - 20, 'bullet');
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setAngle(-90); // Rotate to vertical (pointing up)
      bullet.setVelocityY(-600);
      this.lastFired = time + (this.rapidFireActive ? this.baseFireDelay / 2 : this.baseFireDelay);
      synth.playLaser();
    }
  }

  private fireEnemyBullet(enemy: Phaser.GameObjects.Sprite) {
    const bullet = this.enemyBullets.get(enemy.x, enemy.y + 20, 'enemyBullet');
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      // Aim at player
      this.physics.moveToObject(bullet, this.player, 250);
      
      // Rotate bullet to point in the direction it's moving
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      bullet.setRotation(angle + Math.PI / 2); // +90 degrees to align with sprite orientation
      
      synth.playEnemyShoot();
    }
  }

  private spawnSequence() {
    const { width } = this.cameras.main;
    const rand = Math.random();
    const speedMult = this.settings.speedMultiplier;

    let type = 'basic';
    let texture = 'enemy';
    let velocityY = 150 * speedMult;

    // Determine Enemy Type
    if (rand > 0.8) {
      type = 'shooter';
      texture = 'enemyShip'; // Use the new enemy ship sprite
      velocityY = 80 * speedMult; // Slower
    } else if (rand > 0.6) {
      type = 'weaver';
      texture = 'enemyWeaver';
      velocityY = 200 * speedMult; // Faster
    }

    const x = Phaser.Math.Between(30, width - 30);
    const enemy = this.enemies.create(x, -50, texture);
    enemy.setVelocityY(velocityY);
    enemy.setData('type', type);
    enemy.setData('nextShot', 0); // For shooters

    // Powerup Spawn Chance (5%)
    if (Math.random() < 0.05) {
      this.spawnPowerup();
    }
  }

  private spawnPowerup() {
    const { width } = this.cameras.main;
    const types = ['powerup_shield', 'powerup_rapid', 'powerup_bomb'];
    const type = Phaser.Utils.Array.GetRandom(types);
    
    const pu = this.powerups.create(Phaser.Math.Between(30, width - 30), -50, type);
    pu.setVelocityY(100);
    pu.setData('type', type);
  }

  private collectPowerup(player: any, powerup: any) {
    const type = powerup.getData('type');
    powerup.destroy();
    synth.playPowerUp();

    if (type === 'powerup_shield') {
      this.activateShield();
    } else if (type === 'powerup_rapid') {
      this.activateRapidFire();
    } else if (type === 'powerup_bomb') {
      this.activateBomb();
    }
  }

  private activateShield() {
    this.hasShield = true;
    this.shieldVisual.setVisible(true);
    this.time.delayedCall(5000, () => {
      this.hasShield = false;
      this.shieldVisual.setVisible(false);
    });
  }

  private activateRapidFire() {
    this.rapidFireActive = true;
    this.time.delayedCall(4000, () => {
      this.rapidFireActive = false;
    });
  }

  private activateBomb() {
    synth.playBomb();
    this.cameras.main.flash(500, 255, 255, 255);
    // Destroy all enemies
    this.enemies.clear(true, true);
    this.enemyBullets.clear(true, true);
  }

  private hitEnemy(bullet: any, enemy: any) {
    if (bullet.active && enemy.active) {
      // Create visual explosion effect using particles or simple tween
      const explosion = this.add.circle(enemy.x, enemy.y, 5, 0xffaa00);
      this.tweens.add({
        targets: explosion,
        scale: 3,
        alpha: 0,
        duration: 200,
        onComplete: () => explosion.destroy()
      });

      bullet.destroy();
      enemy.destroy();
      
      this.score += 10 * this.settings.scoreMulti;
      this.scoreText.setText(`Score: ${this.score}`);
      synth.playExplosion();
    }
  }

  private hitPlayer(player: any, danger: any) {
    if (this.hasShield) {
      // Shield absorbs damage
      danger.destroy();
      return;
    }

    if (player.active && danger.active) {
      danger.destroy();
      this.lives--;
      this.livesText.setText(`Lives: ${this.lives}`);
      synth.playExplosion();

      // Visual Feedback: Red Flash & Shake
      this.cameras.main.shake(200, 0.01);
      this.player.setTint(0xff0000);
      this.time.delayedCall(200, () => this.player.clearTint());

      if (this.lives <= 0) {
        this.gameOver();
      }
    }
  }

  private cleanup() {
    const { height } = this.cameras.main;
    const killY = height + 100;

    const cleanGroup = (group: Phaser.Physics.Arcade.Group) => {
      group.children.iterate((child: any) => {
        if (child && child.active && (child.y > killY || child.y < -100)) {
          child.destroy();
        }
        return true;
      });
    };

    cleanGroup(this.bullets);
    cleanGroup(this.enemyBullets);
    cleanGroup(this.powerups);
  }

  private handleResize(gameSize: any) {
    const { width, height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
    this.background.setSize(width, height);
    this.starfield.setSize(width, height);
    this.livesText.setPosition(width - 120, 20);
    this.difficultyText.setPosition(width/2, 20);
    // We don't strict bind physics world to screen to allow wrapping off-screen
  }

  private gameOver() {
    this.player.setActive(false).setVisible(false);
    this.shieldVisual.setVisible(false);
    this.scene.start('GameOver', { score: this.score });
  }
}
