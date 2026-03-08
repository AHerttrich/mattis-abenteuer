/**
 * AmbientSoundSystem — Biome-based ambient sounds using Web Audio API.
 * Plays looping background sounds that change with biome (birds, wind, cave drips).
 */

export class AmbientSoundSystem {
  private ctx: AudioContext | null = null;

  private ambientGain: GainNode | null = null;

  private timer = 0;
  private enabled = true;

  constructor() {
    try {
      this.ctx = new AudioContext();
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.03;
      this.ambientGain.connect(this.ctx.destination);
    } catch { /* no audio */ }
  }

  /** Update ambient sounds based on biome and underground state. */
  update(dt: number, biome: string, playerY: number): void {
    if (!this.ctx || !this.ambientGain || !this.enabled) return;

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 4 + Math.random() * 6; // play ambient every 4-10 seconds

    const isUnderground = playerY < 15;

    if (isUnderground) {
      this.playCaveDrip();
    } else if (biome === 'forest') {
      this.playBirdChirp();
    } else if (biome === 'plains') {
      this.playWindGust();
    } else if (biome === 'desert') {
      this.playDesertWind();
    } else if (biome === 'tundra') {
      this.playArcticWind();
    } else if (biome === 'swamp') {
      this.playCricket();
    } else if (biome === 'mountain') {
      this.playEcho();
    }
  }

  private playBirdChirp(): void {
    if (!this.ctx || !this.ambientGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.15);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(g).connect(this.ambientGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.2);
  }

  private playWindGust(): void {
    if (!this.ctx || !this.ambientGain) return;
    const bufferSize = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = 300;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.3);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
    src.connect(lpf).connect(g).connect(this.ambientGain);
    src.start(); src.stop(this.ctx.currentTime + 1);
  }

  private playCaveDrip(): void {
    if (!this.ctx || !this.ambientGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500 + Math.random() * 800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(g).connect(this.ambientGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.12);
  }

  private playDesertWind(): void {
    if (!this.ctx || !this.ambientGain) return;
    this.playFilteredNoise(200, 0.015, 1.5);
  }

  private playArcticWind(): void {
    if (!this.ctx || !this.ambientGain) return;
    this.playFilteredNoise(500, 0.02, 2);
  }

  private playCricket(): void {
    if (!this.ctx || !this.ambientGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 4000 + Math.random() * 1000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.008, this.ctx.currentTime);
    // Rapid on/off
    for (let i = 0; i < 6; i++) {
      g.gain.setValueAtTime(0.008, this.ctx.currentTime + i * 0.06);
      g.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.06 + 0.03);
    }
    g.gain.setValueAtTime(0, this.ctx.currentTime + 0.4);
    osc.connect(g).connect(this.ambientGain);
    osc.start(); osc.stop(this.ctx.currentTime + 0.4);
  }

  private playEcho(): void {
    if (!this.ctx || !this.ambientGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 200 + Math.random() * 100;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.03, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
    osc.connect(g).connect(this.ambientGain);
    osc.start(); osc.stop(this.ctx.currentTime + 1.5);
  }

  private playFilteredNoise(freq: number, vol: number, dur: number): void {
    if (!this.ctx || !this.ambientGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass'; lpf.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + dur);
    src.connect(lpf).connect(g).connect(this.ambientGain);
    src.start(); src.stop(this.ctx.currentTime + dur);
  }

  toggle(): void { this.enabled = !this.enabled; }
}
