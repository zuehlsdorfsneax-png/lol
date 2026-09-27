import { describe, expect, it } from 'vitest';
import { OrbitPilot } from '../src/rocket/autopilot';
import { Flight, WARPS } from '../src/rocket/flight';
import { TEMPLATES, checkDesign, segments, stageStats, totalDeltaV } from '../src/rocket/parts';
import {
  EARTH,
  MOON,
  MOON_DISTANCE,
  MOON_HILL,
  MOON_PERIOD,
  circularSpeed,
  gravity,
  moonPosition,
  moonVelocity,
  orbitAround,
} from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];

function fly(f: Flight, seconds: number, warp = 1, each?: () => void): void {
  const frames = Math.round((seconds * 60) / warp);
  for (let i = 0; i < frames && f.status !== 'crashed'; i++) {
    each?.();
    f.setWarp(WARPS.indexOf(warp as (typeof WARPS)[number]));
    f.update(1 / 60);
  }
}

describe('Spielwelt', () => {
  it('hat echte Oberflächenschwerkraft und das echte Massenverhältnis', () => {
    expect(EARTH.mu / EARTH.radius ** 2).toBeCloseTo(9.81, 6);
    expect(MOON.mu / MOON.radius ** 2).toBeCloseTo(1.62, 6);
    expect(MOON.mu / EARTH.mu).toBeCloseTo(0.0123, 3);
    expect(MOON_DISTANCE / EARTH.radius).toBe(60);
  });

  it('der Mond läuft gleichmäßig auf seiner Kreisbahn', () => {
    const [x0, y0] = moonPosition(0);
    const [x1, y1] = moonPosition(MOON_PERIOD);
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeLessThan(1);
    const [vx, vy] = moonVelocity(1234);
    const [px, py] = moonPosition(1234);
    expect(px * vx + py * vy).toBeCloseTo(0, 0);
  });

  it('Hill-Radius des Mondes nach Kapitel 5', () => {
    expect(MOON_HILL).toBeCloseTo(MOON_DISTANCE * Math.cbrt(MOON.mu / (3 * EARTH.mu)), 3);
    expect(MOON_HILL).toBeGreaterThan(10 * MOON.radius);
  });

  it('nahe der Oberfläche zieht die Erde mit g', () => {
    const [ax, ay] = gravity(0, EARTH.radius, 0);
    expect(Math.abs(ax)).toBeLessThan(0.01);
    expect(ay).toBeCloseTo(-9.81, 1);
  });

  it('Bahnelemente einer Kreisbahn', () => {
    const v = circularSpeed(EARTH, 100_000);
    const o = orbitAround(EARTH, EARTH.radius + 100_000, 0, 0, v);
    expect(o.bound).toBe(true);
    expect(o.eccentricity).toBeLessThan(1e-9);
    expect(o.periapsis).toBeCloseTo(100_000, -1);
    expect(o.apoapsis).toBeCloseTo(100_000, -1);
  });
});

describe('Bauteile und Raketengleichung', () => {
  it('teilt die Rakete an Stufentrennern', () => {
    const segs = segments(template('luna'));
    expect(segs).toHaveLength(3);
    expect(segs[0]![0]).toBe('fallschirm');
    expect(segs[1]![0]).toBe('trenner');
  });

  it('berechnet Δv nach Ziolkowski', () => {
    const [stage] = stageStats(['kapsel', 'tank-s', 'falke']);
    const m0 = 1200 + 2700 + 900;
    const expected = 310 * 9.81 * Math.log(m0 / (m0 - 2400));
    expect(stage!.deltaV).toBeCloseTo(expected, 6);
  });

  it('Vorlagen reichen für ihre Aufgaben', () => {
    expect(totalDeltaV(template('huepfer'))).toBeGreaterThan(2500);
    expect(totalDeltaV(template('orbiter'))).toBeGreaterThan(4500);
    expect(totalDeltaV(template('luna'))).toBeGreaterThan(7000);
    for (const t of TEMPLATES) {
      expect(checkDesign(t.parts).filter((p) => p.level === 'error')).toEqual([]);
      expect(stageStats(t.parts)[0]!.twrEarth).toBeGreaterThan(1.2);
    }
  });

  it('Seitenbooster geben der ersten Stufe Schub und Treibstoff', () => {
    const without = stageStats(['kapsel', 'tank-l', 'titan'])[0]!;
    const withB = stageStats(['kapsel', 'tank-l', 'booster', 'titan'])[0]!;
    expect(withB.thrust).toBe(without.thrust + 360_000);
    expect(withB.fuel).toBe(without.fuel + 9000);
    expect(totalDeltaV(template('saturn'))).toBeGreaterThan(totalDeltaV(template('luna')));
  });

  it('meldet Baufehler', () => {
    expect(checkDesign([])[0]!.level).toBe('error');
    expect(checkDesign(['tank-s', 'falke']).some((p) => p.text.includes('Kapsel'))).toBe(true);
    expect(
      checkDesign(['kapsel', 'tank-l', 'tank-l', 'kolibri']).some((p) => p.level === 'warn'),
    ).toBe(true);
  });
});

