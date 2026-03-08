/**
 * SoundManager — Web Audio API based sound system.
 * Generates synthetic sounds on the fly (no audio files needed).
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private volume = 0.3;

  init(): void {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  private ensureResumed(): void {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  /** Mine/break block sound — crunchy low noise burst. */
  playMine(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;

    // Noise burst
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.12);
  }

  /** Place block sound — woody thud. */
  playPlace(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    osc.type = 'sine';

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Combat hit sound — sharp metallic clang. */
  playHit(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
    osc.type = 'sawtooth';

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Jump sound — upward chirp. */
  playJump(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    osc.type = 'sine';

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  /** Crafting success — pleasant ding. */
  playCraft(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(523, now); // C5
    osc.type = 'sine';

    const osc2 = this.ctx.createOscillator();
    osc2.frequency.setValueAtTime(659, now + 0.1); // E5
    osc2.type = 'sine';

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain).connect(this.masterGain);
    osc2.connect(gain);
    osc.start(now); osc.stop(now + 0.15);
    osc2.start(now + 0.1); osc2.stop(now + 0.3);
  }

  /** Catapult launch — deep boom. */
  playCatapult(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
    osc.type = 'sine';

    const noise = this.createNoiseBurst(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain).connect(this.masterGain);
    if (noise) noise.connect(filter).connect(gain);
    osc.start(now); osc.stop(now + 0.5);
    if (noise) { noise.start(now); noise.stop(now + 0.3); }
  }

  /** Explosion impact — rumble. */
  playExplosion(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    osc.type = 'sawtooth';

    const noise = this.createNoiseBurst(0.4);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain).connect(this.masterGain);
    if (noise) noise.connect(gain);
    osc.start(now); osc.stop(now + 0.4);
    if (noise) { noise.start(now); noise.stop(now + 0.4); }
  }

  /** Victory fanfare — major chord arpeggio. */
  playVictory(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.2, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  }

  /** Ambient wind — slow filtered noise loop (call once). */
  startAmbient(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();

    const bufSize = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.03;

    noise.connect(filter).connect(gain).connect(this.masterGain);
    noise.start();
  }

  /** Bow shot — twangy string release. */
  playBowShot(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    osc.type = 'triangle';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.1);
  }

  /** Shield block — metallic clunk. */
  playShieldBlock(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
    osc.type = 'square';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.12);
  }

  /** Enemy death — low descending groan. */
  playEnemyDeath(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    osc.type = 'sawtooth';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.4);
  }

  /** War horn — wave incoming warning. */
  playWarHorn(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.8);
    osc.frequency.linearRampToValueAtTime(120, now + 1.2);
    osc.type = 'sawtooth';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.3);
    gain.gain.setValueAtTime(0.3, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now); osc.stop(now + 1.2);
  }

  /** Wave cleared — triumphant chord. */
  playWaveCleared(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.5);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });
  }

  /** Fall damage — bone crunch impact. */
  playFallDamage(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const noise = this.createNoiseBurst(0.15);
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    osc.type = 'square';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain).connect(this.masterGain);
    if (noise) noise.connect(gain);
    osc.start(now); osc.stop(now + 0.15);
    if (noise) { noise.start(now); noise.stop(now + 0.15); }
  }

  /** Lava sizzle — hissing noise. */
  playLavaBurn(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const noise = this.createNoiseBurst(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    if (noise) {
      noise.connect(filter).connect(gain).connect(this.masterGain);
      noise.start(now); noise.stop(now + 0.3);
    }
  }

  private createNoiseBurst(duration: number): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /** War cry — aggressive battle shout. */
  playWarCry(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    osc.type = 'sawtooth';
    const osc2 = this.ctx.createOscillator();
    osc2.frequency.setValueAtTime(320, now);
    osc2.frequency.exponentialRampToValueAtTime(160, now + 0.15);
    osc2.type = 'sawtooth';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain).connect(this.masterGain);
    osc2.connect(gain);
    osc.start(now); osc.stop(now + 0.2);
    osc2.start(now); osc2.stop(now + 0.2);
  }

  /** Sword swing — fast whoosh. */
  playSwordSwing(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const noise = this.createNoiseBurst(0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    if (noise) {
      noise.connect(filter).connect(gain).connect(this.masterGain);
      noise.start(now); noise.stop(now + 0.08);
    }
  }

  /** Panic — frightened whimper. */
  playPanic(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    osc.type = 'sine';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.1);
  }

  /** Cavalry charge — galloping thuds. */
  playCavalryCharge(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(80, now + i * 0.07);
      osc.frequency.exponentialRampToValueAtTime(40, now + i * 0.07 + 0.05);
      osc.type = 'sine';
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.05);
      osc.connect(gain).connect(this.masterGain);
      osc.start(now + i * 0.07); osc.stop(now + i * 0.07 + 0.05);
    }
  }

  /** Catapult windup — creaking tension. */
  playCatapultWindup(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.5);
    osc.type = 'triangle';
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now); osc.stop(now + 0.5);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  toggle(): void { this.enabled = !this.enabled; }
  get isEnabled(): boolean { return this.enabled; }
}

export const soundManager = new SoundManager();
