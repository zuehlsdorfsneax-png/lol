import { describe, expect, it } from 'vitest';
import {
  AU,
  EARTH,
  G,
  KM,
  MOON,
  NBody,
  REAL_PARAMS,
  buildScenario,
  criticalMoonDistance,
  hillRadius,
  orbitalElements,
  perihelionHillRadius,
  pullRatio,
  rocheLimit,
  SUN,
  tidalRatio,
  barycenterOffset,
} from '../../src/physics';

describe('buildScenario', () => {
  it('erzeugt das reale System mit korrekter Mondbahn', () => {
    const { bodies, indices } = buildScenario(REAL_PARAMS);
    const e = bodies[indices.earth]!;
    const m = bodies[indices.moon]!;
    const el = orbitalElements(
      G * (e.mass + m.mass),
      m.x - e.x,
      m.y - e.y,
      m.vx - e.vx,
      m.vy - e.vy,
    );
    expect(el.e).toBeCloseTo(MOON.eccentricity, 6);
    expect(el.a / MOON.semiMajorAxis).toBeCloseTo(1, 6);
    expect(el.h).toBeGreaterThan(0);
  });

  it('liegt im Schwerpunktsystem', () => {
    const sys = new NBody(buildScenario(REAL_PARAMS).bodies);
    let px = 0;
    let py = 0;
    for (let i = 0; i < sys.n; i++) {
      px += sys.mass[i]! * sys.vx[i]!;
      py += sys.mass[i]! * sys.vy[i]!;
    }
    // Relativ zum Bahnimpuls der Erde (≈ 1,8·10²⁹ kg·m/s) nur Rundungsfehler.
    const scale = EARTH.mass * 3e4;
    expect(Math.abs(px) / scale).toBeLessThan(1e-12);
    expect(Math.abs(py) / scale).toBeLessThan(1e-12);
  });

  it('kann ohne Sonne, rückläufig, mit Störkörper und Teilchen bauen', () => {
    const s = buildScenario({
      ...REAL_PARAMS,
      sunMass: 0,
      moonRetrograde: true,
      intruder: { mass: 10, distance: 1e6, speed: 20, leadDays: 10 },
      particles: { count: 5, innerKm: 1e5, outerKm: 5e5, retrograde: false },
    });
    expect(s.indices.sun).toBe(-1);
    expect(s.indices.intruder).toBeGreaterThan(0);
    expect(s.bodies.filter((b) => b.kind === 'particle')).toHaveLength(5);
    const e = s.bodies[s.indices.earth]!;
    const m = s.bodies[s.indices.moon]!;
    expect((m.x - e.x) * (m.vy - e.vy) - (m.y - e.y) * (m.vx - e.vx)).toBeLessThan(0);
    expect(s.info.hillRadius).toBe(Infinity);
  });

  it('skaliert Radien bei konstanter Dichte', () => {
    const s = buildScenario({ ...REAL_PARAMS, earthMass: 8 });
    expect(s.info.earthRadius / EARTH.radius).toBeCloseTo(2, 1);
  });
});

describe('Kriterien', () => {
  it('Hill-Radius der Erde ≈ 1,5 Mio. km, Mond bei ≈ 0,26 r_H', () => {
    const rh = hillRadius(EARTH.semiMajorAxis, EARTH.mass, SUN.mass);
    expect(rh / KM).toBeGreaterThan(1.49e6);
    expect(rh / KM).toBeLessThan(1.51e6);
    expect(MOON.semiMajorAxis / rh).toBeCloseTo(0.256, 2);
    expect(perihelionHillRadius(AU, 0.1, EARTH.mass, SUN.mass)).toBeCloseTo(
      0.9 * hillRadius(AU, EARTH.mass, SUN.mass),
      0,
    );
  });

  it('Roche-Grenze der Erde für den Mond', () => {
    expect(rocheLimit(EARTH.radius, EARTH.density, MOON.density) / KM).toBeCloseTo(18_365, -2);
    expect(rocheLimit(EARTH.radius, EARTH.density, MOON.density, true) / KM).toBeCloseTo(9_483, -2);
  });

  it('Domingos-Kriterium: prograd ≈ 0,49, retrograd ≈ 0,93 r_H', () => {
    expect(criticalMoonDistance(false, 0, 0)).toBeCloseTo(0.4895, 4);
    expect(criticalMoonDistance(true, 0, 0)).toBeCloseTo(0.9309, 4);
    expect(criticalMoonDistance(false, 0.1, 0)).toBeLessThan(0.4895);
  });

  it('Die Sonne zieht den Mond doppelt so stark an wie die Erde – die Störung ist trotzdem klein', () => {
    const pull = pullRatio(SUN.mass, AU, EARTH.mass, MOON.semiMajorAxis);
    expect(pull).toBeCloseTo(2.2, 1);
    const tide = tidalRatio(SUN.mass, AU, EARTH.mass, MOON.semiMajorAxis);
    expect(tide).toBeCloseTo(0.0113, 3);
  });

  it('Schwerpunkt Erde–Mond liegt im Erdinneren', () => {
    const d = barycenterOffset(EARTH.mass, MOON.mass, MOON.semiMajorAxis);
    expect(d / KM).toBeCloseTo(4671, -1);
    expect(d).toBeLessThan(EARTH.radius);
  });
});
