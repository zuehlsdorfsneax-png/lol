import { describe, expect, it } from 'vitest';
import {
  circularSpeed,
  eccentricityFromTangentialStart,
  escapeSpeed,
  orbitalElements,
  periapsisFromTangentialStart,
  visViva,
} from '../../src/physics';

const mu = 4e14;

describe('orbitalElements', () => {
  it('erkennt eine Kreisbahn', () => {
    const r = 4e8;
    const el = orbitalElements(mu, r, 0, 0, circularSpeed(mu, r));
    expect(el.e).toBeCloseTo(0, 10);
    expect(el.a).toBeCloseTo(r, 0);
    expect(el.bound).toBe(true);
    expect(el.h).toBeGreaterThan(0);
    expect(el.period).toBeCloseTo(2 * Math.PI * Math.sqrt(r ** 3 / mu), 0);
  });

  it('berechnet Periapsis, Apoapsis und Richtung einer Ellipse', () => {
    const r = 4e8;
    const f = 0.8;
    const el = orbitalElements(mu, 0, r, -f * circularSpeed(mu, r), 0);
    expect(el.e).toBeCloseTo(eccentricityFromTangentialStart(f), 10);
    expect(el.apoapsis).toBeCloseTo(r, 0);
    expect(el.periapsis).toBeCloseTo(periapsisFromTangentialStart(r, f), 0);
    // Start bei der Apoapsis auf der +y-Achse → Periapsis zeigt nach −y.
    expect(el.omega).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('erkennt ungebundene und rückläufige Bahnen', () => {
    const r = 4e8;
    const el = orbitalElements(mu, r, 0, 0, -1.01 * escapeSpeed(mu, r));
    expect(el.bound).toBe(false);
    expect(el.apoapsis).toBe(Infinity);
    expect(el.period).toBeNaN();
    expect(el.h).toBeLessThan(0);
  });

  it('erfüllt die Vis-viva-Gleichung', () => {
    const r = 4e8;
    const el = orbitalElements(mu, r, 0, 0, 1.2 * circularSpeed(mu, r));
    expect(visViva(mu, r, el.a)).toBeCloseTo(el.v, 6);
    expect(escapeSpeed(mu, r) / circularSpeed(mu, r)).toBeCloseTo(Math.SQRT2, 12);
  });
});
