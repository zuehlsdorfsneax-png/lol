/**
 * Herausforderungen: feste Rakete, feste Startsituation, klares Ziel und bis zu drei Sterne.
 * Von der Flugschule (erster Hüpfer, erste Umlaufbahn) bis zum Bremsen in letzter Sekunde auf dem
 * Mars.
 */
import { wrapAngle } from '../physics/analysis';
import { apsides, bodySpin, satelliteState, type Flight } from './flight';
import { fmt, km } from './format';
import {
  CERES,
  GAME_EARTH,
  JUPITER,
  MARS,
  GAME_MOON,
  PHOBOS,
  bodyState,
  stationState,
} from './world';

export type ChallengeGroup = 'Flugschule' | 'Profi' | 'Meister';

export interface ChallengeResult {
  success: boolean;
  stars: number;
  text: string;
  /** Welche Stern-Bedingungen erfüllt sind (die erste: geschafft). */
  met?: boolean[];
}

/** Merkzettel einer laufenden Herausforderung (z. B. seit wann das Triebwerk aus ist). */
export type Memo = Record<string, number>;

export interface Challenge {
  id: string;
  group: ChallengeGroup;
  title: string;
  /** Die Aufgabe in einem Satz. */
  brief: string;
  /** Tipps für unterwegs. */
  tips: string[];
  /** Bedingungen für einen, zwei und drei Sterne. */
  stars: [string, string, string];
  design: string[];
  /** Darf der Bordcomputer helfen? */
  computer: boolean;
  setup(f: Flight): void;
  /** Ergebnis, sobald die Herausforderung entschieden ist (sonst null). */
  judge(f: Flight, memo: Memo): ChallengeResult | null;
  /** Zwischenstand für die Anzeige. */
  progress(f: Flight): string;
}

const pct = (x: number): string => `${Math.round(x * 100)} %`;

function crashed(f: Flight): ChallengeResult | null {
  return f.status === 'crashed' ? { success: false, stars: 0, text: f.crashReason } : null;
}

/** Wartet, bis das Triebwerk ein paar Sekunden aus ist (dann erst werten). */
function settled(f: Flight, memo: Memo, ok: boolean): boolean {
  if (!ok || f.thrusting) {
    delete memo.since;
    return false;
  }
  memo.since ??= f.t;
  return f.t - memo.since > 3;
}

/** Sterne zählen – und festhalten, welche Bedingung erfüllt ist (sie sind oft unabhängig). */
function stars(...conditions: boolean[]): { stars: number; met: boolean[] } {
  return { stars: conditions.filter(Boolean).length, met: conditions };
}

/** Senkrecht über einem Körper, mit Tempo nach unten. */
function placeFalling(f: Flight, body: typeof MARS, angle: number, altitude: number, down: number) {
  const [bx, by, bvx, bvy] = bodyState(body, f.t);
  const r = body.radius + altitude;
  f.status = 'flying';
  f.landedOn = null;
  f.x = bx + r * Math.cos(angle);
  f.y = by + r * Math.sin(angle);
  f.vx = bvx - down * Math.cos(angle);
  f.vy = bvy - down * Math.sin(angle);
  f.angle = angle;
}

/** Der Punkt auf der Mondoberfläche, der zur Erde zeigt, liegt beim Winkel π (mitdrehend). */
const MOON_BASE = Math.PI + 0.35;
const PHOBOS_BASE = 1.2;
const PHOBOS_START = PHOBOS_BASE + 2_000 / PHOBOS.radius;
/** Der Eisvulkan Ahuna Mons auf Ceres (Winkel auf der Oberfläche; Ceres dreht sich im Spiel nicht). */
const CERES_BASE = 0.9;
/** Bahnradius Ganymeds (für die Wertung beim Einfangen am Jupiter). */
const GANYMEDE_ORBIT = 100_800_000;

