import { describe, expect, it } from 'vitest';
import { DAY, KM, MOON, REAL_PARAMS, YEAR, assessStability, linearRegression, unwrap } from '../../src/physics';
import { SeriesBuffer, TrailBuffer } from '../../src/sim/buffers';
import { Simulation } from '../../src/sim/Simulation';

describe('Simulation', () => {
  it('reproduziert den siderischen Monat', () => {
    const sim = new Simulation(REAL_PARAMS);
    const { earth, moon } = sim.indices;
    const angle = (): number =>
      Math.atan2(sim.sys.y[moon]! - sim.sys.y[earth]!, sim.sys.x[moon]! - sim.sys.x[earth]!);
    let prev = angle();
    const crossings: number[] = [];
    while (sim.time < 200 * DAY) {
      sim.step();
      const a = angle();
      if (prev < 0 && a >= 0) crossings.push(sim.time);
      prev = a;
    }
    const periods = crossings.slice(1).map((t, i) => t - crossings[i]!);
    const mean = periods.reduce((s, p) => s + p, 0) / periods.length;
    expect(mean / DAY).toBeCloseTo(MOON.siderealPeriod / DAY, 0);
  });

  it('reproduziert die Drehung der Apsidenlinie (≈ 8,85 Jahre)', () => {
    const sim = new Simulation(REAL_PARAMS, { trailCapacity: 10 });
    sim.advance(30 * YEAR);
    const { time, data, length } = sim.series;
    const reg = linearRegression(time.subarray(0, length), unwrap(data.omega.subarray(0, length)));
    const period = (2 * Math.PI) / reg.slope / YEAR;
    expect(period).toBeGreaterThan(8.5);
    expect(period).toBeLessThan(9.2);
  });

  it('hält die Energie mit Verlet sehr genau', () => {
    const sim = new Simulation(REAL_PARAMS);
    sim.advance(5 * YEAR);
    expect(sim.energyError()).toBeLessThan(1e-6);
    expect(sim.pending).toBeNull();
  });

  it('meldet Absturz und Roche-Grenze', () => {
    const sim = new Simulation({ ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 0.1 });
    sim.advance(YEAR);
    expect(sim.pending?.kind).toBe('roche');
    sim.acknowledge();
    sim.advance(YEAR);
    expect(sim.pending?.kind).toBe('crash');
    expect(sim.moonAlive).toBe(false);
    expect(sim.stats().moonAlive).toBe(false);
  });

  it('meldet die Flucht des Mondes', () => {
    const sim = new Simulation({ ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 1.5 });
    sim.advance(5 * YEAR);
    expect(sim.pending?.kind).toBe('escape');
  });

  it('zählt Testteilchen, die abstürzen oder entkommen', () => {
    const sim = new Simulation({
      ...REAL_PARAMS,
      particles: { count: 30, innerKm: 100_000, outerKm: 1_400_000, retrograde: false },
    });
    sim.advance(YEAR);
    const { particles } = sim.stats();
    expect(particles.total).toBe(30);
    // Die äußeren Teilchen (jenseits von ≈ 0,5 r_H) entreißt die Sonne.
    expect(particles.escaped).toBeGreaterThan(5);
    expect(particles.alive).toBeLessThan(30);
  });

  it('liefert Live-Werte', () => {
    const sim = new Simulation(REAL_PARAMS);
    sim.advance(10 * DAY);
    const s = sim.stats();
    expect(s.distance / KM).toBeGreaterThan(350_000);
    expect(s.hillFraction).toBeGreaterThan(0.2);
    expect(s.hillFraction).toBeLessThan(0.3);
    expect(s.pullRatio).toBeGreaterThan(1.5);
    expect(s.jacobi?.trapped).toBe(true);
    expect(sim.trail.length).toBeGreaterThan(30);
  });
});

describe('assessStability', () => {
  it('bewertet das reale System als stabil', () => {
    const a = assessStability(REAL_PARAMS);
    expect(a.verdict).toBe('stable');
    expect(a.checks.every((c) => c.status === 'ok')).toBe(true);
  });

  it('erkennt Absturz, Flucht und zu große Abstände', () => {
    const base = { ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 1 };
    const crash = assessStability({ ...base, moonSpeed: 0.1 });
    expect(crash.verdict).toBe('unstable');
    expect(crash.checks.find((c) => c.id === 'crash')?.status).toBe('fail');
    expect(assessStability({ ...base, moonSpeed: 1.5 }).checks.find((c) => c.id === 'escape')?.status).toBe('fail');
    expect(assessStability({ ...base, moonDistance: 900_000 }).checks.find((c) => c.id === 'hill')?.status).toBe('fail');
    expect(assessStability({ ...base, sunMass: 0 }).checks.find((c) => c.id === 'jacobi')?.status).toBe('na');
  });
});

describe('Puffer', () => {
  it('TrailBuffer überschreibt die ältesten Einträge', () => {
    const t = new TrailBuffer(3, 1);
    for (let i = 0; i < 5; i++) t.push(i, [i, -i]);
    expect(t.length).toBe(3);
    expect(t.time(0)).toBe(2);
    expect(t.x(2, 0)).toBe(4);
    expect(t.y(2, 0)).toBe(-4);
  });

  it('SeriesBuffer halbiert die Auflösung, wenn er voll ist', () => {
    const s = new SeriesBuffer(['v'] as const, 4, 1);
    for (let t = 0; t < 5; t++) if (s.due(t)) s.push(t, { v: t * 10 });
    expect(s.interval).toBe(2);
    expect(Array.from(s.time.subarray(0, s.length))).toEqual([0, 2, 4]);
    expect(s.toCsv({ time: 'Zeit', v: 'Wert' })).toBe('Zeit;Wert\n0;0\n2;20\n4;40');
  });
});
