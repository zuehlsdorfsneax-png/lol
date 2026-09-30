import type { Flight } from './flight';
import type { BuildRules } from './parts';
import {
  EARTH,
  CERES,
  EUROPA,
  GANYMEDE,
  JUPITER,
  MARS,
  MERCURY,
  MOON,
  PHOBOS,
  SUN,
  VENUS,
  stationState,
  type Body,
} from './world';

/** Einstellungen des Sandkastens (werden gespeichert). */
export interface SandboxSettings {
  /** Wo der Flug beginnt. */
  start: StartId;
  /** Treibstoff wird nicht verbraucht. */
  fuel: boolean;
  /** Keine Abstürze, kein Verglühen: jede Berührung ist eine Landung. */
  indestructible: boolean;
  /** Hitze beim Wiedereintritt. */
  heat: boolean;
  /** Luftwiderstand der Rakete (Fallschirme wirken immer). */
  drag: boolean;
  /** Schub aller Triebwerke mal diesem Faktor (Verbrauch wächst mit). */
  thrust: number;
}

export const DEFAULT_SANDBOX: SandboxSettings = {
  start: 'rampe',
  fuel: true,
  indestructible: false,
  heat: true,
  drag: true,
  thrust: 1,
};

export const THRUST_FACTORS = [1, 2, 5, 10] as const;

export type StartId =
  | 'rampe'
  | 'orbit'
  | 'hoch'
  | 'station'
  | 'mond'
  | 'mondorbit'
  | 'merkur'
  | 'merkurorbit'
  | 'venus'
  | 'venusorbit'
  | 'mars'
  | 'marsorbit'
  | 'phobos'
  | 'ceres'
  | 'ceresorbit'
  | 'jupiterorbit'
  | 'europa'
  | 'europaorbit'
  | 'ganymed'
  | 'ganymedorbit'
  | 'sonne';

/** Gruppen der Startorte in der Auswahl (in dieser Reihenfolge). */
export const START_GROUPS = [
  'Erde',
  'Mond',
  'Merkur und Venus',
  'Mars',
  'Asteroidengürtel',
  'Jupiter',
  'Sonne',
] as const;

export interface StartOption {
  id: StartId;
  label: string;
  /** Gruppe in der Auswahl. */
  group: (typeof START_GROUPS)[number];
  /** Körper am Startort (für die Werte in der Werft). */
  body: Body;
  place: (f: Flight) => void;
  /** Start in einer Umlaufbahn (nicht auf dem Boden). */
  orbital?: boolean;
}

/**
 * Höhe einer Start-Umlaufbahn: über der Lufthülle, sonst niedrig über dem Boden (bei kleinen
 * Körpern entsprechend tiefer, damit die Bahn sicher im Einflussbereich bleibt).
 */
function orbitAltitude(body: Body): number {
  if (body.atmosphere > 0) return Math.max(30_000, body.atmosphere * 1.3);
  return Math.min(30_000, Math.max(5_000, body.radius * 0.15));
}

function orbit(body: Body, altitude = orbitAltitude(body)): (f: Flight) => void {
  return (f) => f.placeInOrbit(body, altitude, Math.PI / 2);
}

function landed(body: Body): (f: Flight) => void {
  return (f) => f.placeLanded(body, Math.PI / 2);
}

