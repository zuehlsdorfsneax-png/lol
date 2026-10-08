import { describe, expect, it } from 'vitest';
import { LandingPilot, NodeExecutor, OrbitPilot } from '../src/rocket/autopilot';
import { makePlan } from '../src/rocket/planner';
import { Flight, WARPS, goalPoints, rankFor } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import {
  GAME_EARTH,
  JUPITER,
  MARS,
  GAME_MOON,
  GAME_SUN,
  VENUS,
  angularRate,
  bodyState,
  dominantBody,
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
    expect(GAME_MOON.distance / GAME_EARTH.hill).toBeGreaterThan(0.24);
    expect(GAME_MOON.distance / GAME_EARTH.hill).toBeLessThan(0.28);
  });

  it('echte Massenverhältnisse: Sonne ≈ 333.000 Erdmassen', () => {
    expect(GAME_SUN.mu / GAME_EARTH.mu).toBeGreaterThan(3.2e5);
    expect(GAME_SUN.mu / GAME_EARTH.mu).toBeLessThan(3.45e5);
    expect(JUPITER.mu / GAME_EARTH.mu).toBeGreaterThan(300);
  });

  it('bestimmt den Bezugskörper über die Hill-Sphären', () => {
    expect(dominantBody(0, GAME_EARTH.radius + 100_000, 0)).toBe(GAME_EARTH);
    const [mx, my] = bodyState(GAME_MOON, 0);
    expect(dominantBody(mx + GAME_MOON.radius * 2, my, 0)).toBe(GAME_MOON);
    const [ax, ay] = bodyState(MARS, 0);
    expect(dominantBody(ax + MARS.radius * 3, ay, 0)).toBe(MARS);
    expect(dominantBody(GAME_EARTH.hill * 3, 0, 0)).toBe(GAME_SUN);
  });

  it('Startfenster: Mars eilt beim idealen Start voraus, Venus hinterher', () => {
    expect(transferWindow(GAME_EARTH, MARS).lead).toBeGreaterThan(0);
    expect(transferWindow(GAME_EARTH, VENUS).lead).toBeLessThan(0);
    expect(angularRate(GAME_EARTH)).toBeGreaterThan(angularRate(MARS));
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

  it('dockt auch ohne gewähltes Ziel an, wenn man langsam heranfährt', () => {
    const f = new Flight(template('faehre'));
    f.segs.pop();
    f.status = 'flying';
    f.landedOn = null;
    const [px, py] = stationPort(f.t);
    const [sx, sy, vx, vy] = stationState(f.t);
    const d = Math.hypot(px - sx, py - sy);
    const ux = (px - sx) / d;
    const uy = (py - sy) / d;
    f.angle = Math.atan2(-uy, -ux);
    f.x = px + ux * (8 + f.length);
    f.y = py + uy * (8 + f.length);
    f.vx = vx;
    f.vy = vy;
    f.update(1 / 60);
    expect(f.status).toBe('docked');
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
  it('Ares: Bordcomputer plant den Transfer, schwenkt ein und landet auf dem Mars', () => {
    const f = new Flight(template('ares'));
    const pilot = new OrbitPilot();
    run(f, 4, () => {
      pilot.update(f);
      return pilot.phase === 'done';
    });
    expect(f.goals.has('orbit')).toBe(true);

    // Auf das Startfenster warten (Zeitsprung), dann den Transfer planen.
    f.target = 'mars';
    let plan = makePlan(f, 'transfer');
    if (!plan.ok && plan.wait) {
      f.warpTo(f.t + plan.wait - f.orbit(GAME_EARTH).period);
      runFrames(f, () => f.warpTarget === null);
      plan = makePlan(f, 'transfer');
    }
    expect(plan.ok, plan.text).toBe(true);
    expect(execute(f)).toBe('done');
    // Kurskorrektur unterwegs: tiefster Punkt knapp über der Marsatmosphäre.
    const fix = makePlan(f, 'correct');
    if (fix.ok) expect(execute(f)).toBe('done');
    const p = f.predict();
    expect(p.encounter?.body).toBe(MARS);

    // Flug zum Mars im Zeitraffer
    expect(
      run(
        f,
        () => WARPS[f.maxWarpIndex()]!,
        () => f.refBody() === MARS,
      ),
    ).toBe(true);
    expect(f.goals.has('escape')).toBe(true);
    expect(f.goals.has('mars')).toBe(true);

    // Anflug noch einmal fein korrigieren, am tiefsten Punkt einschwenken, dann landen.
    const approach = makePlan(f, 'correct');
    if (approach.ok) expect(execute(f)).toBe('done');
    expect(makePlan(f, 'circ-pe').ok).toBe(true);
    expect(execute(f)).toBe('done');
    expect(f.orbit(MARS).bound).toBe(true);
    expect(f.goals.has('marsorbit')).toBe(true);
    expect(makePlan(f, 'deorbit').ok).toBe(true);
    expect(execute(f)).toBe('done');

    // Fallschirm scharf, der Lande-Autopilot übernimmt den Rest.
    while (f.segs.length > 1 && f.active.fuel <= 0) f.stage();
    f.deployChute();
    const lander = new LandingPilot();
    runFrames(f, () => {
      const ph = lander.update(f);
      return ph === 'done' || ph === 'failed';
    });
    expect(f.crashReason).toBe('');
    expect(f.status, `${lander.phase}: ${lander.message}`).toBe('landed');
    expect(f.landedOn).toBe(MARS);
    expect(f.goals.has('marsland')).toBe(true);
  }, 240_000);
});

/** Bilder zu 1/60 s, ohne den Zeitraffer anzufassen (Zeitsprung und Autopiloten steuern ihn). */
function runFrames(f: Flight, until: () => boolean, maxFrames = 400_000): boolean {
  for (let i = 0; i < maxFrames; i++) {
    if (until()) return true;
    if (f.status === 'crashed') return false;
    f.update(1 / 60);
  }
  return until();
}

function execute(f: Flight): string {
  const x = new NodeExecutor();
  runFrames(f, () => {
    const p = x.update(f);
    return p === 'done' || p === 'failed';
  });
  f.throttle = 0;
  return x.phase;
}
