import {
  DAY,
  EARTH,
  INTEGRATORS,
  KM,
  MOON,
  NBody,
  REAL_PARAMS,
  SUN,
  YEAR,
  buildScenario,
  integrate,
  lagrangePoints,
  linearRegression,
  unwrap,
  type IntegratorId,
} from '../physics';
import { Simulation } from '../sim/Simulation';

export interface IntegratorRun {
  id: IntegratorId;
  name: string;
  t: Float64Array;
  error: Float64Array;
  finalError: number;
  forceEvaluations: number;
  ms: number;
}

/** Reales System über `years` Jahre mit fester Schrittweite – für jeden Integrator. */
export function compareIntegrators(dt: number, years: number): IntegratorRun[] {
  const ids = Object.keys(INTEGRATORS) as IntegratorId[];
  return ids.map((id) => {
    const sys = new NBody(buildScenario(REAL_PARAMS).bodies);
    const e0 = sys.energy();
    const steps = Math.round((years * YEAR) / dt);
    const samples = 400;
    const every = Math.max(1, Math.floor(steps / samples));
    const t: number[] = [];
    const error: number[] = [];
    const t0 = performance.now();
    for (let k = 1; k <= steps; k++) {
      integrate(sys, id, dt);
      if (k % every === 0) {
        t.push((k * dt) / YEAR);
        error.push(Math.abs((sys.energy() - e0) / e0));
      }
    }
    const ms = performance.now() - t0;
    return {
      id,
      name: INTEGRATORS[id].name,
      t: Float64Array.from(t),
      error: Float64Array.from(error),
      finalError: error[error.length - 1] ?? NaN,
      forceEvaluations: sys.forceEvaluations,
      ms,
    };
  });
}

export interface ValidationRow {
  quantity: string;
  simulation: number;
  reference: number;
  unit: string;
  source: string;
  digits: number;
}

function meanPeriod(times: number[]): number {
  if (times.length < 2) return NaN;
  return (times[times.length - 1]! - times[0]!) / (times.length - 1);
}

/** Vergleicht Kenngrößen der Simulation mit gemessenen Werten. */
export function validate(years = 30): {
  rows: ValidationRow[];
  energyError: number;
  steps: number;
} {
  const sim = new Simulation(REAL_PARAMS, { trailCapacity: 2 });
  const { sys } = sim;
  const { sun, earth, moon } = sim.indices;
  const angle = (a: number, b: number): number =>
    Math.atan2(sys.y[b]! - sys.y[a]!, sys.x[b]! - sys.x[a]!);
  const sidereal: number[] = [];
  const synodic: number[] = [];
  const earthYear: number[] = [];
  // Winkel zwischen Mond (von der Erde aus) und Erde (von der Sonne aus): null bei Vollmond.
  const phase = (): number => {
    const a = angle(earth, moon);
    const b = angle(sun, earth);
    return Math.atan2(Math.sin(a - b), Math.cos(a - b));
  };
  let prevMoon = angle(earth, moon);
  let prevSyn = phase();
  let prevEarth = angle(sun, earth);
  // Nulldurchgang von − nach +, mit linearer Interpolation der Zeit.
  const crossing = (
    prev: number,
    cur: number,
    list: number[],
    tPrev: number,
    tCur: number,
  ): void => {
    if (prev < 0 && cur >= 0 && prev > -Math.PI / 2)
      list.push(tPrev + ((tCur - tPrev) * -prev) / (cur - prev));
  };
  let tPrev = 0;
  while (sim.time < years * YEAR) {
    sim.step();
    const t = sim.time;
    const m = angle(earth, moon);
    const e = angle(sun, earth);
    const syn = phase();
    crossing(prevMoon, m, sidereal, tPrev, t);
    crossing(prevSyn, syn, synodic, tPrev, t);
    crossing(prevEarth, e, earthYear, tPrev, t);
    prevMoon = m;
    prevSyn = syn;
    prevEarth = e;
    tPrev = t;
  }
  const s = sim.series;
  const reg = linearRegression(
    s.time.subarray(0, s.length),
    unwrap(s.data.omega.subarray(0, s.length)),
  );
  const muSE = EARTH.mass / (EARTH.mass + SUN.mass);
  const l1 = lagrangePoints(muSE)[0]!;
  const rows: ValidationRow[] = [
    {
      quantity: 'Siderischer Monat',
      simulation: meanPeriod(sidereal) / DAY,
      reference: MOON.siderealPeriod / DAY,
      unit: 'Tage',
      source: 'NASA Moon Fact Sheet',
      digits: 3,
    },
    {
      quantity: 'Synodischer Monat (Neumond zu Neumond)',
      simulation: meanPeriod(synodic) / DAY,
      reference: MOON.synodicPeriod / DAY,
      unit: 'Tage',
      source: 'NASA Moon Fact Sheet',
      digits: 3,
    },
    {
      quantity: 'Siderisches Jahr',
      simulation: meanPeriod(earthYear) / DAY,
      reference: EARTH.siderealYear / DAY,
      unit: 'Tage',
      source: 'IAU',
      digits: 2,
    },
    {
      quantity: 'Umlauf der Apsidenlinie',
      simulation: (2 * Math.PI) / reg.slope / YEAR,
      reference: MOON.apsidalPeriod / YEAR,
      unit: 'Jahre',
      source: 'Meeus, Astronomical Algorithms',
      digits: 2,
    },
    {
      quantity: 'Abstand Erde–L1',
      simulation: (Math.abs(l1.x - (1 - muSE)) * EARTH.semiMajorAxis) / KM / 1e6,
      reference: 1.49,
      unit: 'Mio. km',
      source: 'ESA (SOHO)',
      digits: 3,
    },
  ];
  return { rows, energyError: sim.energyError(), steps: sim.steps };
}