export const START_OPTIONS: readonly StartOption[] = [
  { id: 'rampe', label: 'Startrampe', group: 'Erde', body: EARTH, place: () => undefined },
  {
    id: 'orbit',
    label: 'Erdumlaufbahn (150 km)',
    group: 'Erde',
    body: EARTH,
    place: orbit(EARTH, 150_000),
    orbital: true,
  },
  {
    id: 'hoch',
    label: 'Hohe Erdbahn (5.000 km)',
    group: 'Erde',
    body: EARTH,
    place: orbit(EARTH, 5_000_000),
    orbital: true,
  },
  {
    id: 'station',
    label: 'Neben der Raumstation',
    group: 'Erde',
    body: EARTH,
    place(f) {
      // 300 m hinter der Station auf ihrer eigenen Bahn: bleibt dicht dran.
      const [x, y, vx, vy] = stationState(f.t);
      const v = Math.hypot(vx, vy);
      f.placeInOrbit(EARTH, 100_000, Math.PI / 2);
      f.x = x - (vx / v) * 300;
      f.y = y - (vy / v) * 300;
      f.vx = vx;
      f.vy = vy;
      f.angle = Math.atan2(vy, vx);
      f.target = 'station';
      f.rcs = true;
    },
    orbital: true,
  },
  { id: 'mond', label: 'Auf dem Mond', group: 'Mond', body: MOON, place: landed(MOON) },
  {
    id: 'mondorbit',
    label: 'Mondumlaufbahn',
    group: 'Mond',
    body: MOON,
    place: orbit(MOON),
    orbital: true,
  },
  {
    id: 'merkur',
    label: 'Auf dem Merkur',
    group: 'Merkur und Venus',
    body: MERCURY,
    place: landed(MERCURY),
  },
  {
    id: 'merkurorbit',
    label: 'Merkurumlaufbahn',
    group: 'Merkur und Venus',
    body: MERCURY,
    place: orbit(MERCURY),
    orbital: true,
  },
  {
    id: 'venus',
    label: 'Auf der Venus',
    group: 'Merkur und Venus',
    body: VENUS,
    place: landed(VENUS),
  },
  {
    id: 'venusorbit',
    label: 'Venusumlaufbahn',
    group: 'Merkur und Venus',
    body: VENUS,
    place: orbit(VENUS),
    orbital: true,
  },
  { id: 'mars', label: 'Auf dem Mars', group: 'Mars', body: MARS, place: landed(MARS) },
  {
    id: 'marsorbit',
    label: 'Marsumlaufbahn',
    group: 'Mars',
    body: MARS,
    place: orbit(MARS),
    orbital: true,
  },
  { id: 'phobos', label: 'Auf Phobos', group: 'Mars', body: PHOBOS, place: landed(PHOBOS) },
  { id: 'ceres', label: 'Auf Ceres', group: 'Asteroidengürtel', body: CERES, place: landed(CERES) },
  {
    id: 'ceresorbit',
    label: 'Ceres-Umlaufbahn',
    group: 'Asteroidengürtel',
    body: CERES,
    place: orbit(CERES),
    orbital: true,
  },
  {
    id: 'jupiterorbit',
    label: 'Jupiterumlaufbahn',
    group: 'Jupiter',
    body: JUPITER,
    place: orbit(JUPITER),
    orbital: true,
  },
  { id: 'europa', label: 'Auf Europa', group: 'Jupiter', body: EUROPA, place: landed(EUROPA) },
  {
    id: 'europaorbit',
    label: 'Europa-Umlaufbahn',
    group: 'Jupiter',
    body: EUROPA,
    place: orbit(EUROPA),
    orbital: true,
  },
  {
    id: 'ganymed',
    label: 'Auf Ganymed',
    group: 'Jupiter',
    body: GANYMEDE,
    place: landed(GANYMEDE),
  },
  {
    id: 'ganymedorbit',
    label: 'Ganymed-Umlaufbahn',
    group: 'Jupiter',
    body: GANYMEDE,
    place: orbit(GANYMEDE),
    orbital: true,
  },
  {
    id: 'sonne',
    label: 'Sonnenumlaufbahn (bei der Venus)',
    group: 'Sonne',
    body: SUN,
    place: orbit(SUN, VENUS.distance * 0.97 - SUN.radius),
    orbital: true,
  },
];

/** Werte der Werft passend zu den Sandkasten-Einstellungen. */
export function buildRules(s: SandboxSettings): BuildRules {
  const o = startOption(s.start);
  // Für die Sonnenbahn gelten die Werte der Erde (auf der Sonne landet niemand).
  return {
    thrust: s.thrust,
    infiniteFuel: s.fuel,
    body: o.body === SUN ? EARTH : o.body,
    orbital: o.orbital ?? false,
  };
}

export function startOption(id: StartId): StartOption {
  return START_OPTIONS.find((s) => s.id === id) ?? START_OPTIONS[0]!;
}

/** Gespeicherte Einstellungen prüfen; Unbekanntes fällt auf die Voreinstellung zurück. */
export function readSandbox(raw: unknown): SandboxSettings {
  const q = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<SandboxSettings>;
  const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
  return {
    start: START_OPTIONS.some((s) => s.id === q.start) ? q.start! : DEFAULT_SANDBOX.start,
    fuel: bool(q.fuel, DEFAULT_SANDBOX.fuel),
    indestructible: bool(q.indestructible, DEFAULT_SANDBOX.indestructible),
    heat: bool(q.heat, DEFAULT_SANDBOX.heat),
    drag: bool(q.drag, DEFAULT_SANDBOX.drag),
    thrust: (THRUST_FACTORS as readonly number[]).includes(q.thrust as number)
      ? (q.thrust as number)
      : DEFAULT_SANDBOX.thrust,
  };
}

/** Physik-Schalter übernehmen (auch nach dem Laden eines Spielstands). */
export function applyRules(f: Flight, s: SandboxSettings): void {
  f.sandbox = true;
  f.infiniteFuel = s.fuel;
  f.indestructible = s.indestructible;
  f.heatOn = s.heat;
  f.dragOn = s.drag;
  f.thrustScale = s.thrust;
}

/** Neuer Sandkasten-Flug: Regeln und Startort. */
export function applySandbox(f: Flight, s: SandboxSettings): void {
  applyRules(f, s);
  startOption(s.start).place(f);
}
