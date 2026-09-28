import { describe, expect, it } from 'vitest';
import { LandingPilot, NodeExecutor, OrbitPilot } from '../src/rocket/autopilot';
import { Flight, WARPS, satelliteState } from '../src/rocket/flight';
import { elements, stateAt, timeToApoapsis, timeToPeriapsis } from '../src/rocket/kepler';
import { TEMPLATES } from '../src/rocket/parts';
import { arrivalPeriapsis, makePlan, planCircularize } from '../src/rocket/planner';
import { EARTH, MOON, bodyById, bodyState, circularSpeed } from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];

/** Bilder zu 1/60 s, bis `until` gilt; Zeitraffer wie gewünscht (höchstens erlaubt). */
function run(f: Flight, until: () => boolean, warp = 1, maxFrames = 300_000): boolean {
  for (let i = 0; i < maxFrames; i++) {
    if (until()) return true;
    if (f.status === 'crashed') return false;
    if (warp > 1 && f.warpTarget === null) f.setWarp(WARPS.indexOf(warp as (typeof WARPS)[number]));
    f.update(1 / 60);
  }
  return until();
}

/** Führt das geplante Manöver mit dem Autopiloten aus. */
function execute(f: Flight): string {
  const x = new NodeExecutor();
  run(f, () => {
    const p = x.update(f);
    return p === 'done' || p === 'failed';
  });
  f.throttle = 0;
  return x.phase;
}

function toOrbit(f: Flight, body = EARTH): void {
  const pilot = new OrbitPilot(body);
  run(f, () => pilot.update(f) === 'done', 4);
}

describe('Kepler-Bahnen', () => {
  it('Bahnelemente und Ort nach einer Umlaufzeit', () => {
    const r = EARTH.radius + 200_000;
    const v = circularSpeed(EARTH, 200_000) * 1.1;
    const el = elements(EARTH.mu, r, 0, 0, -v, 0);
    expect(el.dir).toBe(-1);
    expect(el.e).toBeGreaterThan(0.1);
    const P = (2 * Math.PI) / el.n;
    const [x, y, vx, vy] = stateAt(el, P);
    expect(Math.hypot(x - r, y)).toBeLessThan(1);
    expect(Math.hypot(vx, vy + v)).toBeLessThan(1e-3);
    // Wir starten am tiefsten Punkt: der höchste folgt nach einer halben Runde.
    expect(timeToApoapsis(el, 0)).toBeCloseTo(P / 2, 3);
    expect(timeToPeriapsis(el, 1)).toBeCloseTo(P - 1, 3);
    // Im Uhrzeigersinn: kurz danach liegt die Rakete unterhalb der x-Achse.
    expect(stateAt(el, 10)[1]).toBeLessThan(0);
  });
});

describe('Lageregelung (SAS) und Zeitsprung', () => {
  it('SAS prograd richtet die Rakete in Flugrichtung aus', () => {
    const f = new Flight(template('orbiter'));
    f.placeInOrbit(EARTH, 100_000, 1);
    f.angle = 2;
    f.sas = 'prograde';
    run(f, () => false, 1, 60 * 6);
    const s = f.speedFrame();
    expect(
      Math.abs(
        Math.atan2(
          Math.sin(f.angle - Math.atan2(s.vy, s.vx)),
          Math.cos(f.angle - Math.atan2(s.vy, s.vx)),
        ),
      ),
    ).toBeLessThan(0.02);
    f.sas = 'radialOut';
    run(f, () => false, 1, 60 * 6);
    const rel = f.relative(EARTH);
    expect(Math.cos(f.angle - Math.atan2(rel.ry, rel.rx))).toBeGreaterThan(0.99);
  });

  it('Zeitsprung hält genau am Ziel an', () => {
    const f = new Flight(template('orbiter'));
    f.placeInOrbit(EARTH, 100_000, 1);
    const goal = f.t + 3_000;
    f.warpTo(goal);
    run(f, () => f.warpTarget === null, 1, 60 * 60);
    expect(f.t).toBeCloseTo(goal, 3);
    expect(f.warp).toBe(1);
  });
});

