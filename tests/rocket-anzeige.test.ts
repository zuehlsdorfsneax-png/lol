import { describe, expect, it } from 'vitest';
import { LandingPilot } from '../src/rocket/autopilot';
import { Flight, groundSpeed } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { EUROPA } from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];
const DT = 1 / 60;

describe('Tempo-Anzeige auf drehenden Monden', () => {
  it('gelandet auf Europa zeigt die Anzeige 0 m/s, obwohl der Mittelpunkt 9,6 m/s zeigt', () => {
    const f = new Flight(template('faehre'));
    f.placeLanded(EUROPA, 0.4);
    const rel = f.relative(EUROPA);
    expect(Math.hypot(rel.vx, rel.vy)).toBeGreaterThan(9);
    expect(groundSpeed(f)).toBeLessThan(1e-6);
  });

  it('nach der Landung mit dem Lande-Autopiloten bleibt die Anzeige bei 0', () => {
    const f = new Flight(template('faehre'));
    f.placeInOrbit(EUROPA, 30_000, 1);
    const pilot = new LandingPilot();
    for (let i = 0; i < 60 * 4000 && f.status === 'flying'; i++) {
      if (pilot.update(f) === 'failed') break;
      f.update(DT);
    }
    expect(f.status, pilot.message).toBe('landed');
    for (let i = 0; i < 60 * 5; i++) f.update(DT);
    expect(f.status).toBe('landed');
    expect(groundSpeed(f)).toBeLessThan(1e-6);
  });

  it('kurz vor dem Aufsetzen zeigt die Anzeige das Tempo, das der Landepilot misst', () => {
    const f = new Flight(template('faehre'));
    f.placeInOrbit(EUROPA, 30_000, 1);
    const pilot = new LandingPilot();
    let beforeTouchdown = NaN;
    for (let i = 0; i < 60 * 4000 && f.status === 'flying'; i++) {
      if (pilot.update(f) === 'failed') break;
      beforeTouchdown = groundSpeed(f);
      f.update(DT);
    }
    expect(f.status, pilot.message).toBe('landed');
    expect(Math.abs(beforeTouchdown - f.stats.lastLanding!.speed)).toBeLessThan(0.5);
  });

  it('das Tempo springt zwischen 20 und 30 km nicht und endet beim Mittelpunkt', () => {
    // Jede Höhe bekommt ihre Kreisbahn: Der Mittelpunktwert wird im selben Zustand gemessen.
    const at = (altitude: number) => {
      const f = new Flight(template('faehre'));
      f.placeInOrbit(EUROPA, altitude, 0);
      const rel = f.relative();
      return { ground: groundSpeed(f), center: Math.hypot(rel.vx, rel.vy) };
    };
    const samples = [19_000, 20_000, 20_500, 25_000, 29_500].map(at);
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i]!.ground - samples[i - 1]!.ground)).toBeLessThan(8);
    }
    const above = at(30_000);
    expect(above.ground).toBeCloseTo(above.center, 6);
  });
});
