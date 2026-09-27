import { EARTH, G, SUN, YEAR } from './constants';
import { dynamicalTimescale, integrate } from './integrators';
import { NBody } from './nbody';
import { buildScenario, type ScenarioParams } from './scenario';

/** Ausgang einer Langzeitsimulation für den Mond. */
export type Outcome = 'stable' | 'crash' | 'roche' | 'escape' | 'sun';

export const OUTCOME_LABELS: Record<Outcome, string> = {
  stable: 'stabil',
  crash: 'Absturz auf die Erde',
  roche: 'zerrissen (Roche-Grenze)',
  escape: 'entkommen',
  sun: 'in die Sonne gestürzt',
};

export interface StabilityOptions {
  years: number;
  /** Genauigkeitsparameter der adaptiven Schrittweite (kleiner = genauer, langsamer). */
  eta?: number;
  /** Unterschreiten der Roche-Grenze als eigenen Ausgang werten. */
  roche?: boolean;
}

export interface StabilityResult {
  outcome: Outcome;
  /** Simulierte Zeit bis zum Ereignis (bzw. volle Dauer) in s. */
  time: number;
  minDistance: number;
  maxDistance: number;
  steps: number;
}

/**
 * Entkommen gilt, sobald der Mond weiter als zwei Hill-Radien von der Erde entfernt ist
 * (ohne Sonne: ungebunden und weiter als das Fünffache des Startabstands).
 */
export const ESCAPE_HILL_FACTOR = 2;

/** Schnelle Langzeitsimulation ohne Aufzeichnung – Grundlage der Stabilitätskarte. */
export function runStability(params: ScenarioParams, options: StabilityOptions): StabilityResult {
  const scenario = buildScenario(params);
  const { indices, info } = scenario;
  const sys = new NBody(scenario.bodies);
  const { sun, earth, moon } = indices;
  const eta = options.eta ?? 0.03;
  const duration = options.years * YEAR;
  const crashDistance = info.earthRadius + info.moonRadius;
  const hillFactor =
    info.sunMass > 0 ? Math.cbrt((info.earthMass + info.moonMass) / (3 * info.sunMass)) : 0;
  const gmEM = G * (info.earthMass + info.moonMass);
  const sunCrash = sun >= 0 ? info.sunRadius : 0;

  let t = 0;
  let steps = 0;
  let minD = Infinity;
  let maxD = 0;
  const finish = (outcome: Outcome): StabilityResult => ({
    outcome,
    time: t,
    minDistance: minD,
    maxDistance: maxD,
    steps,
  });

  while (t < duration) {
    const dt = Math.min(eta * dynamicalTimescale(sys), duration - t);
    integrate(sys, 'verlet', dt);
    t += dt;
    steps++;

    const dx = sys.x[moon]! - sys.x[earth]!;
    const dy = sys.y[moon]! - sys.y[earth]!;
    const d = Math.hypot(dx, dy);
    if (d < minD) minD = d;
    if (d > maxD) maxD = d;
    if (d < crashDistance) return finish('crash');
    if (options.roche && d < info.rocheFluid) return finish('roche');

    if (sun >= 0) {
      const dSun = sys.distance(sun, moon);
      if (dSun < sunCrash) return finish('sun');
      if (sys.distance(sun, earth) < sunCrash) return finish('sun');
      const hill = sys.distance(sun, earth) * hillFactor;
      if (d > ESCAPE_HILL_FACTOR * hill) return finish('escape');
    } else if (d > 5 * info.moonDistance) {
      const dvx = sys.vx[moon]! - sys.vx[earth]!;
      const dvy = sys.vy[moon]! - sys.vy[earth]!;
      if ((dvx * dvx + dvy * dvy) / 2 - gmEM / d > 0) return finish('escape');
    }
  }
  return finish('stable');
}

/** Hill-Radius der realen Erde r_H = a·∛(m/3M) – praktische Bezugsgröße (≈ 1,5 Mio. km). */
export const EARTH_HILL_RADIUS = EARTH.semiMajorAxis * Math.cbrt(EARTH.mass / (3 * SUN.mass));