describe('Bordcomputer', () => {
  it('Kreisbahn am Ap: planen und automatisch ausführen', () => {
    const f = new Flight(template('orbiter'));
    f.placeInOrbit(EARTH, 80_000, 1);
    f.vx *= 1.05;
    f.vy *= 1.05;
    const before = f.orbit(EARTH);
    expect(before.apoapsis).toBeGreaterThan(200_000);
    const plan = planCircularize(f, 'ap');
    expect(plan.ok).toBe(true);
    expect(f.node!.prograde).toBeGreaterThan(10);
    expect(execute(f)).toBe('done');
    const after = f.orbit(EARTH);
    expect(after.eccentricity).toBeLessThan(0.01);
    expect(f.goals.has('node')).toBe(true);
  });
});

describe('Bordcomputer: Mondmission ohne Handsteuerung', () => {
  it('Transfer, Einschwenken, Landung, Rückflug, Wiedereintritt', () => {
    const f = new Flight(template('luna'));
    toOrbit(f);
    expect(f.goals.has('orbit')).toBe(true);

    f.target = 'moon';
    const transfer = makePlan(f, 'transfer');
    expect(transfer.ok).toBe(true);
    expect(execute(f)).toBe('done');
    const p = f.predict();
    expect(p.encounter?.body).toBe(MOON);

    // Bis in die Hill-Sphäre des Mondes vorspulen, dann am tiefsten Punkt einschwenken.
    run(f, () => f.refBody() === MOON, 50_000);
    const capture = makePlan(f, 'circ-pe');
    expect(capture.ok).toBe(true);
    expect(execute(f)).toBe('done');
    const o = f.orbit(MOON);
    expect(o.bound).toBe(true);
    expect(f.goals.has('moonorbit')).toBe(true);

    // Lande-Autopilot
    const lander = new LandingPilot();
    run(f, () => {
      const ph = lander.update(f);
      return ph === 'done' || ph === 'failed';
    });
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(MOON);

    // Zurück in eine Mondumlaufbahn und heim
    toOrbit(f, MOON);
    expect(f.orbit(MOON).bound).toBe(true);
    f.target = null;
    const back = makePlan(f, 'return');
    expect(back.ok).toBe(true);
    expect(execute(f)).toBe('done');
    run(f, () => f.refBody() === EARTH && f.relative(MOON).r > MOON.hill * 1.2, 5_000);
    const fix = makePlan(f, 'deorbit');
    if (fix.ok) expect(execute(f)).toBe('done');
    // Tiefster Punkt der echten Mehrkörperbahn (die Zwei-Körper-Näherung stimmt so nah am Mond nicht).
    const pe = arrivalPeriapsis(f.predict(), EARTH, 0)!;
    expect(pe).toBeLessThan(35_000);
    expect(pe).toBeGreaterThan(15_000);

    // Wiedereintritt mit Fallschirm
    f.deployChute();
    f.sas = 'retrograde';
    run(f, () => f.status !== 'flying', 50_000);
    expect(f.crashReason).toBe('');
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(EARTH);
    expect(f.goals.has('return')).toBe(true);
  }, 120_000);
});

describe('Bordcomputer: Rendezvous mit der Station', () => {
  it('Transfer und Geschwindigkeit angleichen bringen die Rakete bis auf wenige km heran', () => {
    const f = new Flight(template('faehre'));
    toOrbit(f);
    f.target = 'station';
    const plan = makePlan(f, 'transfer');
    expect(plan.ok).toBe(true);
    expect(execute(f)).toBe('done');
    const match = makePlan(f, 'match');
    expect(match.ok, match.text).toBe(true);
    expect(execute(f)).toBe('done');
    const ti = f.targetInfo()!;
    expect(ti.distance).toBeLessThan(5_000);
    expect(ti.speed).toBeLessThan(10);
  }, 60_000);
});

