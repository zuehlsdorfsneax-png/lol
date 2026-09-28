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

const DEFAULTS: Progress = {
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
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Nur Einträge eines Objekts behalten, deren Wert den Test besteht. */
function entries<V>(v: unknown, ok: (x: unknown) => x is V): Record<string, V> {
  if (!isObject(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, x]) => ok(x))) as Record<string, V>;
}

const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isString = (x: unknown): x is string => typeof x === 'string';
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isString) : []);

/**
 * Gespeicherten Fortschritt Feld für Feld prüfen: Ein kaputtes Feld (von Hand geändert, alte
 * Version) fällt auf die Voreinstellung zurück, statt eine Seite abstürzen zu lassen.
 */
export function sanitizeProgress(p: Progress): Progress {
  return {
    stars: entries(p.stars, isNumber),
    best: entries(p.best, isString),
    quizBest: isNumber(p.quizBest) ? p.quizBest : 0,
    kids: entries(p.kids, isNumber),
    rocketDesign: Array.isArray(p.rocketDesign) ? strings(p.rocketDesign) : null,
    rocketGoals: strings(p.rocketGoals),
    rocketHangar: entries(p.rocketHangar, (x): x is string[] => Array.isArray(x)),
    rocketPaint: isString(p.rocketPaint) ? p.rocketPaint : DEFAULTS.rocketPaint,
    rocketChallenges: entries(
      p.rocketChallenges,
      (x): x is ChallengeRecord => isObject(x) && isNumber(x.stars) && isString(x.text),
    ),
    rocketSats: Array.isArray(p.rocketSats) ? p.rocketSats : [],
    rocketSeen: strings(p.rocketSeen),
    rocketSandbox: p.rocketSandbox ?? null,
  };
}

export const progressStore = new SaveStore<Progress>(
  'orbitlabor/fortschritt',
  DEFAULTS,
  undefined,
  sanitizeProgress,
);

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
