import Phaser, { Types, Scale } from 'phaser';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import MainGame from './scenes/MainGame';
import GameOver from './scenes/GameOver';
import Victory from './scenes/Victory';
import Pause from './scenes/Pause';
import LevelClear from './scenes/LevelClear';
import Guide from './scenes/Guide';
import Hangar from './scenes/Hangar';

const gameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0f172a',
  pixelArt: true,
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
  input: { gamepad: true },
  scene: [Preloader, MainMenu, MainGame, Pause, LevelClear, GameOver, Victory, Guide, Hangar],
};

export default gameConfig;