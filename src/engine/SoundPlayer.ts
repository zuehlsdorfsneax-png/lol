/**
 * Minimale Audio-Schicht auf Basis der Web Audio API. Browser erlauben Ton erst nach einer
 * Nutzerinteraktion – `Game` ruft dafür bei Klick/Tastendruck automatisch `unlock()` auf.
 */
export class SoundPlayer {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private isMuted = false;

  get muted(): boolean {
    return this.isMuted;
  }

  set muted(value: boolean) {
    this.isMuted = value;
    if (this.master) this.master.gain.value = value ? 0 : 1;
  }

  unlock(): void {
    const context = this.ensureContext();
    if (context?.state === 'suspended') void context.resume();
  }

  /** Lädt und dekodiert eine Sounddatei (z. B. .ogg, .mp3, .wav). */
  async load(url: string): Promise<AudioBuffer> {
    const context = this.ensureContext();
    if (!context) throw new Error('Web Audio wird von diesem Browser nicht unterstützt.');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sound konnte nicht geladen werden: ${url}`);
    return context.decodeAudioData(await response.arrayBuffer());
  }

  play(buffer: AudioBuffer, volume = 1): void {
    const { context, master } = this;
    if (!context || !master || context.state !== 'running') return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(master);
    source.start();
  }

  /** Spielt einen synthetischen Ton – praktisch für Prototypen ohne Sounddateien. */
  tone(frequency: number, duration = 0.1, type: OscillatorType = 'square', volume = 0.15): void {
    const { context, master } = this;
    if (!context || !master || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof AudioContext === 'undefined') return null;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.isMuted ? 0 : 1;
    this.master.connect(this.context.destination);
    return this.context;
  }
}
