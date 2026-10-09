/**
 * A simple synthesizer using the Web Audio API to replace external sound files.
 * This ensures the game has sound without needing new assets.
 * Music and SFX run through separate gain buses so each can be muted independently.
 */
const AUDIO_KEY = 'ss_audio';

export class Synth {
  private ctx: AudioContext;
  private musicBus: GainNode;
  private sfxBus: GainNode;
  private noiseBuffer: AudioBuffer;
  public musicMuted = false;
  public sfxMuted = false;

  constructor() {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.ctx.destination);
    this.sfxBus.connect(this.ctx.destination);

    this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    try {
      const saved = JSON.parse(localStorage.getItem(AUDIO_KEY) || '{}');
      this.setMusicMuted(!!saved.music);
      this.setSfxMuted(!!saved.sfx);
    } catch { /* storage unavailable: keep defaults */ }
  }

  private resumeCtx(): void {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private saveAudio(): void {
    try { localStorage.setItem(AUDIO_KEY, JSON.stringify({ music: this.musicMuted, sfx: this.sfxMuted })); } catch { /* ignore */ }
  }

  public setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    this.musicBus.gain.value = muted ? 0 : 1;
    this.saveAudio();
  }

  public setSfxMuted(muted: boolean): void {
    this.sfxMuted = muted;
    this.sfxBus.gain.value = muted ? 0 : 1;
    this.saveAudio();
  }

  /** Simple oscillator blip routed to the SFX bus. */
  private tone(type: OscillatorType, from: number, to: number, duration: number, vol: number, start = this.ctx.currentTime, ramp: 'exp' | 'lin' = 'exp'): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (ramp === 'exp') osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    else osc.frequency.linearRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.start(start);
    osc.stop(start + duration);
  }

  /** Filtered noise burst routed to `dest`. */
  private noise(duration: number, vol: number, filterType: BiquadFilterType, freq: number, start = this.ctx.currentTime, dest: AudioNode = this.sfxBus): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, start);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(start);
    src.stop(start + duration);
    return src;
  }

  public playLaser(): void {
    this.resumeCtx();
    this.tone('sawtooth', 880, 110, 0.2, 0.08);
  }

  public playMissile(): void {
    this.resumeCtx();
    this.tone('triangle', 300, 900, 0.15, 0.06);
  }

  public playEnemyShoot(): void {
    this.resumeCtx();
    this.tone('square', 200, 100, 0.1, 0.04, undefined, 'lin');
  }

  public playExplosion(big = false): void {
    this.resumeCtx();
    const now = this.ctx.currentTime;
    const duration = big ? 0.9 : 0.5;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(big ? 1600 : 1000, now);
    filter.frequency.linearRampToValueAtTime(100, now + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(big ? 0.35 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(now);
    src.stop(now + duration);
    if (big) this.tone('sine', 120, 30, 0.6, 0.3);
  }

  public playShieldHit(): void {
    this.resumeCtx();
    this.tone('sine', 1200, 400, 0.15, 0.08);
  }

  public playPowerUp(): void {
    this.resumeCtx();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.1);
    osc.frequency.linearRampToValueAtTime(1760, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playBomb(): void {
    this.resumeCtx();
    this.tone('sawtooth', 100, 0.01, 0.5, 0.3);
  }

  public playCombo(level: number): void {
    this.resumeCtx();
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].slice(0, level + 1).forEach((f, i) => this.tone('square', f, f, 0.08, 0.05, now + i * 0.06));
  }

  /** Low-shield alert: pulses alternating left/right in the stereo field. */
  public playShieldWarning(): void {
    this.resumeCtx();
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = i % 2 ? 0.9 : -0.9;
      osc.type = 'square';
      osc.frequency.value = 1500;
      gain.gain.setValueAtTime(0.05, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.08);
      osc.connect(gain);
      gain.connect(pan);
      pan.connect(this.sfxBus);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.08);
    }
  }

  /** Low double alarm: last life. */
  public playCriticalWarning(): void {
    this.resumeCtx();
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) this.tone('sawtooth', 220, 180, 0.2, 0.08, now + i * 0.3);
  }

  /** Two-tone klaxon alarm for the boss entrance. */
  public playBossSiren(): void {
    this.resumeCtx();
    const now = this.ctx.currentTime;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.connect(this.sfxBus);
    for (let i = 0; i < 6; i++) {
      const t = now + i * 0.5;
      [440, 554].forEach(f => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(i % 2 ? f * 0.75 : f, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
        gain.gain.setValueAtTime(0.05, t + 0.38);
        gain.gain.linearRampToValueAtTime(0, t + 0.42);
        osc.connect(gain);
        gain.connect(filter);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    }
  }

  /** Rising charge tone that culminates in a noise blast. */
  public playLaserCharge(duration: number): void {
    this.resumeCtx();
    const now = this.ctx.currentTime;
    this.tone('sine', 100, 1600, duration, 0.06, now);
    this.tone('square', 50, 800, duration, 0.02, now);
    this.noise(0.35, 0.25, 'lowpass', 2500, now + duration);
  }

  public playLaserBeam(duration: number): void {
    this.resumeCtx();
    this.tone('sawtooth', 70, 60, duration, 0.15, undefined, 'lin');
    this.noise(duration, 0.1, 'bandpass', 900);
  }

  // --- MUSIC ---

  private musicNodes: { osc: AudioScheduledSourceNode, gain: GainNode }[] = [];
  // Bumped on every start/stop so stale scheduler callbacks exit instead of doubling the loop.
  private musicId = 0;

  public stopMusic(): void {
    this.musicId++;
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

  private track(osc: AudioScheduledSourceNode, gain: GainNode): void {
    this.musicNodes.push({ osc, gain });
    osc.onended = () => {
      const index = this.musicNodes.findIndex(n => n.osc === osc);
      if (index > -1) this.musicNodes.splice(index, 1);
    };
  }

  private playNote(freq: number, duration: number, startTime: number, type: OscillatorType = 'sine', vol: number = 0.1, attack = 0.05): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.musicBus);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + attack);
    gain.gain.setValueAtTime(vol, startTime + duration - attack);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
    this.track(osc, gain);
  }

  public playMenuMusic(): void {
    this.stopMusic();
    this.resumeCtx();
    const id = this.musicId;

    const melody = [
      { f: 220, d: 0.5 }, { f: 329.63, d: 0.5 }, { f: 440, d: 0.5 }, { f: 329.63, d: 0.5 }, // Am
      { f: 261.63, d: 0.5 }, { f: 392, d: 0.5 }, { f: 523.25, d: 0.5 }, { f: 392, d: 0.5 }, // C
      { f: 196, d: 0.5 }, { f: 293.66, d: 0.5 }, { f: 392, d: 0.5 }, { f: 293.66, d: 0.5 }, // G
      { f: 174.61, d: 0.5 }, { f: 261.63, d: 0.5 }, { f: 349.23, d: 0.5 }, { f: 261.63, d: 0.5 }, // F
    ];

    let startTime = this.ctx.currentTime;
    const loopDuration = melody.reduce((acc, n) => acc + n.d, 0);

    const scheduleLoop = () => {
      if (id !== this.musicId) return;

      let currentTime = startTime;
      melody.forEach(note => {
        this.playNote(note.f, note.d, currentTime, 'triangle', 0.05);
        currentTime += note.d;
      });

      startTime += loopDuration;
      const timeUntilNextLoop = (startTime - this.ctx.currentTime) * 1000;
      setTimeout(scheduleLoop, timeUntilNextLoop - 100); // Schedule slightly early to avoid gaps
    };

    scheduleLoop();
  }

  private bpm = 120;
  private baseBpm = 120;

  /** Boss fights push the combat track to 140+ BPM. */
  public setMusicIntensity(high: boolean): void {
    this.bpm = high ? Math.max(this.baseBpm + 10, 145) : this.baseBpm;
  }

  /**
   * Synthwave combat loop: kick, noise snare/hats, saw bassline and triangle lead arpeggio
   * over Am - F - C - G, scheduled with a Web Audio lookahead sequencer.
   * Each sector sets its own tempo and transposes the progression.
   */
  public playCombatMusic(bpm = 120, sector = 1): void {
    this.stopMusic();
    this.resumeCtx();
    this.baseBpm = this.bpm = bpm;
    const id = this.musicId;
    const transpose = Math.pow(2, [0, 2, -2, 3, -3, 1, 5, -1, 4, 7][(sector - 1) % 10] / 12);

    // Root + chord tones (Hz) per bar.
    const chords = [
      { bass: 55.0, arp: [220, 261.63, 329.63, 440] },   // Am
      { bass: 43.65, arp: [174.61, 220, 261.63, 349.23] }, // F
      { bass: 65.41, arp: [261.63, 329.63, 392, 523.25] }, // C
      { bass: 49.0, arp: [196, 246.94, 293.66, 392] },   // G
    ];

    let step = 0;
    let nextTime = this.ctx.currentTime + 0.05;

    const scheduleStep = (t: number, s: number) => {
      const bar = chords[Math.floor(s / 16) % chords.length];
      const i = s % 16;
      const sixteenth = 60 / this.bpm / 4;

      // Kick: four on the floor
      if (i % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicBus);
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        this.track(osc, gain);
      }
      // Snare on 2 and 4
      if (i === 4 || i === 12) this.noise(0.12, 0.08, 'highpass', 1500, t, this.musicBus);
      // Closed hats on off-beats
      if (i % 2 === 1) this.noise(0.03, 0.025, 'highpass', 7000, t, this.musicBus);
      // Bass on 8ths, octave bounce
      if (i % 2 === 0) this.playNote(bar.bass * transpose * (i % 4 === 2 ? 2 : 1), sixteenth * 1.8, t, 'sawtooth', 0.06, 0.01);
      // Lead arpeggio on 16ths
      this.playNote(bar.arp[i % 4] * 2 * transpose, sixteenth * 0.9, t, 'triangle', 0.05, 0.005);
    };

    const scheduler = () => {
      if (id !== this.musicId) return;
      while (nextTime < this.ctx.currentTime + 0.12) {
        scheduleStep(nextTime, step);
        nextTime += 60 / this.bpm / 4;
        step++;
      }
      setTimeout(scheduler, 25);
    };
    scheduler();
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
