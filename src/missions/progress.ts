import { SaveStore } from '../engine';

export interface Progress {
  /** Beste Sternezahl je Mission. */
  stars: Record<string, number>;
  /** Bester Wert je Mission (für die Anzeige). */
  best: Record<string, string>;
  quizBest: number;
  /** Sterne je Level in "Lunas Sternenreise". */
  kids: Record<string, number>;
  /** Raketenspiel: zuletzt gebaute Rakete und erreichte Ziele. */
  rocketDesign: string[] | null;
  rocketGoals: string[];
  /** Eigene, benannte Raketen im Hangar. */
  rocketHangar: Record<string, string[]>;
  /** Gewählte Lackierung der Raketen. */
  rocketPaint: string;
  /** Beste Sterne und Ergebnis je Herausforderung der Raketenwerft. */
  rocketChallenges: Record<string, { stars: number; text: string }>;
  /** Ausgesetzte Satelliten (bleiben für spätere Flüge auf ihrer Bahn). */
  rocketSats: unknown[];
  /** Hinweise der Raketenwerft, die schon gezeigt wurden. */
  rocketSeen: string[];
}

export const progressStore = new SaveStore<Progress>('orbitlabor/fortschritt', {
  stars: {},
  best: {},
  quizBest: 0,
  kids: {},
  rocketDesign: null,
  rocketGoals: [],
  rocketHangar: {},
  rocketPaint: 'klassisch',
  rocketChallenges: {},
  rocketSats: [],
  rocketSeen: [],
});

export function recordStars(id: string, stars: number, best: string): Progress {
  return progressStore.update((p) => {
    const old = p.stars[id] ?? 0;
    return stars > old
      ? { ...p, stars: { ...p.stars, [id]: stars }, best: { ...p.best, [id]: best } }
      : p;
  });
}
