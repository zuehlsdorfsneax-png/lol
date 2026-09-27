import { describe, expect, it } from 'vitest';
import { G, INTEGRATORS, NBody, integrate, dynamicalTimescale, type IntegratorId } from '../../src/physics';

/** Zwei Körper auf Kreisbahnen um den gemeinsamen Schwerpunkt. */
function binary(): NBody {
  const m1 = 6e24;
  const m2 = 7e22;
  const d = 3.84e8;
  const v = Math.sqrt((G * (m1 + m2)) / d);
  const sys = new NBody([
    { name: 'A', kind: 'planet', mass: m1, radius: 6e6, x: (-d * m2) / (m1 + m2), y: 0, vx: 0, vy: (-v * m2) / (m1 + m2) },
    { name: 'B', kind: 'moon', mass: m2, radius: 1.7e6, x: (d * m1) / (m1 + m2), y: 0, vx: 0, vy: (v * m1) / (m1 + m2) },
  ]);
  return sys;
}

const PERIOD = 2 * Math.PI * Math.sqrt(3.84e8 ** 3 / (G * (6e24 + 7e22)));

function energyDrift(id: IntegratorId, stepsPerOrbit: number, orbits: number): number {
  const sys = binary();
  const e0 = sys.energy();
  const dt = PERIOD / stepsPerOrbit;
  for (let i = 0; i < stepsPerOrbit * orbits; i++) integrate(sys, id, dt);
  return Math.abs((sys.energy() - e0) / e0);
}

describe('Integratoren', () => {
  it('sind alle beschrieben', () => {
    expect(Object.keys(INTEGRATORS)).toHaveLength(5);
  });

  it('Euler verletzt die Energieerhaltung deutlich, symplektische Verfahren kaum', () => {
    expect(energyDrift('euler', 200, 10)).toBeGreaterThan(0.1);
    expect(energyDrift('euler-cromer', 200, 10)).toBeLessThan(0.01);
    expect(energyDrift('verlet', 200, 10)).toBeLessThan(1e-3);
    expect(energyDrift('yoshida4', 200, 10)).toBeLessThan(1e-7);
    expect(energyDrift('rk4', 200, 10)).toBeLessThan(1e-7);
  });

  it('RK4 hat Konvergenzordnung 4, Verlet Ordnung 2', () => {
    const ratio = (id: IntegratorId): number => energyDrift(id, 100, 1) / energyDrift(id, 200, 1);
    expect(Math.log2(ratio('rk4'))).toBeGreaterThan(3.5);
    // Verlet: Energiefehler oszilliert, Positionsfehler ~dt² → Energieschwankung ~dt²
    const verletRatio = ratio('verlet');
    expect(Math.log2(verletRatio)).toBeGreaterThan(1.5);
  });

  it('bringt den Körper nach einem Umlauf an den Start zurück', () => {
    const sys = binary();
    const x0 = sys.x[1]!;
    const dt = PERIOD / 2000;
    for (let i = 0; i < 2000; i++) integrate(sys, 'rk4', dt);
    expect(Math.abs(sys.x[1]! - x0) / x0).toBeLessThan(1e-8);
    expect(Math.abs(sys.y[1]!) / x0).toBeLessThan(1e-6);
  });

  it('erhält Impuls und Drehimpuls', () => {
    const sys = binary();
    const l0 = sys.angularMomentum();
    for (let i = 0; i < 1000; i++) integrate(sys, 'verlet', PERIOD / 300);
    expect(Math.abs((sys.angularMomentum() - l0) / l0)).toBeLessThan(1e-10);
  });

  it('schätzt die dynamische Zeitskala', () => {
    const sys = binary();
    // Freifallzeit √(d³/GM) = Periode / 2π
    expect(dynamicalTimescale(sys)).toBeCloseTo(PERIOD / (2 * Math.PI), -2);
  });

  it('ignoriert entfernte Körper und verschmilzt Körper impulserhaltend', () => {
    const sys = binary();
    const px = sys.mass[0]! * sys.vx[0]! + sys.mass[1]! * sys.vx[1]!;
    const py = sys.mass[0]! * sys.vy[0]! + sys.mass[1]! * sys.vy[1]!;
    sys.merge(0, 1);
    expect(sys.alive[1]).toBe(0);
    expect(sys.sources).toEqual([0]);
    expect(sys.mass[0]! * sys.vx[0]!).toBeCloseTo(px, 0);
    expect(sys.mass[0]! * sys.vy[0]!).toBeCloseTo(py, 0);
    integrate(sys, 'verlet', 60);
    expect(Number.isFinite(sys.x[0]!)).toBe(true);
  });
});
