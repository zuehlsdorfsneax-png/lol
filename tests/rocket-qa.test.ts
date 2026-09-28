import { describe, expect, it } from 'vitest';
import { OrbitPilot } from '../src/rocket/autopilot';
import { Flight, type Satellite } from '../src/rocket/flight';
import { TEMPLATES, checkDesign, stageStats } from '../src/rocket/parts';
import { DEFAULT_SANDBOX, applySandbox } from '../src/rocket/sandbox';
import { EARTH, JUPITER, MARS, MOON, circularSpeed, stationState } from '../src/rocket/world';

const template = (id: string): string[] => [...TEMPLATES.find((t) => t.id === id)!.parts];

function run(f: Flight, seconds: number, each?: () => void): void {
  for (let i = 0; i < seconds * 60 && f.status !== 'crashed'; i++) {
    each?.();
    f.update(1 / 60);
  }
}

/** Kurzer Flug mit wenig Treibstoff und am Fallschirm zurück. */
function hop(f: Flight): void {
  f.active.fuel *= 0.12;
  f.throttle = 1;
  run(f, 600, () => {
    if (f.active.fuel === 0 && f.chute === 'stowed') f.deployChute();
  });
}

describe('Spiellogik (QA)', () => {
  it('„Kommt näher“: closing ist positiv, wenn der Abstand schrumpft', () => {
    const f = new Flight(['kapsel', 'tank-s', 'falke']);
    f.placeInOrbit(EARTH, 100_000, Math.PI / 2);
    const [sx, sy, svx, svy] = stationState(f.t);
    const v = Math.hypot(svx, svy);
    // 1 km hinter der Station, 5 m/s schneller als sie.
    f.x = sx - (svx / v) * 1_000;
    f.y = sy - (svy / v) * 1_000;
    f.vx = svx * (1 + 5 / v);
    f.vy = svy * (1 + 5 / v);
    f.target = 'station';
    const before = f.targetInfo()!;
    expect(before.closing).toBeGreaterThan(4);
    run(f, 1);
    expect(f.targetInfo()!.distance).toBeLessThan(before.distance);
  });

  it('Heimkehr zählt nur mit Kapsel an Bord', () => {
    const probe = new Flight(['fallschirm', 'sonde', 'tank-s', 'falke']);
    probe.goals.add('moonland');
    hop(probe);
    expect(probe.status).toBe('landed');
    expect(probe.goals.has('return')).toBe(false);

    const crew = new Flight(['fallschirm', 'kapsel', 'tank-s', 'falke']);
    crew.goals.add('moonland');
    hop(crew);
    expect(crew.status).toBe('landed');
    expect(crew.goals.has('return')).toBe(true);
  });

  it('unzerstörbar: an Jupiter abprallen statt landen', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    applySandbox(f, { ...DEFAULT_SANDBOX, indestructible: true, start: 'jupiterorbit' });
    f.vx *= 0.2;
    f.vy *= 0.2;
    run(f, 600);
    expect(f.status).toBe('flying');
    expect(f.landedOn).not.toBe(JUPITER);
  });

  it('Spielstand speichert Hitze, besuchte Körper und Sandkasten-Regeln', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    applySandbox(f, { ...DEFAULT_SANDBOX, start: 'orbit', thrust: 5, heat: false });
    f.heat = 0.9;
    f.visited.add('moon');
    const snap = JSON.parse(JSON.stringify(f.snapshot())) as ReturnType<Flight['snapshot']>;
    const g = Flight.restore(snap!);
    expect(snap!.v).toBe(3);
    expect(g.heat).toBeCloseTo(0.9);
    expect(g.visited.has('moon')).toBe(true);
    expect(g.sandbox).toBe(true);
    expect(g.thrustScale).toBe(5);
    expect(g.heatOn).toBe(false);
  });

  it('Satelliten bekommen eindeutige Nummern und Namen', () => {
    const f = new Flight(['satellit', 'satellit', 'sonde', 'tank-m', 'falke']);
    f.placeInOrbit(EARTH, 150_000, Math.PI / 2);
    const old: Satellite = { id: 1, name: 'Satellit 1', body: 'earth', el: f.elements(EARTH) };
    f.satellites = [old];
    expect(f.deploySatellite()).toBe(true);
    run(f, 2);
    expect(f.deploySatellite()).toBe(true);
    const ids = f.satellites.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(f.satellites.map((s) => s.name)).toEqual(['Satellit 1', 'Satellit 2', 'Satellit 3']);
  });

  it('Sandkasten-Satelliten bringen keine Ziele', () => {
    const f = new Flight(['satellit', 'sonde', 'tank-m', 'falke']);
    applySandbox(f, { ...DEFAULT_SANDBOX, start: 'orbit' });
    expect(f.deploySatellite()).toBe(true);
    expect(f.satellites[0]!.sandbox).toBe(true);
    expect(f.goals.has('satellite')).toBe(false);
  });

  it('Stufentrennung erhält den Impuls', () => {
    const f = new Flight(template('orbiter'));
    f.placeInOrbit(EARTH, 150_000, Math.PI / 2);
    const m0 = f.mass;
    const p0 = [f.vx * m0, f.vy * m0];
    const n = f.debris.length;
    expect(f.stage()).toBe(true);
    const d = f.debris[n]!;
    const md = m0 - f.mass;
    expect(f.vx * f.mass + d.vx * md).toBeCloseTo(p0[0]!, 3);
    expect(f.vy * f.mass + d.vy * md).toBeCloseTo(p0[1]!, 3);
  });

  it('abgeworfener großer Schirm bleibt ein großer Schirm', () => {
    const f = new Flight(['fallschirm-xl', 'kapsel', 'tank-m', 'falke']);
    f.chute = 'open';
    f.status = 'flying';
    f.cutChute();
    expect(f.debris.at(-1)!.parts).toEqual(['fallschirm-xl']);
  });

  it('Brenndauer ohne Treibstoffverbrauch: Masse bleibt gleich', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    applySandbox(f, { ...DEFAULT_SANDBOX, fuel: true });
    expect(f.burnTime(500)).toBeCloseTo((500 * f.mass) / f.engine().thrust, 6);
  });

  it('Hilfe-Pilot gibt auf, wenn der Treibstoff nicht reicht, und macht den Schirm scharf', () => {
    const f = new Flight(template('huepfer'));
    const pilot = new OrbitPilot();
    expect(f.deltaV()).toBeLessThan(pilot.needed);
    run(f, 400, () => pilot.update(f));
    expect(pilot.phase).toBe('failed');
    expect(pilot.message).toContain('Umlaufbahn');
    expect(f.chute === 'armed' || f.chute === 'open' || f.status === 'landed').toBe(true);
  });

  it('„Butterweich“ zählt nicht für einen Hüpfer auf der Rampe', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    f.throttle = 1;
    run(f, 0.1);
    f.throttle = 0;
    run(f, 10);
    expect(f.status).toBe('landed');
    expect(f.goals.has('soft')).toBe(false);
  });

  it('Vorhersage verändert das geplante Manöver nicht; Vorbeiflug wählt kein Ziel', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    f.placeInOrbit(EARTH, 150_000, Math.PI / 2);
    f.setNode(f.t + 600, 300);
    const before = JSON.stringify(f.node);
    f.predict();
    expect(JSON.stringify(f.node)).toBe(before);

    const g = new Flight(['kapsel', 'tank-m', 'falke']);
    g.placeInOrbit(EARTH, 100_000, Math.PI / 2);
    const [sx, sy, svx, svy] = stationState(g.t);
    g.x = sx + 150;
    g.y = sy;
    g.vx = svx + 40;
    g.vy = svy;
    g.target = null;
    run(g, 0.5);
    expect(g.target).toBe(null);
  });

  it('Trümmer bremsen auch in der Marsluft', () => {
    const f = new Flight(['kapsel', 'tank-m', 'falke']);
    f.placeInOrbit(MARS, 5_000, Math.PI / 2);
    const m0 = f.state(MARS);
    f.debris.push({
      x: f.x,
      y: f.y,
      vx: f.vx,
      vy: f.vy,
      angle: 0,
      spin: 0,
      parts: ['tank-m'],
      age: 0,
    });
    const d = f.debris.at(-1)!;
    const v0 = Math.hypot(d.vx - m0.vx, d.vy - m0.vy);
    run(f, 5);
    const m = f.state(MARS);
    const v1 = Math.hypot(d.vx - m.vx, d.vy - m.vy);
    // Ohne Luft bliebe die Bahngeschwindigkeit fast gleich.
    expect(v1).toBeLessThan(v0 - 5);
    expect(circularSpeed(MARS, 5_000)).toBeGreaterThan(1_000);
  });
});

