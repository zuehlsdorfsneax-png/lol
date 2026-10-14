import { describe, expect, it } from 'vitest';
import {
  DAY,
  KM,
  MOON,
  REAL_PARAMS,
  YEAR,
  assessStability,
  linearRegression,
  unwrap,
} from '../../src/physics';
import { SeriesBuffer, TrailBuffer } from '../../src/sim/buffers';
import { Simulation, formatDuration } from '../../src/sim/Simulation';

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

  it('hält die Spur über zehn Jahre', () => {
    const sim = new Simulation(REAL_PARAMS);
    sim.advance(10 * YEAR);
    expect(sim.time - sim.trail.time(0)).toBeGreaterThan(9.9 * YEAR);
  });

  it('meldet ohne Sonne keinen Hill-Anteil', () => {
    const sim = new Simulation({ ...REAL_PARAMS, sunMass: 0 });
    sim.advance(30 * DAY);
    expect(sim.stats().hillFraction).toBeNaN();
    expect(sim.series.data.hillFraction[sim.series.length - 1]).toBeNaN();
  });

  it('warnt vor der Roche-Grenze nur einmal je Annäherung', () => {
    const sim = new Simulation({ ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 0.27 });
    let warnings = 0;
    while (sim.time < 60 * DAY) {
      sim.step();
      if (sim.pending?.kind === 'roche') {
        warnings++;
        sim.acknowledge();
      }
    }
    expect(warnings).toBeLessThanOrEqual(1);
  });

  it('zählt ein entkommenes Teilchen beim späteren Absturz nicht doppelt', () => {
    const sim = new Simulation({
      ...REAL_PARAMS,
      particles: { count: 1, innerKm: 100_000, outerKm: 100_000, retrograde: false },
    });
    const { earth, firstParticle: p } = sim.indices;
    const { sys } = sim;
    sys.x[p] = sys.x[earth]! + 1e10;
    sys.y[p] = sys.y[earth]!;
    sim.step();
    expect(sim.stats().particles.escaped).toBe(1);
    sys.x[p] = sys.x[earth]! + 0.5 * sys.radius[earth]!;
    sys.y[p] = sys.y[earth]!;
    sys.vx[p] = sys.vx[earth]!;
    sys.vy[p] = sys.vy[earth]!;
    sim.step();
    const { crashed, escaped } = sim.stats().particles;
    expect(crashed + escaped).toBe(1);
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
    expect(
      assessStability({ ...base, moonSpeed: 1.5 }).checks.find((c) => c.id === 'escape')?.status,
    ).toBe('fail');
    expect(
      assessStability({ ...base, moonDistance: 900_000 }).checks.find((c) => c.id === 'hill')
        ?.status,
    ).toBe('fail');
    expect(
      assessStability({ ...base, sunMass: 0 }).checks.find((c) => c.id === 'jacobi')?.status,
    ).toBe('na');
  });
});

describe('assessStability mit Störkörper', () => {
  it('nennt die Prognose grenzwertig, weil sie den Störkörper nicht kennt', () => {
    const a = assessStability({
      ...REAL_PARAMS,
      intruder: { mass: 317.8, distance: 500_000, speed: 20, leadDays: 20 },
    });
    expect(a.checks.find((c) => c.id === 'intruder')?.status).toBe('warn');
    expect(a.verdict).toBe('marginal');
  });
});

describe('Puffer', () => {
  it('TrailBuffer dünnt aus, statt die ältesten Einträge zu verlieren', () => {
    const t = new TrailBuffer(4, 1);
    for (let i = 0; i < 6; i++) t.push(i, [i, -i]);
    expect(t.stride).toBe(2);
    expect(t.time(0)).toBe(0);
    expect(t.time(t.length - 1)).toBe(5);
    expect(t.x(1, 0)).toBe(2);
    expect(t.y(1, 0)).toBe(-2);
  });

  it('SeriesBuffer halbiert die Auflösung, wenn er voll ist', () => {
    const s = new SeriesBuffer(['v'] as const, 4, 1);
    for (let t = 0; t < 5; t++) if (s.due(t)) s.push(t, { v: t * 10 });
    expect(s.interval).toBe(2);
    expect(Array.from(s.time.subarray(0, s.length))).toEqual([0, 2, 4]);
    expect(s.toCsv({ time: 'Zeit', v: 'Wert' })).toBe('Zeit;Wert\n0;0\n2;20\n4;40');
  });
});

describe('formatDuration', () => {
  it('beugt die Einheit nach der Zahl und bleibt unter einer Stunde genau', () => {
    expect(formatDuration(DAY)).toBe('1 Tag');
    expect(formatDuration(3600)).toBe('1 Stunde');
    expect(formatDuration(3 * 3600)).toBe('3 Stunden');
    expect(formatDuration(3.6)).toBe('3,6 Sekunden');
    expect(formatDuration(600)).toBe('10 Minuten');
    expect(formatDuration(5 * DAY)).toBe('5 Tagen');
  });
});
