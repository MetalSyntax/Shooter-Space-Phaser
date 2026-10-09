import { synth } from '../utils/Synth';
import GameOver from './GameOver';

export default class Victory extends GameOver {
  constructor() {
    super('Victory', 'victory', ['#fff27a', '#ffc400', '#7a4a00']);
  }

  protected playMusic() {
    synth.playVictoryMusic();
  }
}