/** Abstand entlang der Phobos-Oberfläche vom Startplatz (die Regel misst am Boden, nicht im Raum). */
function phobosFromStart(f: Flight): number {
  const [bx, by] = bodyState(PHOBOS, f.t);
  const local = Math.atan2(f.y - by, f.x - bx) - bodySpin(PHOBOS, f.t);
  return PHOBOS.radius * Math.abs(wrapAngle(local - PHOBOS_START));
}

export const CHALLENGES: readonly Challenge[] = [
  {
    id: 'hop',
    group: 'Flugschule',
    title: 'Erster Hüpfer',
    brief: 'Flieg höher als 10 km und lande sicher wieder auf der Erde.',
    tips: [
      'Vollgas mit Z, dann senkrecht nach oben.',
      'Ist der Tank leer, mit P den Fallschirm scharf machen.',
      'Er öffnet sich von selbst, sobald die Rakete langsam genug ist.',
    ],
    stars: [
      'über 10 km hoch und sicher gelandet',
      'über 40 km – im Weltraum',
      'mit weniger als 4 m/s aufgesetzt',
    ],
    design: ['fallschirm', 'kapsel', 'tank-m', 'falke'],
    computer: false,
    setup: () => undefined,
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      const land = f.stats.lastLanding;
      if (f.status !== 'landed' || !land || f.stats.liftoff === null || f.maxAltitude < 50)
        return null;
      if (f.maxAltitude < 10_000)
        return {
          success: false,
          stars: 0,
          text: `Gelandet – aber nur ${km(f.maxAltitude)} hoch. Das Ziel sind 10 km.`,
        };
      return {
        success: true,
        ...stars(true, f.maxAltitude > 40_000, land.speed < 4),
        text: `${km(f.maxAltitude)} hoch, gelandet mit ${fmt(land.speed, 1)} m/s.`,
      };
    },
    progress: (f) => `Höchster Punkt: ${km(f.maxAltitude)}`,
  },
  {
    id: 'orbit',
    group: 'Flugschule',
    title: 'Ab in die Umlaufbahn',
    brief: 'Bring die Rakete in eine Umlaufbahn: Der tiefste Punkt muss über 40 km liegen.',
    tips: [
      'Senkrecht starten, ab 3 km langsam nach rechts neigen.',
      'Liegt der höchste Punkt (Ap) über 70 km, Triebwerk aus.',
      'Am Ap waagerecht Gas geben, bis der Pe über 40 km liegt.',
    ],
    stars: [
      'Umlaufbahn erreicht',
      'mehr als 1.000 m/s Δv übrig',
      'fast kreisrund: Ap und Pe weniger als 15 km auseinander',
    ],
    design: ['fallschirm', 'kapsel', 'tank-m', 'falke', 'trenner', 'tank-l', 'titan'],
    computer: false,
    setup: () => undefined,
    judge(f, memo) {
      const c = crashed(f);
      if (c) return c;
      const o = f.orbit(GAME_EARTH);
      const inOrbit = f.refBody() === GAME_EARTH && o.bound && o.periapsis > GAME_EARTH.atmosphere;
      if (!settled(f, memo, inOrbit)) return null;
      const dv = f.deltaV();
      return {
        success: true,
        ...stars(true, dv > 1_000, o.apoapsis - o.periapsis < 15_000),
        text: `Ap ${km(o.apoapsis)}, Pe ${km(o.periapsis)}, noch ${Math.round(dv)} m/s Δv.`,
      };
    },
    progress: (f) => {
      const o = f.orbit(GAME_EARTH);
      return `Ap ${o.bound ? km(o.apoapsis) : '–'} · Pe ${km(o.periapsis)}`;
    },
  },
  {
    id: 'plan',
    group: 'Flugschule',
    title: 'Der Bordcomputer',
    brief: 'Hebe deine Bahn auf etwa 500 km an und mache sie wieder rund (Pe und Ap 450–550 km).',
    tips: [
      'Karte öffnen (M) und auf die Bahn tippen: So entsteht ein Manöver.',
      'Oder im Bordcomputer „Kreisbahn am Ap“ nutzen, nachdem der Ap oben ist.',
      '„Ausführen“ fliegt das Manöver automatisch.',
    ],
    stars: [
      'Bahn zwischen 450 und 550 km',
      'in weniger als 1 Stunde Spielzeit',
      'mit höchstens 560 m/s Δv',
    ],
    design: ['fallschirm', 'kapsel', 'tank-m', 'falke'],
    computer: true,
    setup: (f) => f.placeInOrbit(GAME_EARTH, 80_000, Math.PI / 2),
    judge(f, memo) {
      const c = crashed(f);
      if (c) return c;
      const o = f.orbit(GAME_EARTH);
      const ok =
        f.refBody() === GAME_EARTH && o.bound && o.periapsis >= 450_000 && o.apoapsis <= 550_000;
      if (!settled(f, memo, ok)) return null;
      return {
        success: true,
        ...stars(true, f.t < 3600, f.stats.dvUsed <= 560),
        text: `Pe ${km(o.periapsis)}, Ap ${km(o.apoapsis)}, ${Math.round(f.stats.dvUsed)} m/s verbraucht.`,
      };
    },
    progress: (f) => {
      const o = f.orbit(GAME_EARTH);
      return `Ap ${o.bound ? km(o.apoapsis) : '–'} · Pe ${km(o.periapsis)} · ${Math.round(f.stats.dvUsed)} m/s`;
    },
  },
  {
    id: 'dock',
    group: 'Profi',
    title: 'Andocken an Kepler',
    brief: 'Die Station fliegt knapp vor dir, 10 km höher. Hol sie ein und docke an.',
    tips: [
      'Tiefer ist schneller: Du holst die Station von selbst ein.',
      'Bordcomputer: „Rendezvous“, dann „Geschwindigkeit angleichen“.',
      'Die letzten Meter mit RCS (R): unter 2 m/s an den grünen Stutzen.',
    ],
    stars: ['angedockt', 'in weniger als 1 Stunde', 'mit weniger als 200 m/s Δv'],
    design: ['kapsel', 'tank-s', 'kolibri'],
    computer: true,
    setup(f) {
      const [sx, sy] = stationState(f.t);
      f.placeInOrbit(GAME_EARTH, 140_000, Math.atan2(sy, sx) + (4 * Math.PI) / 180);
      f.target = 'station';
      f.rcs = true;
    },
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.status !== 'docked') return null;
      return {
        success: true,
        ...stars(true, f.t < 3600, f.stats.dvUsed < 200),
        text: `Angedockt nach ${Math.round(f.t / 60)} min mit ${Math.round(f.stats.dvUsed)} m/s Δv.`,
      };
    },
    progress: (f) => {
      const ti = f.targetInfo();
      return ti ? `Abstand ${km(ti.distance)} · ${fmt(ti.speed, 1)} m/s` : '';
    },
  },
  {
    id: 'satnet',
    group: 'Profi',
    title: 'Satellitennetz',
    brief: 'Setze alle drei Satelliten auf stabilen Bahnen um die Erde aus (Taste N).',
    tips: [
      'Erst die Bahn anheben: Satelliten unter 40 km stürzen ab.',
      'Satelliten auf derselben Bahn behalten ihren Abstand.',
      'Für gleiche Abstände: je eine Drittel-Umlaufzeit warten.',
    ],
    stars: [
      'drei Satelliten auf stabilen Bahnen',
      'alle drei höher als 1.000 km (Pe)',
      'gleichmäßig verteilt: jede Lücke über 100°',
    ],
    design: ['satellit', 'satellit', 'satellit', 'sonde', 'tank-m', 'falke'],
    computer: true,
    setup: (f) => f.placeInOrbit(GAME_EARTH, 250_000, Math.PI / 2),
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.satellitesOnBoard > 0) return null;
      const sats = f.satellites.filter((s) => s.body === 'earth');
      if (sats.length < 3)
        return {
          success: false,
          stars: 0,
          text: `Nur ${sats.length} von 3 Satelliten kreisen – die anderen sind abgestürzt.`,
        };
      const high = sats.every((s) => apsides(s.el).peri - GAME_EARTH.radius > 1_000_000);
      const angles = sats
        .map((s) => {
          const [x, y] = satelliteState(s, f.t);
          const [ex, ey] = bodyState(GAME_EARTH, f.t);
          return Math.atan2(y - ey, x - ex);
        })
        .sort((a, b) => a - b);
      const gaps = angles.map((a, i) =>
        i === angles.length - 1 ? angles[0]! + 2 * Math.PI - a : angles[i + 1]! - a,
      );
      const even = gaps.every((g) => g > (100 * Math.PI) / 180);
      return {
        success: true,
        ...stars(true, high, even),
        text: `Kleinste Lücke ${Math.round((Math.min(...gaps) * 180) / Math.PI)}°, tiefster Satellit ${km(Math.min(...sats.map((s) => apsides(s.el).peri)) - GAME_EARTH.radius)}.`,
      };
    },
    progress: (f) => `Satelliten ausgesetzt: ${3 - f.satellitesOnBoard} von 3`,
  },
  {
    id: 'moonbase',
    group: 'Profi',
    title: 'Landung an der Mondbasis',
    brief: 'Du kreist 25 km über dem Mond. Lande so nah wie möglich an der Mondbasis.',
    tips: [
      'Die Basis ist auf Karte und Boden markiert.',
      'Etwa eine Viertelrunde vor der Basis gegen die Flugrichtung bremsen.',
      'Kurz vor dem Boden senkrecht stellen und auf unter 14 m/s bremsen.',
    ],
    stars: ['sicher gelandet', 'höchstens 20 km von der Basis', 'höchstens 2 km von der Basis'],
    design: ['kapsel', 'tank-m', 'beine', 'kolibri'],
    computer: true,
    setup(f) {
      f.site = { body: 'moon', angle: MOON_BASE, name: 'Mondbasis' };
      const base = bodySpin(GAME_MOON, f.t) + MOON_BASE;
      f.placeInOrbit(GAME_MOON, 25_000, base + Math.PI / 2);
    },
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.status !== 'landed' || f.landedOn !== GAME_MOON) return null;
      const d = f.siteInfo()!.distance;
      return {
        success: true,
        ...stars(true, d <= 20_000, d <= 2_000),
        text: `Gelandet ${d < 10_000 ? `${Math.round(d)} m` : km(d)} neben der Basis.`,
      };
    },
    progress: (f) => {
      const s = f.siteInfo();
      return s
        ? `Abstand zur Basis: ${s.distance < 10_000 ? `${Math.round(s.distance)} m` : km(s.distance)}`
        : '';
    },
  },
  {
    id: 'suicide',
    group: 'Profi',
    title: 'Bremsen in letzter Sekunde',
    brief: '12 km über dem Mars, 250 m/s nach unten, kein Fallschirm: Bremse im letzten Moment.',
    tips: [
      'Früh bremsen kostet Treibstoff – die Schwerkraft zieht die ganze Zeit.',
      'Achte auf „Boden in … s“ und die Bremswarnung.',
      'Ideal: einmal Vollgas, genau bis zum Boden.',
    ],
    stars: [
      'sicher gelandet',
      'noch mindestens 50 % Treibstoff',
      'noch mindestens 70 % Treibstoff',
    ],
    design: ['kapsel', 'tank-s', 'beine', 'kolibri'],
    computer: false,
    setup: (f) => placeFalling(f, MARS, Math.PI / 2, 12_000, 250),
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.status !== 'landed') return null;
      const left = f.active.fuel / f.fuelCapacity;
      return {
        success: true,
        ...stars(true, left >= 0.5, left >= 0.7),
        text: `Gelandet mit ${pct(left)} Treibstoff.`,
      };
    },
    progress: (f) => `Treibstoff: ${pct(f.active.fuel / Math.max(1, f.fuelCapacity))}`,
  },
  {
    id: 'glider',
    group: 'Meister',
    title: 'Mars-Gleiter',
    brief:
      'Flacher Einflug in die dünne Marsluft mit 700 m/s. Luftbremsen und großer Fallschirm sparen Treibstoff – lande mit möglichst vollem Tank.',
    tips: [
      'Sofort die Luftbremsen ausfahren (U) und den Fallschirm scharf machen (P).',
      'SAS „retrograd“ hält die Rakete stabil.',
      'Erst kurz vor dem Boden mit dem Triebwerk abfangen.',
    ],
    stars: [
      'sicher gelandet',
      'noch mindestens 40 % Treibstoff',
      'noch mindestens 75 % Treibstoff',
    ],
    design: ['fallschirm-xl', 'kapsel', 'luftbremse', 'tank-s', 'beine', 'kolibri'],
    computer: false,
    setup: (f) => {
      // Flach von der Seite in die dünne Marsluft: 700 m/s vorwärts, 60 m/s nach unten.
      placeFalling(f, MARS, Math.PI / 2, 25_000, 60);
      f.vx -= 700;
      f.angle = 0;
    },
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.status !== 'landed') return null;
      const left = f.active.fuel / f.fuelCapacity;
      return {
        success: true,
        ...stars(true, left >= 0.4, left >= 0.75),
        text: `Gelandet mit ${pct(left)} Treibstoff.`,
      };
    },
    progress: (f) =>
      `Treibstoff: ${pct(f.active.fuel / Math.max(1, f.fuelCapacity))}${f.airbrakes ? ' · Luftbremsen draußen' : ''}`,
  },
  {
    id: 'reentry',
    group: 'Meister',
    title: 'Heimkehr durchs Feuer',
    brief:
      'Zurück vom Mond – doch der tiefste Punkt liegt nur 5 km hoch: zu steil! Korrigiere und lande sicher.',
    tips: [
      'Mit dem Triebwerk den Pe auf 20–30 km anheben (oder Bordcomputer: Wiedereintritt).',
      'Dann die Triebwerksstufe abwerfen: Jetzt ist der Hitzeschild ganz unten.',
      'SAS „retrograd“: Der Schild fliegt voran. Fallschirm scharf (P).',
    ],
    stars: ['sicher gelandet', 'Hitze unter 60 %', 'Hitze unter 35 %'],
    design: ['fallschirm', 'kapsel', 'hitzeschild', 'trenner', 'tank-s', 'kolibri'],
    computer: true,
    setup(f) {
      // Rückkehrbahn vom Mond: höchster Punkt beim Mond, tiefster Punkt 5 km über der Erde.
      const rp = GAME_EARTH.radius + 5_000;
      const ra = GAME_MOON.distance;
      const r0 = 20_000_000;
      const a = (rp + ra) / 2;
      const v = Math.sqrt(GAME_EARTH.mu * (2 / r0 - 1 / a));
      const h = Math.sqrt((GAME_EARTH.mu * 2 * ra * rp) / (ra + rp));
      const vt = h / r0;
      const vr = -Math.sqrt(Math.max(0, v * v - vt * vt));
      const [mx, my] = bodyState(GAME_MOON, f.t);
      const th = Math.atan2(my, mx) + Math.PI * 0.8;
      f.status = 'flying';
      f.landedOn = null;
      f.x = r0 * Math.cos(th);
      f.y = r0 * Math.sin(th);
      f.vx = vr * Math.cos(th) + vt * Math.sin(th);
      f.vy = vr * Math.sin(th) - vt * Math.cos(th);
      f.angle = Math.atan2(f.vy, f.vx);
    },
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.status !== 'landed' || f.landedOn !== GAME_EARTH) return null;
      return {
        success: true,
        ...stars(true, f.maxHeat < 0.6, f.maxHeat < 0.35),
        text: `Gelandet! Höchste Hitze: ${pct(f.maxHeat)}.`,
      };
    },
    progress: (f) => {
      const o = f.orbit(GAME_EARTH);
      return `Pe ${km(o.periapsis)} · Hitze ${pct(f.heat)}`;
    },
  },
  {
    id: 'phobos',
    group: 'Meister',
    title: 'Phobos-Hüpfer',
    brief:
      'Auf Phobos wiegt die Rakete fast nichts. Hüpfe zur Forschungsstation 2 km weiter und lande dort.',
    tips: [
      'Winzige Schübe genügen: Schubregler statt Vollgas.',
      'Über 11 m/s fliegst du Phobos davon!',
      'Die Station ist am Boden markiert.',
    ],
    stars: [
      'gelandet, mindestens 500 m vom Start',
      'höchstens 250 m von der Station',
      'höchstens 50 m von der Station',
    ],
    design: ['sonde', 'tank-s', 'beine', 'ionen'],
    computer: false,
    setup(f) {
      f.site = { body: 'phobos', angle: PHOBOS_BASE, name: 'Forschungsstation' };
      f.placeLanded(PHOBOS, PHOBOS_START);
    },
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.refBody() !== PHOBOS && f.status === 'flying' && !f.orbit(PHOBOS).bound)
        return {
          success: false,
          stars: 0,
          text: 'Zu schnell – die Rakete ist Phobos davongeflogen.',
        };
      if (f.status !== 'landed' || f.stats.liftoff === null) return null;
      if (phobosFromStart(f) < 500) return null;
      const d = f.siteInfo()!.distance;
      return {
        success: true,
        ...stars(true, d <= 250, d <= 50),
        text: `Gelandet ${Math.round(d)} m neben der Station.`,
      };
    },
    progress: (f) => {
      const s = f.siteInfo();
      if (!s) return '';
      if (f.status === 'landed' && f.stats.liftoff !== null && phobosFromStart(f) < 500)
        return 'Zu nah am Start – lande mindestens 500 m davon entfernt.';
      return `Abstand zur Station: ${Math.round(s.distance)} m`;
    },
  },
  {
    id: 'ceres',
    group: 'Profi',
    title: 'Eisvulkan auf Ceres',
    brief:
      'Aus einer niedrigen Bahn um den Zwergplaneten Ceres hinunter zum Eisvulkan Ahuna Mons – und dort sanft aufsetzen.',
    tips: [
      'Um Ceres geht es nur mit rund 100 m/s – ein kurzer Bremsschub gegen die Flugrichtung genügt.',
      'Der Eisvulkan ist auf der Karte (M) markiert. Bremse, wenn er etwa eine Viertelrunde vor dir liegt.',
      'Ceres zieht nur mit 0,28 m/s² – kurz vor dem Boden reicht ganz wenig Schub.',
    ],
    stars: ['gelandet', 'höchstens 5 km vom Ahuna Mons', 'höchstens 1 km vom Ahuna Mons'],
    design: ['sonde', 'tank-s', 'beine', 'kolibri'],
    computer: true,
    setup(f) {
      f.site = { body: 'ceres', angle: CERES_BASE, name: 'Ahuna Mons' };
      // Die Bahn läuft im Uhrzeigersinn: der Vulkan liegt gut eine halbe Runde voraus.
      f.placeInOrbit(CERES, 15_000, CERES_BASE + 2.4);
      f.target = 'ceres';
    },
    judge(f) {
      const c = crashed(f);
      if (c) return c;
      if (f.status === 'flying' && f.refBody() !== CERES)
        return {
          success: false,
          stars: 0,
          text: 'Zu viel Schub – die Sonde ist Ceres davongeflogen.',
        };
      if (f.status !== 'landed') return null;
      const d = f.siteInfo()!.distance;
      return {
        success: true,
        ...stars(true, d <= 5_000, d <= 1_000),
        text: `Gelandet ${d < 10_000 ? `${Math.round(d)} m` : km(d)} vom Ahuna Mons.`,
      };
    },
    progress: (f) => {
      const s = f.siteInfo();
      return s
        ? `Abstand zum Ahuna Mons: ${s.distance < 10_000 ? `${Math.round(s.distance)} m` : km(s.distance)}`
        : '';
    },
  },
  {
    id: 'capture',
    group: 'Meister',
    title: 'Vom Jupiter einfangen lassen',
    brief:
      'Die Sonde rast auf den Jupiter zu. Bremse am tiefsten Punkt so, dass der Riesenplanet sie einfängt – mit möglichst wenig Treibstoff.',
    tips: [
      'Gebremst wird am tiefsten Punkt (Pe): Dort wirkt jeder Meter pro Sekunde am stärksten.',
      'Eine lange Ellipse genügt – eine runde Bahn dicht über den Wolken kostet ein Vielfaches.',
      'Gewertet wird, wenn die Bahn geschlossen ist, die Sonde wieder steigt und das Triebwerk aus ist.',
    ],
    stars: [
      'eingefangen, tiefster Punkt über den Wolken',
      'höchstens 1.200 m/s verbraucht',
      'höchster Punkt innerhalb der Ganymed-Bahn',
    ],
    design: ['sonde', 'tank-m', 'kolibri'],
    computer: true,
    setup(f) {
      // 1,5 Mio. km vor dem Jupiter, 4 km/s Überschuss, tiefster Punkt 1.000 km über den Wolken,
      // im Uhrzeigersinn wie die Monde.
      const [jx, jy, jvx, jvy] = bodyState(JUPITER, f.t);
      const r0 = 1.5e9;
      const vinf = 4_000;
      const rp = JUPITER.radius + JUPITER.atmosphere + 1_000_000;
      const h = rp * Math.sqrt(vinf ** 2 + (2 * JUPITER.mu) / rp);
      const v0 = Math.sqrt(vinf ** 2 + (2 * JUPITER.mu) / r0);
      const vt = h / r0;
      const vr = Math.sqrt(v0 ** 2 - vt ** 2);
      const a = 2.4;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      f.status = 'flying';
      f.landedOn = null;
      f.x = jx + r0 * ux;
      f.y = jy + r0 * uy;
      f.vx = jvx - vr * ux + vt * uy;
      f.vy = jvy - vr * uy - vt * ux;
      f.angle = Math.atan2(-(f.vy - jvy), -(f.vx - jvx));
      f.target = 'jupiter';
    },
    judge(f, memo) {
      const c = crashed(f);
      if (c) return c;
      memo.dv0 ??= f.stats.dvUsed;
      const ref = f.refBody();
      if (ref === JUPITER || ref.parent === 'jupiter') memo.inside = 1;
      else if (memo.inside)
        return {
          success: false,
          stars: 0,
          text: 'Nicht eingefangen – die Sonde hat den Einflussbereich des Jupiter wieder verlassen.',
        };
      if (!memo.inside) return null;
      const o = f.orbit(JUPITER);
      const rel = f.relative(JUPITER);
      const rising = rel.rx * rel.vx + rel.ry * rel.vy > 0;
      if (!settled(f, memo, o.bound && o.periapsis > JUPITER.atmosphere && rising)) return null;
      const used = f.stats.dvUsed - memo.dv0;
      return {
        success: true,
        ...stars(true, used <= 1_200, o.apoapsis + JUPITER.radius < GANYMEDE_ORBIT),
        text: `Eingefangen mit ${fmt(used)} m/s: tiefster Punkt ${km(o.periapsis)}, höchster ${km(o.apoapsis)}.`,
      };
    },
    progress: (f) => {
      const o = f.orbit(JUPITER);
      return `Pe ${km(o.periapsis)} · ${o.bound ? `Ap ${km(o.apoapsis)}` : 'noch offen'}`;
    },
  },
];

export function challengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}
