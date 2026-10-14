import { describe, expect, it } from 'vitest';
import { HEIGHT, LEVELS, STAR_R, WIDTH, simulateFlight, starsFor } from '../src/kids/levels';

describe('Lunas Sternenreise', () => {
  it.each(LEVELS.map((l) => [l.id, l.name, l] as const))(
    'Level %i (%s) ist mit der hinterlegten Lösung schaffbar',
    (_id, _n, level) => {
      const r = simulateFlight(level, level.solution.vx, level.solution.vy);
      expect(r.outcome).toBe('win');
    },
  );

  it('ohne Schwung stürzt Luna auf die Erde', () => {
    expect(simulateFlight(LEVELS[0]!, 0, 0).outcome).toBe('earth');
  });

  it('mit zu viel Schwung fliegt Luna davon', () => {
    expect(simulateFlight(LEVELS[0]!, -300, 0).outcome).toBe('lost');
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    'Level %i: alle Sterne liegen im Spielfeld und berühren sich nicht',
    (_id, level) => {
      const stars = starsFor(level);
      for (const st of stars) {
        expect(st.x).toBeGreaterThanOrEqual(STAR_R);
        expect(st.x).toBeLessThanOrEqual(WIDTH - STAR_R);
        expect(st.y).toBeGreaterThanOrEqual(STAR_R);
        expect(st.y).toBeLessThanOrEqual(HEIGHT - STAR_R);
      }
      for (let i = 0; i < stars.length; i++)
        for (let j = i + 1; j < stars.length; j++)
          expect(Math.hypot(stars[i]!.x - stars[j]!.x, stars[i]!.y - stars[j]!.y)).toBeGreaterThan(
            2 * STAR_R,
          );
    },
  );
});
