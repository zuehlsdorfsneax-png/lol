import { describe, expect, it } from 'vitest';
import {
  KM,
  REAL_PARAMS,
  runStability,
  scenarioInfo,
  type ScenarioParams,
} from '../../src/physics';

const base: ScenarioParams = { ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 1 };
const rh = scenarioInfo(base).hillRadius / KM;

describe('runStability', () => {
  it('der reale Mond bleibt 100 Jahre stabil', () => {
    const r = runStability(REAL_PARAMS, { years: 100 });
    expect(r.outcome).toBe('stable');
    // Perigäum/Apogäum schwanken durch die Sonne um die Mittelwerte (≈ 363 000 / 405 000 km).
    expect(r.minDistance / KM).toBeGreaterThan(350_000);
    expect(r.maxDistance / KM).toBeLessThan(410_000);
  });

  it('zu langsam: Absturz, bzw. Zerreißen an der Roche-Grenze', () => {
    expect(runStability({ ...base, moonSpeed: 0.15 }, { years: 1 }).outcome).toBe('crash');
    expect(runStability({ ...base, moonSpeed: 0.25 }, { years: 1, roche: true }).outcome).toBe(
      'roche',
    );
  });

  it('zu schnell oder zu weit außen: Flucht', () => {
    expect(runStability({ ...base, moonSpeed: 1.5 }, { years: 5 }).outcome).toBe('escape');
    expect(runStability({ ...base, moonDistance: 0.6 * rh }, { years: 20 }).outcome).toBe('escape');
  });

  it('retrograde Monde sind weiter außen noch stabil', () => {
    const d = 0.7 * rh;
    expect(runStability({ ...base, moonDistance: d }, { years: 20 }).outcome).toBe('escape');
    expect(
      runStability({ ...base, moonDistance: d, moonRetrograde: true }, { years: 20 }).outcome,
    ).toBe('stable');
  });

  it('ohne Sonne entkommt der Mond erst oberhalb der Fluchtgeschwindigkeit', () => {
    const noSun = { ...base, sunMass: 0 };
    expect(runStability({ ...noSun, moonSpeed: 1.35 }, { years: 5 }).outcome).toBe('stable');
    expect(runStability({ ...noSun, moonSpeed: 1.45 }, { years: 5 }).outcome).toBe('escape');
  });
});
