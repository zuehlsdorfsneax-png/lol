import { SaveStore } from '../engine';

export interface Progress {
  /** Beste Sternezahl je Mission. */
  stars: Record<string, number>;
  /** Bester Wert je Mission (für die Anzeige). */
  best: Record<string, string>;
  quizBest: number;
  /** Sterne je Level in "Lunas Sternenreise". */
  kids: Record<string, number>;
}

export const progressStore = new SaveStore<Progress>('orbitlabor/fortschritt', {
  stars: {},
  best: {},
  quizBest: 0,
  kids: {},
});

export function recordStars(id: string, stars: number, best: string): Progress {
  return progressStore.update((p) => {
    const old = p.stars[id] ?? 0;
    return stars > old
      ? { ...p, stars: { ...p.stars, [id]: stars }, best: { ...p.best, [id]: best } }
      : p;
  });
}
