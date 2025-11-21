import Phaser, { Types, Scale } from 'phaser';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import MainGame from './scenes/MainGame';
import GameOver from './scenes/GameOver';

const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0f172a',
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [Preloader, MainMenu, MainGame, GameOver],
};

export default gameConfig;