/**
 * Klänge der Raketenwerft, alles live erzeugt (kein Tonmaterial nötig): Triebwerksgrollen,
 * Fahrtwind, RCS-Zischen, Explosion, Stufentrennung, Andocken, Fallschirm, Warnpiepen, Fanfare und
 * ein gesprochener Countdown. Startet erst nach einer Nutzeraktion (Vorgabe der Browser) und stört
 * nie: Ohne Web Audio bleibt es einfach still.
 */
export class RocketAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private rcsGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private white: AudioBuffer | null = null;
  muted = false;
  /** Sprachausgabe für den Countdown (falls der Browser sie kann). */
  voice = true;

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
        this.white = ctx.createBuffer(1, len, ctx.sampleRate);
        const brown = this.noise.getChannelData(0);
        const white = this.white.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          white[i] = w * 0.5;
          // Braunes Rauschen: tiefes Grollen statt Zischen.
          last = (last + 0.02 * w) / 1.02;
          brown[i] = last * 3.5;
        }
        const loop = (buffer: AudioBuffer): AudioBufferSourceNode => {
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.loop = true;
          src.start();
          return src;
        };
        // Triebwerk
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 400;
        this.engineGain = ctx.createGain();
        this.engineGain.gain.value = 0;
        loop(this.noise).connect(this.filter).connect(this.engineGain).connect(this.master);
        // Fahrtwind
        this.windFilter = ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 500;
        this.windFilter.Q.value = 0.8;
        this.windGain = ctx.createGain();
        this.windGain.gain.value = 0;
        loop(this.white).connect(this.windFilter).connect(this.windGain).connect(this.master);
        // RCS-Düsen
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2500;
        this.rcsGain = ctx.createGain();
        this.rcsGain.gain.value = 0;
        loop(this.white).connect(hp).connect(this.rcsGain).connect(this.master);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.6;
    if (muted) this.stopVoice();
  }

  /** Lautstärke des Triebwerks (0…1) und Luftdichte (dumpfer im Vakuum). */
  engine(level: number, air: number): void {
    if (!this.ctx || !this.engineGain || !this.filter) return;
    const now = this.ctx.currentTime;
    const loud = level * (0.25 + 0.75 * Math.min(1, air / 0.3));
    this.engineGain.gain.setTargetAtTime(loud * 0.9, now, 0.08);
    this.filter.frequency.setTargetAtTime(180 + 700 * level * Math.min(1, air + 0.2), now, 0.1);
  }

  /** Fahrtwind aus dem Staudruck (½ρv²) und Zischen der RCS-Düsen. */
  ambience(dynamicPressure: number, rcs: boolean): void {
    if (!this.ctx || !this.windGain || !this.windFilter || !this.rcsGain) return;
    const now = this.ctx.currentTime;
    const q = Math.min(1, dynamicPressure / 40_000);
    this.windGain.gain.setTargetAtTime(q * 0.5, now, 0.15);
    this.windFilter.frequency.setTargetAtTime(300 + 1400 * q, now, 0.2);
    this.rcsGain.gain.setTargetAtTime(rcs ? 0.12 : 0, now, 0.03);
  }

  private burst(
    duration: number,
    freq: number,
    volume: number,
    type: BiquadFilterType = 'lowpass',
  ): void {
    const { ctx, master, noise } = this;
    if (!ctx || !master || !noise || ctx.state !== 'running') return;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(volume, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(f).connect(g).connect(master);
    src.start(now, Math.random());
    src.stop(now + duration);
  }

  private tone(
    freq: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'triangle',
  ): void {
    const { ctx, master } = this;
    if (!ctx || !master || ctx.state !== 'running') return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime + start;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  explosion(): void {
    // Lautstärken unter 1, sonst übersteuert der Knall.
    this.burst(1.8, 500, 0.95);
    this.burst(0.5, 2000, 0.45);
  }

  clunk(): void {
    this.burst(0.25, 1200, 0.8);
  }

  /** Fallschirm entfaltet sich: kurzes Flattern. */
  chute(): void {
    this.burst(0.5, 900, 0.5, 'bandpass');
  }

  /** Andockklammern schnappen zu. */
  dock(): void {
    this.burst(0.15, 3000, 0.5, 'bandpass');
    this.tone(220, 0, 0.35, 0.25, 'square');
    this.tone(330, 0.05, 0.3, 0.12, 'square');
  }

  /** Kurzer Piepton (Countdown, Hinweis). */
  beep(high = false): void {
    this.tone(high ? 1320 : 880, 0, high ? 0.5 : 0.12, 0.15, 'sine');
  }

  /** Warnton (Bremsen!). */
  alarm(): void {
    this.tone(660, 0, 0.12, 0.12, 'square');
    this.tone(660, 0.18, 0.12, 0.12, 'square');
  }

  chime(): void {
    [659.25, 783.99, 1046.5].forEach((freq, i) => this.tone(freq, i * 0.12, 0.35, 0.12));
  }

  /** Fanfare für Sterne einer Herausforderung. */
  fanfare(stars: number): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.slice(0, 2 + stars).forEach((freq, i) => this.tone(freq, i * 0.16, 0.5, 0.13));
  }

  /** Spricht einen kurzen Text (Countdown), wenn der Browser Sprachausgabe hat. */
  say(text: string): void {
    if (this.muted || !this.voice) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = 1.1;
      synth.cancel();
      synth.speak(u);
    } catch {
      // Ohne Sprachausgabe bleibt es bei den Pieptönen.
    }
  }

  private stopVoice(): void {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // nichts zu tun
    }
  }

  close(): void {
    this.stopVoice();
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
