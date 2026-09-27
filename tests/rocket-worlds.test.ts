import { describe, expect, it } from 'vitest';
import { OrbitPilot, steerTo } from '../src/rocket/autopilot';
import { Flight, WARPS, goalPoints, rankFor } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import {
  EARTH,
  JUPITER,
  MARS,
  MOON,
  SUN,
  VENUS,
  angularRate,
  bodyState,
  dominantBody,
  excessSpeed,
  phaseLead,
  requiredExcess,
  stationPort,
  stationState,
  transferWindow,
} from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];

function run(
  f: Flight,
  warp: number | (() => number),
  until: () => boolean,
  maxFrames = 200_000,
): boolean {
  for (let i = 0; i < maxFrames; i++) {
    if (until()) return true;
    if (f.status === 'crashed') return false;
    const w = typeof warp === 'number' ? warp : warp();
    f.setWarp(WARPS.indexOf(w as (typeof WARPS)[number]));
    f.update(1 / 60);
  }
  return until();
}

describe('Sonnensystem', () => {
  it('der Mond kreist wie in Wirklichkeit bei etwa einem Viertel des Hill-Radius der Erde', () => {
    expect(MOON.distance / EARTH.hill).toBeGreaterThan(0.24);
    expect(MOON.distance / EARTH.hill).toBeLessThan(0.28);
  });

  it('echte Massenverhältnisse: Sonne ≈ 333.000 Erdmassen', () => {
    expect(SUN.mu / EARTH.mu).toBeGreaterThan(3.2e5);
    expect(SUN.mu / EARTH.mu).toBeLessThan(3.45e5);
    expect(JUPITER.mu / EARTH.mu).toBeGreaterThan(300);
  });

  it('bestimmt den Bezugskörper über die Hill-Sphären', () => {
    expect(dominantBody(0, EARTH.radius + 100_000, 0)).toBe(EARTH);
    const [mx, my] = bodyState(MOON, 0);
    expect(dominantBody(mx + MOON.radius * 2, my, 0)).toBe(MOON);
    const [ax, ay] = bodyState(MARS, 0);
    expect(dominantBody(ax + MARS.radius * 3, ay, 0)).toBe(MARS);
    expect(dominantBody(EARTH.hill * 3, 0, 0)).toBe(SUN);
  });

  it('Startfenster: Mars eilt beim idealen Start voraus, Venus hinterher', () => {
    expect(transferWindow(EARTH, MARS).lead).toBeGreaterThan(0);
    expect(transferWindow(EARTH, VENUS).lead).toBeLessThan(0);
    expect(angularRate(EARTH)).toBeGreaterThan(angularRate(MARS));
  });
});

describe('Raumstation', () => {
  it('Andocken, Tanken und Ablegen', () => {
    const f = new Flight(template('faehre'));
    f.segs.pop();
    f.segs[0]!.fuel = 100;
    f.status = 'flying';
    f.landedOn = null;
    f.target = 'station';
    const t = f.t;
    const [px, py] = stationPort(t);
    const [sx, sy, vx, vy] = stationState(t);
    // 12 m vor dem Stutzen, Spitze zur Station, langsam annähern
    const ux = (px - sx) / Math.hypot(px - sx, py - sy);
    const uy = (py - sy) / Math.hypot(px - sx, py - sy);
    f.angle = Math.atan2(-uy, -ux);
    f.x = px + ux * (12 + f.length);
    f.y = py + uy * (12 + f.length);
    f.vx = vx - ux * 0.5;
    f.vy = vy - uy * 0.5;
    run(f, 1, () => f.status === 'docked', 600);
    expect(f.status).toBe('docked');
    expect(f.goals.has('dock')).toBe(true);
    expect(f.refuel()).toBe(true);
    expect(f.active.fuel).toBe(f.fuelCapacity);
    expect(f.goals.has('refuel')).toBe(true);
    // Angedockt fliegt die Rakete mit der Station mit.
    run(f, 100, () => false, 60);
    const [qx, qy] = stationPort(f.t);
    expect(
      Math.hypot(f.x + Math.cos(f.angle) * f.length - qx, f.y + Math.sin(f.angle) * f.length - qy),
    ).toBeLessThan(1);
    f.undock();
    expect(f.status).toBe('flying');
  });

  it('zu schnell angeflogen: kein Andocken', () => {
    const f = new Flight(template('faehre'));
    f.segs.pop();
    f.status = 'flying';
    f.landedOn = null;
    f.target = 'station';
    const [px, py] = stationPort(f.t);
    const [, , vx, vy] = stationState(f.t);
    f.x = px + 10;
    f.y = py;
    f.vx = vx + 8;
    f.vy = vy;
    f.update(1 / 60);
    expect(f.status).toBe('flying');
  });
});

describe('Spielstand und Punkte', () => {
  it('Schnellspeichern stellt den Flug genau wieder her', () => {
    const f = new Flight(template('luna'));
    const pilot = new OrbitPilot();
    run(f, 4, () => {
      pilot.update(f);
      return f.altitudeEarth > 20_000;
    });
    const snap = JSON.parse(JSON.stringify(f.snapshot())) as ReturnType<Flight['snapshot']>;
    const g = Flight.restore(snap!);
    expect(g.x).toBe(f.x);
    expect(g.vy).toBe(f.vy);
    expect(g.mass).toBeCloseTo(f.mass, 6);
    expect([...g.goals]).toEqual([...f.goals]);
    expect(g.segs.length).toBe(f.segs.length);
  });

  it('Ränge wachsen mit den Punkten', () => {
    expect(rankFor(0).title).toBe('Kadett');
    expect(rankFor(goalPoints(['orbit', 'dock', 'moonland'])).index).toBeGreaterThan(0);
  });
});

