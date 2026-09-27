import { describe, expect, it } from 'vitest';
import {
  EARTH,
  G,
  JUPITER_MOONS,
  MOON,
  DAY,
  KM,
  PLANETS,
  centralMass,
  coreMantleMomentFactor,
  gravityInsideShell,
  linearRegression,
  momentOfInertiaFactor,
  positionAtPhase,
  rollingAcceleration,
  shellDensity,
  shellStress,
  simulateForceLaw,
  solveKepler,
  theoreticalApsidalAngle,
  unwrap,
  wrapAngle,
} from '../../src/physics';

describe('Hohlmond', () => {
  it('eine dünne Schale bräuchte eine unmögliche Dichte', () => {
    const rho = shellDensity(MOON.mass, MOON.radius, 50 * KM);
    expect(rho).toBeGreaterThan(22_590); // dichter als Osmium
    expect(shellDensity(MOON.mass, MOON.radius, MOON.radius)).toBeCloseTo(MOON.density, -2);
  });

  it('Trägheitsmoment: Vollkugel 0,4, dünne Schale 2/3, gemessen 0,393', () => {
    expect(momentOfInertiaFactor(0)).toBeCloseTo(0.4, 12);
    expect(momentOfInertiaFactor(0.999)).toBeCloseTo(2 / 3, 2);
    expect(momentOfInertiaFactor(0.5)).toBeGreaterThan(0.4);
    // Jede Hohlkugel liegt über 0,4 – der Messwert liegt darunter.
    expect(MOON.momentOfInertia).toBeLessThan(0.4);
    expect(coreMantleMomentFactor(0.2, 2.3)).toBeLessThan(0.4);
    expect(coreMantleMomentFactor(0.3, 1)).toBeCloseTo(0.4, 12);
  });

  it('im Hohlraum herrscht keine Schwerkraft (Schalentheorem)', () => {
    expect(gravityInsideShell(0.5 * MOON.radius, MOON.mass, MOON.radius, 0.8 * MOON.radius)).toBe(0);
    const outside = gravityInsideShell(2 * MOON.radius, MOON.mass, MOON.radius, 0.8 * MOON.radius);
    expect(outside).toBeCloseTo((G * MOON.mass) / (2 * MOON.radius) ** 2, 10);
    expect(gravityInsideShell(MOON.radius, MOON.mass, MOON.radius, 0)).toBeCloseTo(MOON.surfaceGravity, 2);
  });

  it('die Schale würde unter ihrem Gewicht zerdrückt', () => {
    expect(shellStress(MOON.mass, MOON.radius, 50 * KM)).toBeGreaterThan(1e10);
  });

  it('eine Hohlkugel rollt langsamer als eine Vollkugel', () => {
    const solid = rollingAcceleration(9.81, 0.3, 0.4);
    const hollow = rollingAcceleration(9.81, 0.3, 2 / 3);
    expect(hollow).toBeLessThan(solid);
    expect(solid / hollow).toBeCloseTo((1 + 2 / 3) / 1.4, 10);
  });
});

describe('Kepler', () => {
  it('löst die Kepler-Gleichung', () => {
    for (const e of [0, 0.3, 0.9]) {
      const E = solveKepler(1.234, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(1.234, 12);
    }
    const p = positionAtPhase(1, 0.5, 0);
    expect(p.x).toBeCloseTo(0.5, 12); // Perihel bei a(1−e)
  });

  it('T²/a³ ist für alle Planeten gleich', () => {
    for (const p of PLANETS) expect(p.T ** 2 / p.a ** 3).toBeCloseTo(1, 1);
  });

  it('bestimmt Erd- und Jupitermasse aus Umlaufbahnen', () => {
    const earthMoon = centralMass(MOON.semiMajorAxis, MOON.siderealPeriod, G);
    expect(earthMoon / (EARTH.mass + MOON.mass)).toBeCloseTo(1, 2);
    const io = JUPITER_MOONS[0]!;
    expect(centralMass(io.a * KM, io.T * DAY, G) / 1.898e27).toBeCloseTo(1, 1);
  });
});

describe('Kraftgesetz', () => {
  it('nur bei 1/r² schließen sich die Bahnen', () => {
    const newton = simulateForceLaw(2, 0.9);
    expect(newton.outcome).toBe('bound');
    expect(newton.apsidalAngle).toBeCloseTo(360, 0);
    const other = simulateForceLaw(2.5, 0.9);
    expect(Math.abs(other.apsidalAngle - 360)).toBeGreaterThan(20);
    expect(theoreticalApsidalAngle(2)).toBeCloseTo(180, 10);
  });

  it('ab n ≥ 3 gibt es keine stabilen Bahnen', () => {
    expect(simulateForceLaw(3.5, 0.95).outcome).toBe('crash');
    expect(simulateForceLaw(3.5, 1.05).outcome).toBe('escape');
    // Grenzfall n = 3: schon leicht zu langsam führt zum Sturz ins Zentrum.
    expect(simulateForceLaw(3, 0.95).outcome).toBe('crash');
  });
});

describe('Auswertung', () => {
  it('lineare Regression', () => {
    const r = linearRegression([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(r.slope).toBeCloseTo(2, 12);
    expect(r.intercept).toBeCloseTo(1, 12);
    expect(r.r2).toBeCloseTo(1, 12);
  });

  it('Winkel entfalten und normieren', () => {
    expect(unwrap([3, -3, -1])).toEqual([3, -3 + 2 * Math.PI, -1 + 2 * Math.PI]);
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 12);
  });
});