describe('Flug', () => {
  it('steht ohne Schub ruhig auf der Startrampe', () => {
    const f = new Flight(template('orbiter'));
    fly(f, 5);
    expect(f.status).toBe('landed');
    expect(Math.hypot(f.x, f.y - EARTH.radius)).toBeLessThan(1e-6);
  });

  it('eine zu schwere Rakete hebt nicht ab', () => {
    const f = new Flight(['kapsel', 'tank-l', 'tank-l', 'kolibri']);
    f.throttle = 1;
    fly(f, 5);
    expect(f.status).toBe('landed');
  });

  it('der Hilfe-Pilot erreicht mit Orbiter und Luna 1 eine Umlaufbahn', () => {
    for (const id of ['orbiter', 'luna', 'saturn']) {
      const f = new Flight(template(id));
      const pilot = new OrbitPilot();
      fly(f, 900, 4, () => pilot.update(f));
      const o = f.orbit(EARTH);
      expect(pilot.phase, id).toBe('done');
      expect(o.periapsis, id).toBeGreaterThan(EARTH.atmosphere);
      expect(f.goals.has('orbit'), id).toBe(true);
    }
  });

  it('eine Umlaufbahn bleibt im Zeitraffer stabil', () => {
    const f = new Flight(['kapsel', 'tank-s', 'falke']);
    const h = 120_000;
    f.status = 'flying';
    f.landedOn = null;
    f.x = EARTH.radius + h;
    f.y = 0;
    f.vx = 0;
    f.vy = -circularSpeed(EARTH, h);
    // Weit weg vom Mond starten, damit nur die Erde zählt.
    f.t = 0;
    const before = f.orbit(EARTH);
    fly(f, 8 * before.period, 1000);
    const after = f.orbit(EARTH);
    expect(f.status).toBe('flying');
    expect(Math.abs(after.periapsis - before.periapsis)).toBeLessThan(3_000);
  });

  it('der Hüpfer landet nach dem Weltraumflug am Fallschirm', () => {
    const f = new Flight(template('huepfer'));
    f.throttle = 1;
    fly(f, 400, 1, () => {
      if (f.active.fuel === 0 && f.chute === 'stowed') f.deployChute();
    });
    expect(f.goals.has('space')).toBe(true);
    fly(f, 3000, 50);
    expect(f.crashReason).toBe('');
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(EARTH);
  });

  it('ohne Fallschirm und Bremsen zerschellt die Rakete', () => {
    const f = new Flight(['kapsel', 'tank-s', 'falke']);
    f.status = 'flying';
    f.landedOn = null;
    f.y = EARTH.radius + 2_000;
    fly(f, 120);
    expect(f.status).toBe('crashed');
    expect(f.crashReason).toMatch(/Aufprall/);
  });

  it('Stufen abwerfen macht die Rakete leichter und erzeugt Trümmer', () => {
    const f = new Flight(template('orbiter'));
    f.throttle = 1;
    fly(f, 2);
    const mass = f.mass;
    expect(f.stage()).toBe(true);
    expect(f.segs).toHaveLength(1);
    expect(f.mass).toBeLessThan(mass / 2);
    expect(f.debris).toHaveLength(1);
  });
});
