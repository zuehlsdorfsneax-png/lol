import { describe, expect, it } from 'vitest';
import { Flight } from '../src/rocket/flight';
import {
  MissionPilot,
  missionSteps,
  missionTitle,
  stepLabel,
  type MissionSpec,
} from '../src/rocket/mission';
import { TEMPLATES } from '../src/rocket/parts';
import { runPlan } from '../src/rocket/planClient';
import { legGoal, makePlan, orbiterFor, planOptions } from '../src/rocket/planner';
import { EARTH, MARS, PHOBOS, SUN, bodyById } from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];

/** Fliegt die Mission Bild für Bild (wie im Spiel), bis sie fertig oder gescheitert ist. */
function fly(f: Flight, spec: MissionSpec, max = 400_000): MissionPilot {
  const m = new MissionPilot(spec, f, (fl, id) => makePlan(fl, id));
  for (let i = 0; i < max && m.update(f) === 'running'; i++) f.update(1 / 60);
  return m;
}

const labels = (spec: MissionSpec, f: Flight): string[] =>
  missionSteps(spec, f).map((s) => stepLabel(s));

describe('Missions-Autopilot: Ablauf', () => {
  it('plant Mondlandung mit Rückkehr vom Startplatz aus', () => {
    const f = new Flight(template('selene'));
    expect(labels({ target: 'moon', land: true, home: true }, f)).toEqual([
      'Start in die Umlaufbahn',
      'Bahn rund machen',
      'Transfer zum Mond',
      'Flug zum Mond',
      'Einschwenken beim Mond',
      'Landung auf dem Mond',
      'Start in die Umlaufbahn',
      'Rückflug zur Erde',
      'Flug zur Erde',
      'Wiedereintritt und Landung',
    ]);
    expect(missionTitle({ target: 'moon', land: true, home: true })).toBe(
      'Landung auf dem Mond und zurück zur Erde',
    );
  });

  it('fliegt zu einem Mond eines anderen Planeten erst zum Planeten', () => {
    const f = new Flight(template('spatzsonde'));
    const steps = labels({ target: 'phobos', land: true, home: false }, f);
    expect(steps).toContain('Transfer zum Mars');
    expect(steps).toContain('Einschwenken beim Mars');
    // Phobos ist winzig: Treffen wie mit der Station, dann langsam heran und landen.
    expect(steps.slice(-3)).toEqual([
      'Rendezvous mit Phobos',
      'Anflug zu Phobos',
      'Landung auf Phobos',
    ]);
  });

  it('nutzt beim Weg zu einem fremden Mond den Planeten als nächste Etappe', () => {
    expect(legGoal(PHOBOS, EARTH)).toBe(MARS);
    expect(legGoal(PHOBOS, SUN)).toBe(MARS);
    expect(legGoal(PHOBOS, MARS)).toBe(PHOBOS);
    expect(legGoal(bodyById('moon'), EARTH).id).toBe('moon');
    expect(orbiterFor('phobos')?.ref).toBe(MARS);
    expect(orbiterFor('moon')).toBeNull();
  });
});

describe('Missions-Autopilot: Flüge', () => {
  it('bringt die Rakete vom Startplatz in eine runde Umlaufbahn', () => {
    const f = new Flight(template('orbiter'));
    const m = fly(f, { target: 'orbit', land: false, home: false });
    expect(m.status, m.message).toBe('done');
    const o = f.orbit(EARTH);
    expect(o.periapsis).toBeGreaterThan(EARTH.atmosphere);
    expect(o.eccentricity).toBeLessThan(0.02);
  });

  it('dockt vom Startplatz aus an der Station an', () => {
    const f = new Flight(template('faehre'));
    const m = fly(f, { target: 'station', land: false, home: false });
    expect(m.status, m.message).toBe('done');
    expect(f.status).toBe('docked');
  });

  it('landet aus einer Marsbahn auf dem winzigen Phobos', () => {
    const f = new Flight(template('spatzsonde'));
    f.placeInOrbit(MARS, 60_000, 1);
    // Rendezvous und Angleichen bietet der Bordcomputer bei Phobos wie bei der Station an.
    f.target = 'phobos';
    const ids = planOptions(f).map((o) => o.id);
    expect(ids).toContain('transfer');
    expect(ids).toContain('match');
    const m = fly(f, { target: 'phobos', land: true, home: false });
    expect(m.status, m.message).toBe('done');
    expect(f.status).toBe('landed');
    expect(f.landedOn).toBe(PHOBOS);
  });

  it('umrundet den Mond und landet wieder auf der Erde', () => {
    const f = new Flight(template('luna'));
    f.placeInOrbit(EARTH, 80_000, 1);
    const m = fly(f, { target: 'moon', land: false, home: true });
    expect(m.status, m.message).toBe('done');
    expect(f.landedOn).toBe(EARTH);
    // Direkt heim, nicht erst auf eine weite Schleife um die Erde.
    expect(f.t).toBeLessThan(6 * 86_400);
  });

  it('wartet auf Pläne aus dem Hintergrund (Promise) und plant neu, wenn sie veraltet sind', async () => {
    const f = new Flight(template('orbiter'));
    let calls = 0;
    const m = new MissionPilot({ target: 'orbit', land: false, home: false }, f, async (fl, id) => {
      calls++;
      // Der erste Plan ist beim Eintreffen veraltet (wie bei einer Bahnänderung beim Rechnen).
      if (calls === 1) return { ok: false, title: 'x', text: 'veraltet', retry: true };
      return runPlan(fl, id);
    });
    for (let i = 0; i < 100_000 && m.update(f) === 'running'; i++) {
      f.update(1 / 60);
      if (m.detail === 'Bordcomputer rechnet …') await new Promise((r) => setTimeout(r, 0));
    }
    expect(m.status, m.message).toBe('done');
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
