import { beforeEach, describe, expect, it } from 'vitest';
import {
  progressStore,
  recordChallenge,
  sanitizeProgress,
  type Progress,
} from '../src/missions/progress';
import { isSatellite } from '../src/rocket/flight';

const result = (stars: number, text: string) => ({
  success: true,
  stars,
  text,
  met: [0, 1, 2].map((i) => i < stars),
});

describe('Fortschritt: gespeicherte Daten', () => {
  beforeEach(() => progressStore.clear());

  it('Sterne der Missionen und Lunas liegen zwischen 0 und 3', () => {
    const p = sanitizeProgress({
      ...progressStore.load(),
      stars: { m1: 99, m2: -5, m3: 2.5, m4: 2 },
      kids: { l1: 1e9, l2: 3 },
    });
    expect(p.stars).toEqual({ m4: 2 });
    expect(p.kids).toEqual({ l2: 3 });
  });

  it('Herausforderungen: unbekannte Kennungen und kaputtes met fliegen raus', () => {
    const p = sanitizeProgress({
      ...progressStore.load(),
      rocketChallenges: {
        hop: { stars: 3, text: 'x', met: 'abc' },
        fremd: { stars: 3, text: 'y' },
        orbit: { stars: 2, text: 'z', met: [true, true, false] },
      },
    } as unknown as Progress);
    expect(Object.keys(p.rocketChallenges)).toEqual(['hop', 'orbit']);
    expect(p.rocketChallenges.hop).toEqual({ stars: 3, text: 'x' });
    expect(p.rocketChallenges.orbit?.met).toEqual([true, true, false]);
  });

  it('gleiche Sternzahl ersetzt das gespeicherte beste Ergebnis nicht', () => {
    recordChallenge('hop', result(2, 'Gelandet mit 69 %.'));
    recordChallenge('hop', result(2, 'Gelandet mit 52 %.'));
    expect(progressStore.load().rocketChallenges.hop?.text).toBe('Gelandet mit 69 %.');
    recordChallenge('hop', result(3, 'Perfekt!'));
    expect(progressStore.load().rocketChallenges.hop?.text).toBe('Perfekt!');
  });
});

describe('Satelliten aus dem Speicher', () => {
  const el = { mu: 1, a: 1, e: 0, argp: 0, m0: 0, t0: 0, n: 1, dir: 1, p: 1 };

  it('nimmt vollständige Einträge an', () => {
    expect(isSatellite({ id: 1, name: 'S', body: 'earth', el })).toBe(true);
  });

  it('weist unbekannte Körper und unvollständige Bahnen ab', () => {
    expect(isSatellite({ id: 1, name: 'S', body: 'saturn', el })).toBe(false);
    expect(isSatellite({ id: 1, name: 'S', body: 'earth', el: { a: 1, n: 1 } })).toBe(false);
    expect(isSatellite({ id: 1, name: 'S', body: 'earth', el: { ...el, dir: 0 } })).toBe(false);
    expect(isSatellite(null)).toBe(false);
  });
});
