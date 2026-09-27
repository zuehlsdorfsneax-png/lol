import { describe, expect, it } from 'vitest';
import { DAY, KM, MOON, dayLength, monthLength, synchronousDistance } from '../../src/physics';

describe('Gezeitenentwicklung', () => {
  it('reproduziert heutigen Tag und Monat', () => {
    expect(dayLength(MOON.semiMajorAxis) / 3600).toBeCloseTo(23.93, 2);
    expect(monthLength(MOON.semiMajorAxis) / DAY).toBeCloseTo(27.28, 1);
  });

  it('der Tag wird länger, wenn der Mond sich entfernt', () => {
    expect(dayLength(4e8)).toBeGreaterThan(dayLength(MOON.semiMajorAxis));
  });

  it('Endzustand bei etwa 550 000 km mit Tag = Monat ≈ 47 Tage', () => {
    const a = synchronousDistance();
    expect(a / KM).toBeGreaterThan(530_000);
    expect(a / KM).toBeLessThan(580_000);
    expect(dayLength(a) / DAY).toBeCloseTo(monthLength(a) / DAY, 3);
    expect(monthLength(a) / DAY).toBeGreaterThan(40);
  });
});