describe('Marsmission', () => {
  it('Ares erreicht den Mars, schwenkt ein und landet', () => {
    const f = new Flight(template('ares'));
    const pilot = new OrbitPilot();
    run(f, 4, () => {
      pilot.update(f);
      return pilot.phase === 'done';
    });
    expect(f.goals.has('orbit')).toBe(true);

    // Auf das Startfenster springen (die Erdumlaufbahn bleibt dabei erhalten).
    const w = transferWindow(EARTH, MARS);
    const rel = angularRate(EARTH) - angularRate(MARS);
    const ideal = ((w.lead % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const gap =
      (((phaseLead(EARTH, MARS, f.t) - ideal) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    f.t += gap / rel;

    // Einen Umlauf lang Zündpunkte ausprobieren und den nehmen, der den Mars trifft.
    const start = f.snapshot()!;
    const o = f.orbit(EARTH);
    let hit: ReturnType<Flight['snapshot']> = null;
    const candidates: NonNullable<ReturnType<Flight['snapshot']>>[] = [];
    const probe = Flight.restore(start);
    for (let k = 0; k < 48; k++) {
      candidates.push(probe.snapshot()!);
      run(probe, 10, () => probe.t > start.t + ((k + 1) * o.period) / 48);
    }
    const vinf = requiredExcess(EARTH, MARS);
    search: for (const factor of [1, 1.03, 0.98, 1.06]) {
      for (const c of candidates) {
        const g = Flight.restore(c);
        run(g, 1, () => {
          if (g.active.fuel <= 0 && g.segs.length > 1) g.stage();
          steerTo(g, Math.atan2(g.vy, g.vx));
          g.throttle = 1;
          const r = g.relative(EARTH);
          return excessSpeed(EARTH, r.rx, r.ry, r.vx, r.vy) > vinf * factor;
        });
        g.throttle = 0;
        const p = g.predict();
        if (p.encounter?.body === MARS && p.encounter.distance > MARS.radius * 1.05) {
          hit = g.snapshot();
          break search;
        }
      }
    }
    expect(hit).not.toBeNull();
    const m = Flight.restore(hit!);

    // Flug zum Mars im Zeitraffer
    expect(
      run(
        m,
        () => WARPS[m.maxWarpIndex()]!,
        () => m.refBody() === MARS,
      ),
    ).toBe(true);
    expect(m.goals.has('escape')).toBe(true);
    expect(m.goals.has('mars')).toBe(true);

    // Am marsnächsten Punkt einschwenken, dann die Periapsis in die Atmosphäre legen
    run(
      m,
      () => WARPS[m.maxWarpIndex()]!,
      () => {
        const r = m.relative(MARS);
        return r.altitude < 1_500_000 || r.rx * r.vx + r.ry * r.vy > 0;
      },
    );
    run(m, 1, () => {
      if (m.active.fuel <= 0 && m.segs.length > 1) m.stage();
      const r = m.relative(MARS);
      steerTo(m, Math.atan2(-r.vy, -r.vx));
      m.throttle = 1;
      const o2 = m.orbit(MARS);
      return o2.bound && o2.apoapsis < 0.3 * MARS.hill;
    });
    expect(m.orbit(MARS).bound).toBe(true);
    run(m, 1, () => {
      if (m.active.fuel <= 0 && m.segs.length > 1) m.stage();
      const r = m.relative(MARS);
      steerTo(m, Math.atan2(-r.vy, -r.vx));
      m.throttle = 1;
      return m.orbit(MARS).periapsis < 12_000;
    });
    m.throttle = 0;
    while (m.segs.length > 1 && m.active.fuel <= 0) m.stage();
    m.deployChute();
    run(
      m,
      () => (m.relative(MARS).altitude > 400_000 ? WARPS[m.maxWarpIndex()]! : 1),
      () => {
        if (m.relative(MARS).altitude > 400_000) return false;
        if (m.segs.length > 1) m.stage();
        const r = m.relative(MARS);
        const ux = r.rx / r.r;
        const uy = r.ry / r.r;
        const radial = r.vx * ux + r.vy * uy;
        const hx = r.vx - radial * ux;
        const hy = r.vy - radial * uy;
        const g = MARS.mu / r.r ** 2;
        const amax = m.engine().thrust / m.mass;
        if (Math.hypot(hx, hy) > 3) {
          steerTo(m, Math.atan2(-hy, -hx));
          m.throttle = 1;
        } else {
          steerTo(m, Math.atan2(uy, ux));
          const need = (radial * radial - 4) / (2 * Math.max(r.altitude, 1)) + g;
          m.throttle =
            need > 0.7 * amax || r.altitude < 50 ? Math.min(1, Math.max(0, need / amax)) : 0;
        }
        return m.status !== 'flying';
      },
    );
    expect(m.crashReason).toBe('');
    expect(m.status).toBe('landed');
    expect(m.landedOn).toBe(MARS);
    expect(m.goals.has('marsland')).toBe(true);
  }, 240_000);
});
