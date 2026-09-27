import { describe, expect, it } from 'vitest';
import {
  EARTH,
  G,
  MOON,
  REAL_PARAMS,
  ROUTH_MU,
  SUN,
  buildScenario,
  hillApproximation,
  integrateOrbit,
  jacobiCheck,
  jacobiConstant,
  lagrangePoints,
  linearStability,
  potentialGradient,
  rk4Step,
  type State4,
} from '../../src/physics';

const MU_SE = EARTH.mass / (EARTH.mass + SUN.mass);
const MU_EM = MOON.mass / (MOON.mass + EARTH.mass);

describe('Lagrange-Punkte', () => {
  it('sind Gleichgewichtspunkte (Gradient des effektiven Potentials verschwindet)', () => {
    for (const mu of [MU_SE, MU_EM, 0.3]) {
      for (const p of lagrangePoints(mu)) {
        const [gx, gy] = potentialGradient(mu, p.x, p.y);
        expect(Math.abs(gx)).toBeLessThan(1e-9);
        expect(Math.abs(gy)).toBeLessThan(1e-9);
      }
    }
  });

  it('L4 und L5 bilden gleichseitige Dreiecke mit den Hauptkörpern', () => {
    const mu = 0.1;
    const l4 = lagrangePoints(mu)[3]!;
    expect(Math.hypot(l4.x + mu, l4.y)).toBeCloseTo(1, 12);
    expect(Math.hypot(l4.x - 1 + mu, l4.y)).toBeCloseTo(1, 12);
  });

  it('L1 und L2 der Erde liegen ≈ 1,5 Mio. km entfernt (Hill-Näherung)', () => {
    const [l1, l2] = lagrangePoints(MU_SE);
    const km = (x: number): number => (Math.abs(x - (1 - MU_SE)) * EARTH.semiMajorAxis) / 1000;
    expect(km(l1!.x)).toBeCloseTo(1.49e6, -4);
    expect(km(l2!.x)).toBeCloseTo(1.5e6, -4);
    expect(Math.abs(l1!.x - (1 - MU_SE)) / hillApproximation(MU_SE)).toBeCloseTo(1, 1);
  });

  it('L1–L3 sind instabil, L4/L5 nur unterhalb des Routh-Werts stabil', () => {
    expect(ROUTH_MU).toBeCloseTo(0.03852, 5);
    const pts = lagrangePoints(MU_EM);
    expect(pts.slice(0, 3).every((p) => !linearStability(MU_EM, p).stable)).toBe(true);
    expect(pts.slice(3).every((p) => linearStability(MU_EM, p).stable)).toBe(true);
    const above = ROUTH_MU * 1.05;
    expect(linearStability(above, lagrangePoints(above)[3]!).stable).toBe(false);
    const below = ROUTH_MU * 0.95;
    expect(linearStability(below, lagrangePoints(below)[3]!).stable).toBe(true);
  });

  it('Eigenwerte an L4 sind für stabile Fälle rein imaginär', () => {
    const { eigenvalues } = linearStability(MU_EM, lagrangePoints(MU_EM)[3]!);
    for (const l of eigenvalues) expect(Math.abs(l.re)).toBeLessThan(1e-9);
  });
});

describe('Bewegung im rotierenden System', () => {
  it('erhält die Jacobi-Konstante', () => {
    const mu = MU_EM;
    let s: State4 = [0.5, 0.6, 0.1, -0.05];
    const c0 = jacobiConstant(mu, ...s);
    for (let i = 0; i < 5000; i++) s = rk4Step(mu, s, 0.001);
    expect(Math.abs(jacobiConstant(mu, ...s) - c0)).toBeLessThan(1e-9);
  });

  it('ein Teilchen nahe L4 bleibt in der Nähe, eines nahe L1 driftet weg', () => {
    const mu = 0.001;
    const [l1, , , l4] = lagrangePoints(mu);
    const nearL4 = integrateOrbit(mu, [l4!.x + 0.005, l4!.y, 0, 0], 100, 1);
    const maxL4 = Math.max(...nearL4.points.map((p) => Math.hypot(p.x - l4!.x, p.y - l4!.y)));
    expect(maxL4).toBeLessThan(0.3);
    const nearL1 = integrateOrbit(mu, [l1!.x + 0.001, 0, 0, 0], 20, 1);
    const maxL1 = Math.max(...nearL1.points.map((p) => Math.hypot(p.x - l1!.x, p.y)));
    expect(maxL1).toBeGreaterThan(0.05);
  });

  it('der reale Mond ist nach dem Jacobi-Kriterium in der Hill-Sphäre gefangen', () => {
    const s = buildScenario({ ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 1 });
    const [sun, earth, moon] = [s.indices.sun, s.indices.earth, s.indices.moon].map((i) => s.bodies[i]!);
    const check = jacobiCheck(G * (sun!.mass + earth!.mass), MU_SE, sun!, earth!, moon!);
    expect(check.trapped).toBe(true);
    const far = buildScenario({ ...REAL_PARAMS, moonDistance: 900_000, moonSpeed: 1 });
    const b = [far.indices.sun, far.indices.earth, far.indices.moon].map((i) => far.bodies[i]!);
    expect(jacobiCheck(G * (b[0]!.mass + b[1]!.mass), MU_SE, b[0]!, b[1]!, b[2]!).trapped).toBe(false);
  });
});
