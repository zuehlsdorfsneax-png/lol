import { describe, expect, it } from 'vitest';
import { LEVELS, simulateFlight } from '../src/kids/levels';

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
});
