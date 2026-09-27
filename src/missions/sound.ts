import { SoundPlayer } from '../engine';

/** Gemeinsamer Tonausgang für Spielereignisse (startet erst nach einer Nutzeraktion). */
export const sound = new SoundPlayer();

export function playSuccess(stars: number): void {
  sound.unlock();
  const notes = [523.25, 659.25, 783.99, 1046.5].slice(0, stars + 1);
  notes.forEach((f, i) => setTimeout(() => sound.tone(f, 0.18, 'triangle', 0.12), i * 130));
}

export function playFailure(): void {
  sound.unlock();
  sound.tone(196, 0.35, 'sawtooth', 0.08);
}
