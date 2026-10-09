import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/app/router';
import { sanitizeProgress, type Progress } from '../src/missions/progress';
import { OrbitPilot } from '../src/rocket/autopilot';
import { CHALLENGES } from '../src/rocket/challenges';
import { CHALLENGE_COUNT, GOAL_COUNT } from '../src/rocket/counts';
import { GOALS } from '../src/rocket/goals';
import { Flight, type Satellite } from '../src/rocket/flight';
import { TEMPLATES, checkDesign, stageStats } from '../src/rocket/parts';
import { DEFAULT_SANDBOX, applySandbox } from '../src/rocket/sandbox';
import { forTouch } from '../src/rocket/touch';
import { QUESTIONS, QUIZ, shuffledOrders } from '../src/quiz/questions';
import { clock, clockIn } from '../src/rocket/format';
import {
  GAME_EARTH,
  JUPITER,
  MARS,
  GAME_MOON,
  circularSpeed,
  forms,
  stationState,
} from '../src/rocket/world';

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
    f.placeInOrbit(GAME_EARTH, 100_000, Math.PI / 2);
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
    f.placeInOrbit(GAME_EARTH, 150_000, Math.PI / 2);
    const old: Satellite = { id: 1, name: 'Satellit 1', body: 'earth', el: f.elements(GAME_EARTH) };
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
    f.placeInOrbit(GAME_EARTH, 150_000, Math.PI / 2);
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
    expect(f.chute === 'armed' || f.chuteDeployed || f.status === 'landed').toBe(true);
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
    f.placeInOrbit(GAME_EARTH, 150_000, Math.PI / 2);
    f.setNode(f.t + 600, 300);
    const before = JSON.stringify(f.node);
    f.predict();
    expect(JSON.stringify(f.node)).toBe(before);

    const g = new Flight(['kapsel', 'tank-m', 'falke']);
    g.placeInOrbit(GAME_EARTH, 100_000, Math.PI / 2);
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
    const fast = stageStats(d, { thrust: 10, infiniteFuel: false, body: GAME_EARTH })[0]!;
    expect(fast.twrStart).toBeCloseTo(base.twrEarth * 10, 6);
    expect(fast.deltaV).toBeCloseTo(base.deltaV, 6);
    expect(fast.burnTime).toBeCloseTo(base.burnTime / 10, 6);
    const endless = stageStats(d, { thrust: 1, infiniteFuel: true, body: GAME_EARTH })[0]!;
    expect(endless.deltaV).toBe(Infinity);
    const moon = stageStats(d, { thrust: 1, infiniteFuel: false, body: GAME_MOON })[0]!;
    expect(moon.twrStart).toBeCloseTo(base.twrMoon, 6);
  });

  it('eine zu schwere Rakete hebt auf dem Mond ab – die Warnung passt sich an', () => {
    const heavy = ['kapsel', 'tank-l', 'tank-l', 'kolibri'];
    const heavyWarn = (rules?: Parameters<typeof checkDesign>[1]): boolean =>
      checkDesign(heavy, rules).some((p) => p.text.startsWith('Zu schwer'));
    expect(heavyWarn()).toBe(true);
    expect(heavyWarn({ thrust: 1, infiniteFuel: false, body: GAME_MOON })).toBe(false);
  });
});

describe('Touchscreen-Tipps (QA)', () => {
  it('nennen keine Tasten, behalten aber Inhalte in Klammern', () => {
    expect(forTouch('Fallschirm scharf (P), SAS retrograd (Taste 3).')).toBe(
      'Fallschirm scharf, SAS retrograd.',
    );
    expect(forTouch('„Wiedereintritt“ (Pe 25 km)')).toBe('„Wiedereintritt“ (Pe 25 km)');
    expect(forTouch('Schub hochziehen (W / ↑, Z = Vollgas) – los!')).toBe(
      'Schub hochziehen – los!',
    );
  });
});

describe('Texte (QA)', () => {
  it('Zahlen auf der Startseite passen zu den Listen', () => {
    expect(CHALLENGE_COUNT).toBe(CHALLENGES.length);
    expect(GOAL_COUNT).toBe(GOALS.length);
  });
});