describe('Satelliten und Hitzeschild', () => {
  it('ein ausgesetzter Satellit kreist auf seiner Kepler-Bahn weiter', () => {
    const f = new Flight(template('satnet'));
    f.placeInOrbit(EARTH, 300_000, 1);
    expect(f.satellitesOnBoard).toBe(3);
    const mass = f.mass;
    expect(f.deploySatellite()).toBe(true);
    expect(f.satellitesOnBoard).toBe(2);
    expect(f.mass).toBeLessThan(mass);
    expect(f.satellites).toHaveLength(1);
    expect(f.goals.has('satellite')).toBe(true);
    f.deploySatellite();
    f.deploySatellite();
    expect(f.goals.has('network')).toBe(true);
    // Nach einem Umlauf ist der Satellit wieder (fast) an derselben Stelle.
    const s = f.satellites[0]!;
    const [x0, y0] = satelliteState(s, f.t);
    const P = (2 * Math.PI) / s.el.n;
    const [x1, y1] = satelliteState(s, f.t + P);
    const [ex0, ey0] = bodyState(EARTH, f.t);
    const [ex1, ey1] = bodyState(EARTH, f.t + P);
    expect(Math.hypot(x1 - ex1 - (x0 - ex0), y1 - ey1 - (y0 - ey0))).toBeLessThan(1);
    // Spielstand enthält die Satelliten.
    const g = Flight.restore(
      JSON.parse(JSON.stringify(f.snapshot())) as NonNullable<ReturnType<Flight['snapshot']>>,
    );
    expect(g.satellites).toHaveLength(3);
  });

  it('ohne Umlaufbahn stürzt der Satellit ab', () => {
    const f = new Flight(template('satnet'));
    f.placeInOrbit(EARTH, 100_000, 1);
    f.vx *= 0.9;
    f.vy *= 0.9;
    f.deploySatellite();
    expect(f.satellites).toHaveLength(0);
    expect(f.debris.some((d) => d.parts[0] === 'satellit')).toBe(true);
  });

  it('der Hitzeschild voran schützt, mit der Spitze voran nicht', () => {
    const entry = (shieldFirst: boolean): Flight => {
      const f = new Flight(['fallschirm', 'kapsel', 'hitzeschild']);
      f.status = 'flying';
      f.landedOn = null;
      f.y = EARTH.radius + 30_000;
      f.vy = -3_600;
      f.angle = shieldFirst ? Math.PI / 2 : -Math.PI / 2;
      for (let i = 0; i < 60 * 20 && f.status === 'flying'; i++) f.update(1 / 60);
      return f;
    };
    const good = entry(true);
    const bad = entry(false);
    expect(good.shieldAtBottom).toBe(true);
    expect(bad.maxHeat).toBeGreaterThan(good.maxHeat * 3);
    expect(good.crashReason).not.toMatch(/verglüht/);
  });
});

describe('Planeten', () => {
  it('Merkur und Europa gehören zum Sonnensystem', () => {
    const f = new Flight(template('orbiter'));
    f.placeInOrbit(bodyById('europa'), 50_000, 0);
    f.update(1 / 60);
    expect(f.refBody().id).toBe('europa');
    expect(f.goals.has('europa')).toBe(true);
    expect(f.goals.has('jupiter')).toBe(true);
    f.placeInOrbit(bodyById('mercury'), 50_000, 0);
    f.update(1 / 60);
    expect(f.goals.has('mercury')).toBe(true);
  });

  it('eine Umlaufbahn läuft im hohen Zeitraffer auf Schienen weiter', () => {
    const f = new Flight(template('orbiter'));
    f.placeInOrbit(EARTH, 200_000, 1);
    const before = f.orbit(EARTH);
    f.setWarp(WARPS.length - 1);
    expect(f.warp).toBe(5_000_000);
    for (let i = 0; i < 60; i++) f.update(1 / 60);
    const after = f.orbit(EARTH);
    expect(f.t).toBeGreaterThan(4e6);
    expect(Math.abs(after.periapsis - before.periapsis)).toBeLessThan(100);
  });
});
