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

  /** Spielt einen synthetischen Ton. */
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
