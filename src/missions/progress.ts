import { SaveStore } from '../engine';

/** Bestes Ergebnis einer Herausforderung; `met` = je Stern-Bedingung, ob sie je erfüllt wurde. */
export interface ChallengeRecord {
  stars: number;
  text: string;
  met?: boolean[];
}

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
  rocketChallenges: Record<string, ChallengeRecord>;
  /** Ausgesetzte Satelliten (bleiben für spätere Flüge auf ihrer Bahn). */
  rocketSats: unknown[];
  /** Hinweise der Raketenwerft, die schon gezeigt wurden. */
  rocketSeen: string[];
  /** Einstellungen des Sandkastens (werden in der Raketenwerft geprüft). */
  rocketSandbox: unknown;
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
  rocketSandbox: null,
});

export function recordStars(id: string, stars: number, best: string): Progress {
  return progressStore.update((p) => {
    const old = p.stars[id] ?? 0;
    return stars > old
      ? { ...p, stars: { ...p.stars, [id]: stars }, best: { ...p.best, [id]: best } }
      : p;
  });
}

/** Spielstände der Raketenwerft (Schnellspeichern), die außerhalb des Fortschritts liegen. */
const ROCKET_SAVES = ['orbitlabor/rakete-spielstand', 'orbitlabor/rakete-spielstand-sandkasten'];

function removeKeys(keys: readonly string[]): void {
  try {
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // Ohne Speicherzugriff gibt es nichts zu löschen.
  }
}

/** Karriere der Raketenwerft neu beginnen: Punkte, Sterne, Satelliten, Spielstände. */
export function resetRocketCareer(): Progress {
  removeKeys(ROCKET_SAVES);
  return progressStore.update((p) => ({
    ...p,
    rocketGoals: [],
    rocketChallenges: {},
    rocketSats: [],
    rocketSeen: [],
    rocketPaint: 'klassisch',
  }));
}

/** Allen Fortschritt der App löschen (Missionen, Quiz, Luna, Raketenwerft mit Hangar). */
export function resetAllProgress(): Progress {
  removeKeys(ROCKET_SAVES);
  progressStore.clear();
  return progressStore.load();
}
