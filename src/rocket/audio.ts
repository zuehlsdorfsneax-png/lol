/**
 * Triebwerksgeräusch aus gefiltertem Rauschen und kurze Effekte. Startet erst nach einer
 * Nutzeraktion (Vorgabe der Browser) und stört nie: Ohne Web Audio bleibt es einfach still.
 */
export class RocketAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock(): void {
    try {
      if (!this.ctx) {
        if (typeof AudioContext === 'undefined') return;
        const ctx = new AudioContext();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.6;
        this.master.connect(ctx.destination);
        const len = ctx.sampleRate * 2;
        this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          // Braunes Rauschen: tiefes Grollen statt Zischen.
          last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          data[i] = last * 3.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 400;
        this.engineGain = ctx.createGain();
        this.engineGain.gain.value = 0;
        src.connect(this.filter).connect(this.engineGain).connect(this.master);
        src.start();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.6;
  }

  /** Lautstärke des Triebwerks (0…1) und Luftdichte (dumpfer im Vakuum). */
  engine(level: number, air: number): void {
    if (!this.ctx || !this.engineGain || !this.filter) return;
    const now = this.ctx.currentTime;
    const loud = level * (0.25 + 0.75 * Math.min(1, air / 0.3));
    this.engineGain.gain.setTargetAtTime(loud * 0.9, now, 0.08);
    this.filter.frequency.setTargetAtTime(180 + 700 * level * Math.min(1, air + 0.2), now, 0.1);
  }

  private burst(duration: number, freq: number, volume: number): void {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise || ctx.state !== 'running') return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(f).connect(g).connect(master);
    src.start(now, Math.random());
    src.stop(now + duration);
  }

  explosion(): void {
    this.burst(1.6, 500, 1.6);
  }

  clunk(): void {
    this.burst(0.25, 1200, 0.8);
  }

  chime(): void {
    const { ctx, master } = this;
    if (!ctx || !master || ctx.state !== 'running') return;
    [659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.4);
    });
  }

  close(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