describe('Namen mit Artikel (QA)', () => {
  it('bildet die Fälle für Planeten und Monde', () => {
    expect(forms(MARS).to).toBe('zum Mars');
    expect(forms(GAME_EARTH).dat).toBe('der Erde');
    expect(forms(GAME_MOON).acc).toBe('den Mond');
    expect(forms(JUPITER).at).toBe('beim Jupiter');
  });

  it('„in 181 Tagen“ nach „in“, sonst „Tage“', () => {
    const t = 181 * 86_400 + 3_600;
    expect(clockIn(t)).toBe('181 Tagen 01:00:00');
    expect(clock(t)).toBe('181 Tage 01:00:00');
    expect(clockIn(86_400 + 60)).toBe('1 Tag 00:01:00');
  });
});

describe('Quiz (QA)', () => {
  it('deckt alle neun Kapitel ab und mischt die Antworten', () => {
    const chapters = new Set(QUESTIONS.map((q) => q.chapter));
    for (let c = 1; c <= 9; c++) expect(chapters.has(c), `Kapitel ${c}`).toBe(true);
    expect(QUIZ[0]!.chapter).toBe(1);
    // Ein fester Zufall ergibt eine gültige Umordnung jeder Frage.
    let seed = 7;
    const orders = shuffledOrders(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646);
    orders.forEach((o, i) => expect([...o].sort()).toEqual(QUIZ[i]!.options.map((_, k) => k)));
    // Die richtige Antwort steht nicht immer an derselben Stelle.
    expect(new Set(orders.map((o, i) => o.indexOf(QUIZ[i]!.answer))).size).toBeGreaterThan(2);
  });
});

describe('App (QA)', () => {
  it('kaputter Spielstand fällt Feld für Feld auf die Voreinstellung zurück', () => {
    const broken = sanitizeProgress({
      stars: { a: 3, b: 'x' },
      best: 5,
      quizBest: 'viel',
      kids: null,
      rocketDesign: 'kapsel',
      rocketGoals: 'orbit',
      rocketHangar: [],
      rocketPaint: 3,
      rocketChallenges: { hop: { stars: 2, text: 'ok' }, bad: 7 },
      rocketSats: {},
      rocketSeen: [1, 'x'],
      rocketSandbox: undefined,
    } as unknown as Progress);
    expect(broken.stars).toEqual({ a: 3 });
    expect(broken.quizBest).toBe(0);
    expect(broken.rocketGoals).toEqual([]);
    expect(broken.rocketDesign).toBe(null);
    expect(broken.rocketChallenges).toEqual({ hop: { stars: 2, text: 'ok' } });
    expect(broken.rocketSeen).toEqual(['x']);
    expect(broken.rocketPaint).toBe('klassisch');
  });

  it('Ziele und Sterne aus dem Speicher: nur bekannte, eindeutige Ziele, Sterne von 0 bis 3', () => {
    const p = sanitizeProgress({
      rocketGoals: ['orbit', 'moonland', 'orbit', 'gibt-es-nicht', 42],
      rocketChallenges: {
        hop: { stars: 3, text: 'ok' },
        phobos: { stars: 99, text: 'zu viel' },
        ceres: { stars: 1.5, text: 'halb' },
        mars: { stars: -1, text: 'negativ' },
      },
    } as unknown as Progress);
    // Ein doppelter Eintrag würde die Punkte doppelt zählen.
    expect(p.rocketGoals).toEqual(['orbit', 'moonland']);
    expect(p.rocketChallenges).toEqual({ hop: { stars: 3, text: 'ok' } });
  });

  it('unbekannte Adressen und Kapitel landen auf „Seite nicht gefunden“', () => {
    expect(parseHash('#kapitel-3').page).toBe('kapitel');
    expect(parseHash('#kapitel-0').page).toBe('unbekannt');
    expect(parseHash('#kapitel-abc').page).toBe('unbekannt');
    expect(parseHash('#xyz').page).toBe('unbekannt');
    expect(parseHash('#karte').page).toBe('karte');
    expect(parseHash('').page).toBe('start');
  });
});
