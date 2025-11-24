
/**
 * A simple synthesizer using the Web Audio API to replace external sound files.
 * This ensures the game has sound without needing new assets.
 */
export class Synth {
  private ctx: AudioContext;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
  }

  private resumeCtx(): void {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  public playLaser(): void {
    this.resumeCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playEnemyShoot(): void {
    this.resumeCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playExplosion(): void {
    this.resumeCtx();
    const duration = 0.5;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  public playPowerUp(): void {
    this.resumeCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(1760, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playBomb(): void {
    this.resumeCtx();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }
  private musicNodes: { osc: OscillatorNode, gain: GainNode }[] = [];
  private isMusicPlaying: boolean = false;

  public stopMusic(): void {
    this.isMusicPlaying = false;
    this.musicNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(this.ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
        osc.stop(this.ctx.currentTime + 0.1);
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    this.musicNodes = [];
  }

  private playNote(freq: number, duration: number, startTime: number, type: OscillatorType = 'sine', vol: number = 0.1): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
    gain.gain.setValueAtTime(vol, startTime + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);

    this.musicNodes.push({ osc, gain });

    // Cleanup
    osc.onended = () => {
      const index = this.musicNodes.findIndex(n => n.osc === osc);
      if (index > -1) {
        this.musicNodes.splice(index, 1);
      }
    };
  }

  public playMenuMusic(): void {
    this.stopMusic();
    this.resumeCtx();
    this.isMusicPlaying = true;

    const melody = [
      { f: 220, d: 0.5 }, { f: 329.63, d: 0.5 }, { f: 440, d: 0.5 }, { f: 329.63, d: 0.5 }, // Am
      { f: 261.63, d: 0.5 }, { f: 392, d: 0.5 }, { f: 523.25, d: 0.5 }, { f: 392, d: 0.5 }, // C
      { f: 196, d: 0.5 }, { f: 293.66, d: 0.5 }, { f: 392, d: 0.5 }, { f: 293.66, d: 0.5 }, // G
      { f: 174.61, d: 0.5 }, { f: 261.63, d: 0.5 }, { f: 349.23, d: 0.5 }, { f: 261.63, d: 0.5 }, // F
    ];

    let startTime = this.ctx.currentTime;
    const loopDuration = melody.reduce((acc, n) => acc + n.d, 0);

    const scheduleLoop = () => {
      if (!this.isMusicPlaying) return;

      // Schedule one loop iteration
      let currentTime = startTime;
      melody.forEach(note => {
        this.playNote(note.f, note.d, currentTime, 'triangle', 0.05);
        currentTime += note.d;
      });

      // Schedule next loop
      startTime += loopDuration;
      const timeUntilNextLoop = (startTime - this.ctx.currentTime) * 1000;
      setTimeout(scheduleLoop, timeUntilNextLoop - 100); // Schedule slightly early to avoid gaps
    };

    scheduleLoop();
  }

  public playVictoryMusic(): void {
    this.stopMusic();
    this.resumeCtx();

    const now = this.ctx.currentTime;
    // Fanfare: C - E - G - C (High)
    this.playNote(523.25, 0.2, now, 'square', 0.1);
    this.playNote(659.25, 0.2, now + 0.2, 'square', 0.1);
    this.playNote(783.99, 0.2, now + 0.4, 'square', 0.1);
    this.playNote(1046.50, 0.8, now + 0.6, 'square', 0.1);

    // Harmony
    this.playNote(261.63, 0.6, now, 'sawtooth', 0.05);
    this.playNote(329.63, 0.8, now + 0.6, 'sawtooth', 0.05);
  }

  public playGameOverMusic(): void {
    this.stopMusic();
    this.resumeCtx();

    const now = this.ctx.currentTime;
    // Sad descending tones
    this.playNote(392.00, 0.4, now, 'sawtooth', 0.1); // G
    this.playNote(369.99, 0.4, now + 0.4, 'sawtooth', 0.1); // F#
    this.playNote(349.23, 0.4, now + 0.8, 'sawtooth', 0.1); // F
    this.playNote(311.13, 1.2, now + 1.2, 'sawtooth', 0.1); // Eb
  }
}

export const synth = new Synth();
