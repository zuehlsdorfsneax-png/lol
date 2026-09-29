import { describe, expect, it } from 'vitest';
import { LandingPilot, NodeExecutor, OrbitPilot } from '../src/rocket/autopilot';
import { Flight } from '../src/rocket/flight';
import { TEMPLATES } from '../src/rocket/parts';
import { runPlan } from '../src/rocket/planClient';
import { arrivalPeriapsis, makePlan, type PlanId } from '../src/rocket/planner';
import { EARTH, MOON, bodyState, bodyStates, BODIES } from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];
const DT = 1 / 60;

/** Bilder wie im Spiel, bis `step` true liefert. */
function loop(f: Flight, step: () => boolean, max = 400_000): void {
  for (let i = 0; i < max && !step() && f.status !== 'crashed'; i++) f.update(DT);
}

function plan(f: Flight, id: PlanId): void {
  const r = makePlan(f, id);
  expect(r.ok, `${id}: ${r.text}`).toBe(true);
}

function execute(f: Flight): void {
  const x = new NodeExecutor();
  loop(f, () => {
    const p = x.update(f);
    return p === 'done' || p === 'failed';
  });
  f.throttle = 0;
  expect(x.phase, x.message).toBe('done');
}

function circularAround(body = EARTH, alt: number, design = 'orbiter', t = 0): Flight {
  const f = new Flight(template(design));
  f.t = t;
  f.placeInOrbit(body, alt, 1);
  return f;
}

describe('Körperzustände', () => {
  it('liefert alle Körper in einem Durchgang wie einzeln abgefragt', () => {
    for (const t of [0, 12_345.678, 3e7]) {
      const all = bodyStates(t);
      BODIES.forEach((b, i) => expect(all[i]).toEqual(bodyState(b, t)));
      expect(bodyState(EARTH, t)).toEqual([0, 0, 0, 0]);
    }
  });
});

describe('Hilfe-Pilot Umlaufbahn', () => {
  it('bringt auch eine Oberstufe mit schwachem Triebwerk (Aurora) sparsam in die Bahn', () => {
    const f = new Flight(template('aurora'));
    const pilot = new OrbitPilot(EARTH);
    loop(f, () => ['done', 'failed'].includes(pilot.update(f)));
    expect(pilot.phase, pilot.message).toBe('done');
    const o = f.orbit(EARTH);
    expect(o.periapsis).toBeGreaterThan(EARTH.atmosphere);
    // Früher hob der Pilot den höchsten Punkt auf Zehntausende Kilometer und verbrannte alles.
    expect(o.apoapsis).toBeLessThan(120_000);
    expect(f.deltaV()).toBeGreaterThan(2_500);
  });
});

describe('Manöver ausführen', () => {
  it('rechnet den Rest eines großen Schubs genau aus der Bahnenergie', () => {
    const f = circularAround(MOON, 20_000, 'orbiter', 50_000);
    f.target = 'earth';
    plan(f, 'return');
    const n = f.node!;
    // Bis zum Beginn des Brennens (dann wird das Manöver festgelegt), ohne zu zünden.
    loop(f, () => f.t >= n.t - 1e-6 || n.frozen);
    expect(n.frozen).toBe(true);
    const rem = f.nodeRemaining();
    // Vorher: lineare Näherung ΔE ≈ v·Δv, bei diesem Schub rund 25 % zu viel.
    expect(Math.abs(rem.prograde - n.prograde) / n.prograde).toBeLessThan(0.02);
  });
});

describe('Rückflug vom Mond', () => {
  it('zielt auf den ersten tiefsten Punkt – die Vorhersage bleibt nach dem Wechsel zur Erde gleich', () => {
    const f = circularAround(MOON, 20_000, 'orbiter', 50_000);
    f.target = 'earth';
    plan(f, 'return');
    const planned = arrivalPeriapsis(f.predict(), EARTH, 0)!;
    expect(planned).toBeGreaterThan(15_000);
    expect(planned).toBeLessThan(40_000);
    // Das Manöver ideal ausführen und mit Zeitraffer aus dem Einflussbereich des Mondes fliegen.
    const n = f.node!;
    loop(f, () => f.t >= n.t - 1e-6);
    const d = f.nodeRemaining();
    f.vx += d.x;
    f.vy += d.y;
    f.clearNode();
    loop(f, () => {
      if (f.refBody() === EARTH) return true;
      f.setWarp(f.maxWarpIndex());
      return false;
    });
    expect(f.refBody()).toBe(EARTH);
    const after = arrivalPeriapsis(f.predict(), EARTH, 0)!;
    expect(Math.abs(after - planned)).toBeLessThan(3_000);
  });
});

describe('Kreisbahn', () => {
  it('am Pe einer langgestreckten Bahn: aus der echten Vorhersage, nicht aus der Kepler-Ellipse', () => {
    const f = circularAround(EARTH, 300_000, 'saturn');
    const r1 = EARTH.radius + 300_000;
    const r2 = EARTH.radius + 30_000_000;
    const q = Math.sqrt((2 * r2) / (r1 + r2));
    f.vx *= q;
    f.vy *= q;
    plan(f, 'circ-pe');
    execute(f);
    const o = f.orbit(EARTH);
    expect(o.eccentricity).toBeLessThan(0.01);
    // Der Mond hat den tiefsten Punkt unterwegs von 300 auf gut 190 km gezogen.
    expect(o.periapsis).toBeLessThan(250_000);
  });
});

describe('Rendezvous mit der Station', () => {
  for (const [alt, angle] of [
    [150_000, 2],
    [120_000, 0],
  ] as const) {
    it(`gelingt auch aus ${alt / 1000} km Höhe (Phasenbahn)`, () => {
      const f = circularAround(EARTH, alt, 'faehre');
      f.placeInOrbit(EARTH, alt, angle);
      f.target = 'station';
      plan(f, 'transfer');
      execute(f);
      let r = makePlan(f, 'match');
      for (let k = 0; k < 3 && r.ok && r.title.startsWith('Kurs'); k++) {
        execute(f);
        r = makePlan(f, 'match');
      }
      expect(r.ok, r.text).toBe(true);
      execute(f);
      const ti = f.targetInfo()!;
      expect(ti.distance).toBeLessThan(3_000);
      expect(ti.speed).toBeLessThan(5);
    });
  }
});

describe('Lande-Autopilot', () => {
  it('lässt eine Kapsel mit Fallschirm von der Luft abbremsen, statt oben Treibstoff zu verbrennen', () => {
    const f = circularAround(EARTH, 150_000, 'faehre');
    // Wie nach einem echten Aufstieg: die Erststufe ist schon weg.
    f.stage();
    plan(f, 'deorbit');
    execute(f);
    const before = f.deltaV();
    const pilot = new LandingPilot();
    loop(f, () => ['done', 'failed'].includes(pilot.update(f)));
    expect(f.status, pilot.message).toBe('landed');
    expect(before - f.deltaV()).toBeLessThan(150);
  });
});

describe('Planen im Hintergrund', () => {
  it('rechnet ohne Worker (Tests, alte Browser) direkt und setzt das Manöver', async () => {
    const f = circularAround(EARTH, 150_000, 'orbiter');
    f.target = 'moon';
    const r = await runPlan(f, 'transfer');
    expect(r.ok, r.text).toBe(true);
    expect(f.node).not.toBeNull();
  });
});
