import type { Flight } from './flight';
import {
  EARTH,
  EUROPA,
  JUPITER,
  MARS,
  MERCURY,
  MOON,
  PHOBOS,
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
  | 'station'
  | 'mond'
  | 'mondorbit'
  | 'mars'
  | 'marsorbit'
  | 'phobos'
  | 'venusorbit'
  | 'merkur'
  | 'europa'
  | 'jupiterorbit';

export interface StartOption {
  id: StartId;
  label: string;
  /** Gruppe in der Auswahl. */
  group: 'Erde' | 'Mond' | 'Planeten';
  place: (f: Flight) => void;
}

/** Kreisbahn knapp über der Lufthülle (mindestens 30 km). */
function orbit(body: Body, min = 30_000): (f: Flight) => void {
  return (f) => f.placeInOrbit(body, Math.max(min, body.atmosphere * 1.3), Math.PI / 2);
}

function landed(body: Body): (f: Flight) => void {
  return (f) => f.placeLanded(body, Math.PI / 2);
}

export const START_OPTIONS: readonly StartOption[] = [
  { id: 'rampe', label: 'Startrampe', group: 'Erde', place: () => undefined },
  { id: 'orbit', label: 'Erdumlaufbahn (150 km)', group: 'Erde', place: orbit(EARTH, 150_000) },
  {
    id: 'station',
    label: 'Neben der Raumstation',
    group: 'Erde',
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
  },
  { id: 'mond', label: 'Auf dem Mond', group: 'Mond', place: landed(MOON) },
  { id: 'mondorbit', label: 'Mondumlaufbahn', group: 'Mond', place: orbit(MOON) },
  { id: 'mars', label: 'Auf dem Mars', group: 'Planeten', place: landed(MARS) },
  { id: 'marsorbit', label: 'Marsumlaufbahn', group: 'Planeten', place: orbit(MARS) },
  { id: 'phobos', label: 'Auf Phobos', group: 'Planeten', place: landed(PHOBOS) },
  { id: 'venusorbit', label: 'Venusumlaufbahn', group: 'Planeten', place: orbit(VENUS) },
  { id: 'merkur', label: 'Auf Merkur', group: 'Planeten', place: landed(MERCURY) },
  { id: 'europa', label: 'Auf Europa', group: 'Planeten', place: landed(EUROPA) },
  { id: 'jupiterorbit', label: 'Jupiterumlaufbahn', group: 'Planeten', place: orbit(JUPITER) },
];

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