describe('Werft (QA)', () => {
  const chuteWarn = (d: string[]): boolean =>
    checkDesign(d).some((p) => p.text.startsWith('Ohne Fallschirm'));

  it('Fallschirm-Warnung kennt alle Kapseln und Schirme', () => {
    expect(chuteWarn(['kapsel', 'tank-m', 'falke'])).toBe(true);
    expect(chuteWarn(['kapsel-xl', 'tank-m', 'falke'])).toBe(true);
    expect(chuteWarn(['fallschirm-xl', 'kapsel', 'tank-m', 'falke'])).toBe(false);
    expect(chuteWarn(['sonde', 'tank-m', 'falke'])).toBe(false);
  });

  it('Sandkasten-Regeln ändern Schub, Δv und Startschwerkraft in der Werft', () => {
    const d = ['kapsel', 'tank-m', 'falke'];
    const base = stageStats(d)[0]!;
    const fast = stageStats(d, { thrust: 10, infiniteFuel: false, body: EARTH })[0]!;
    expect(fast.twrStart).toBeCloseTo(base.twrEarth * 10, 6);
    expect(fast.deltaV).toBeCloseTo(base.deltaV, 6);
    expect(fast.burnTime).toBeCloseTo(base.burnTime / 10, 6);
    const endless = stageStats(d, { thrust: 1, infiniteFuel: true, body: EARTH })[0]!;
    expect(endless.deltaV).toBe(Infinity);
    const moon = stageStats(d, { thrust: 1, infiniteFuel: false, body: MOON })[0]!;
    expect(moon.twrStart).toBeCloseTo(base.twrMoon, 6);
  });

  it('eine zu schwere Rakete hebt auf dem Mond ab – die Warnung passt sich an', () => {
    const heavy = ['kapsel', 'tank-l', 'tank-l', 'kolibri'];
    const heavyWarn = (rules?: Parameters<typeof checkDesign>[1]): boolean =>
      checkDesign(heavy, rules).some((p) => p.text.startsWith('Zu schwer'));
    expect(heavyWarn()).toBe(true);
    expect(heavyWarn({ thrust: 1, infiniteFuel: false, body: MOON })).toBe(false);
  });
});
