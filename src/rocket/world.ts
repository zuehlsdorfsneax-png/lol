/**
 * Die Spielwelt des Raketenspiels: ein verkleinertes Sonnensystem mit echter Schwerkraft.
 * Alle Radien und Abstände sind mit demselben Faktor (≈ 1 : 10,6) verkleinert; Schwerkraft an
 * der Oberfläche und damit alle Massenverhältnisse entsprechen der Wirklichkeit. Deshalb gilt
 * auch hier: Der Mond kreist bei etwa einem Viertel des Hill-Radius der Erde (Kapitel 5).
 *
 * Koordinaten: Meter, Sekunden, Ursprung im Erdmittelpunkt, y zeigt „nach oben“. Die Erde läuft
 * auf ihrer Bahn um die Sonne; ihre Beschleunigung steckt als indirekter Term in `gravity`.
 * Alle Körper laufen im Uhrzeigersinn – wie eine Rakete, die sich nach dem Start nach rechts neigt.
 */

export const G0 = 9.81;
/** Maßstab der Spielwelt gegenüber der Wirklichkeit. */
export const SCALE = 600_000 / 6_371_000;
const AU = 1.496e11 * SCALE;

export type BodyId = 'sun' | 'venus' | 'earth' | 'moon' | 'mars' | 'phobos' | 'jupiter';

export interface Body {
  id: BodyId;
  name: string;
  radius: number;
  /** G·M in m³/s². */
  mu: number;
  /** Höhe der Atmosphäre (0 = keine), Dichte am Boden und Skalenhöhe. */
  atmosphere: number;
  density0: number;
  scaleHeight: number;
  /** Kann man hier landen? (Sonne und Jupiter haben keine feste Oberfläche.) */
  solid: boolean;
  /** Um welchen Körper er kreist, mit Bahnradius und Startwinkel. */
  parent: BodyId | null;
  distance: number;
  phase0: number;
  /** Hill-Radius: Grenze des Einflussbereichs (Sonne: unendlich). */
  hill: number;
  /** Schwerkraft an der Oberfläche in m/s². */
  g: number;
  info: string;
}

function body(b: Omit<Body, 'mu' | 'hill'> & { parentMu?: number }): Body {
  const mu = b.g * b.radius ** 2;
  const hill = b.parentMu ? b.distance * Math.cbrt(mu / (3 * b.parentMu)) : Infinity;
  const rest: Omit<Body, 'mu' | 'hill'> & { parentMu?: number } = { ...b };
  delete rest.parentMu;
  return { ...rest, mu, hill };
}

const SUN_MU = 274 * (696_000_000 * SCALE) ** 2;
const EARTH_R = 600_000;
const MARS_R = 3_390_000 * SCALE;
const MARS_MU = 3.72 * MARS_R ** 2;

export const SUN = body({
  id: 'sun',
  name: 'Sonne',
  radius: 696_000_000 * SCALE,
  g: 274,
  atmosphere: 0,
  density0: 0,
  scaleHeight: 1,
  solid: false,
  parent: null,
  distance: 0,
  phase0: 0,
  info: 'Ein Stern – über 300.000-mal so schwer wie die Erde. Wer ihr zu nahe kommt, verglüht.',
});

export const VENUS = body({
  id: 'venus',
  name: 'Venus',
  radius: 6_052_000 * SCALE,
  g: 8.87,
  atmosphere: 60_000,
  density0: 30,
  scaleHeight: 9_000,
  solid: true,
  parent: 'sun',
  distance: 0.723 * AU,
  phase0: 1.2,
  parentMu: SUN_MU,
  info: 'Dichte, heiße Atmosphäre – Fallschirme wirken hier sehr stark.',
});

export const EARTH = body({
  id: 'earth',
  name: 'Erde',
  radius: EARTH_R,
  g: G0,
  atmosphere: 40_000,
  density0: 1.2,
  scaleHeight: 7_000,
  solid: true,
  parent: 'sun',
  distance: AU,
  phase0: 0,
  parentMu: SUN_MU,
  info: 'Unser Heimatplanet mit der Startrampe.',
});

export const MOON = body({
  id: 'moon',
  name: 'Mond',
  radius: 163_600,
  g: 1.62,
  atmosphere: 0,
  density0: 0,
  scaleHeight: 1,
  solid: true,
  parent: 'earth',
  /** Wie in Wirklichkeit 60 Erdradien. */
  distance: 60 * EARTH_R,
  phase0: (130 * Math.PI) / 180,
  parentMu: G0 * EARTH_R ** 2,
  info: 'Keine Luft, geringe Schwerkraft – ideal für die erste Landung.',
});

export const MARS = body({
  id: 'mars',
  name: 'Mars',
  radius: MARS_R,
  g: 3.72,
  atmosphere: 30_000,
  density0: 0.02,
  scaleHeight: 8_000,
  solid: true,
  parent: 'sun',
  distance: 1.524 * AU,
  phase0: 0.75,
  parentMu: SUN_MU,
  info: 'Dünne Luft: Der Fallschirm bremst nur bis etwa 30 m/s, den Rest muss das Triebwerk erledigen.',
});

export const PHOBOS = body({
  id: 'phobos',
  name: 'Phobos',
  radius: 3_000,
  g: 0.02,
  atmosphere: 0,
  density0: 0,
  scaleHeight: 1,
  solid: true,
  parent: 'mars',
  distance: 2.76 * MARS_R,
  phase0: 2,
  parentMu: MARS_MU,
  info: 'Winziger Marsmond (im Spiel vergrößert) – fast keine Schwerkraft.',
});

export const JUPITER = body({
  id: 'jupiter',
  name: 'Jupiter',
  radius: 69_911_000 * SCALE,
  g: 24.8,
  atmosphere: 400_000,
  density0: 5,
  scaleHeight: 40_000,
  solid: false,
  parent: 'sun',
  distance: 5.203 * AU,
  phase0: 2.6,
  parentMu: SUN_MU,
  info: 'Riesenplanet aus Gas ohne feste Oberfläche. Ein Vorbeiflug schleudert Raketen weit hinaus.',
});

export const BODIES: readonly Body[] = [SUN, VENUS, EARTH, MOON, MARS, PHOBOS, JUPITER];
const BY_ID = new Map(BODIES.map((b) => [b.id, b]));

export function bodyById(id: BodyId): Body {
  return BY_ID.get(id)!;
}

/** Winkelgeschwindigkeit eines Körpers auf seiner Kreisbahn (negativ = Uhrzeigersinn). */
function rate(b: Body): number {
  if (!b.parent) return 0;
  const p = bodyById(b.parent);
  return Math.sqrt((p.mu + b.mu) / b.distance ** 3);
}

const RATES = new Map(BODIES.map((b) => [b.id, rate(b)]));

/** Bahnwinkel um den Mutterkörper. */
export function orbitAngle(b: Body, t: number): number {
  return b.phase0 - RATES.get(b.id)! * t;
}

/** Ort und Geschwindigkeit relativ zur Sonne. */
function helio(b: Body, t: number): [number, number, number, number] {
  if (!b.parent) return [0, 0, 0, 0];
  const [px, py, pvx, pvy] = helio(bodyById(b.parent), t);
  const a = orbitAngle(b, t);
  const w = RATES.get(b.id)! * b.distance;
  return [
    px + b.distance * Math.cos(a),
    py + b.distance * Math.sin(a),
    pvx + w * Math.sin(a),
    pvy - w * Math.cos(a),
  ];
}

function computeState(b: Body, t: number): [number, number, number, number] {
  if (b === EARTH) return [0, 0, 0, 0];
  if (b === MOON) {
    const a = orbitAngle(MOON, t);
    const w = RATES.get('moon')! * MOON.distance;
    return [
      MOON.distance * Math.cos(a),
      MOON.distance * Math.sin(a),
      w * Math.sin(a),
      -w * Math.cos(a),
    ];
  }
  const [x, y, vx, vy] = helio(b, t);
  const [ex, ey, evx, evy] = helio(EARTH, t);
  return [x - ex, y - ey, vx - evx, vy - evy];
}

// Kleiner Zwischenspeicher: Runge-Kutta fragt dieselben Zeitpunkte mehrfach ab.
const CACHE_SIZE = 6;
const cacheT = new Float64Array(CACHE_SIZE).fill(NaN);
const cacheS: [number, number, number, number][][] = Array.from({ length: CACHE_SIZE }, () => []);
let cacheNext = 0;
const INDEX = new Map(BODIES.map((b, i) => [b, i]));

function statesAt(t: number): [number, number, number, number][] {
  for (let i = 0; i < CACHE_SIZE; i++) if (cacheT[i] === t) return cacheS[i]!;
  const slot = cacheNext;
  cacheNext = (cacheNext + 1) % CACHE_SIZE;
  cacheT[slot] = t;
  cacheS[slot] = BODIES.map((b) => computeState(b, t));
  return cacheS[slot];
}

/** Ort und Geschwindigkeit eines Körpers im Bezugssystem der Erde. */
export function bodyState(b: Body, t: number): [number, number, number, number] {
  return statesAt(t)[INDEX.get(b)!]!;
}

export function bodyPosition(b: Body, t: number): [number, number] {
  const [x, y] = bodyState(b, t);
  return [x, y];
}

/** Umlaufzeit eines Körpers um seinen Mutterkörper. */
export function orbitalPeriod(b: Body): number {
  const r = RATES.get(b.id)!;
  return r > 0 ? (2 * Math.PI) / r : Infinity;
}

// ------------------------------------------------------------------ Mond (Kurzformen)

export const MOON_DISTANCE = MOON.distance;
export const MOON_RATE = RATES.get('moon')!;
export const MOON_PERIOD = (2 * Math.PI) / MOON_RATE;
export const MOON_SPEED = MOON_RATE * MOON_DISTANCE;
/** Hill-Radius des Mondes im Schwerefeld der Erde – Grenze seines Einflussbereichs. */
export const MOON_HILL = MOON.hill;
export const MOON_PHASE0 = MOON.phase0;

export function moonAngle(t: number): number {
  return orbitAngle(MOON, t);
}

export function moonPosition(t: number): [number, number] {
  return bodyPosition(MOON, t);
}

export function moonVelocity(t: number): [number, number] {
  const [, , vx, vy] = bodyState(MOON, t);
  return [vx, vy];
}

// ------------------------------------------------------------------ Luft

/** Luftdichte in kg/m³ über einem Körper. */
export function densityAt(b: Body, altitude: number): number {
  if (altitude >= b.atmosphere || b.density0 === 0) return 0;
  return b.density0 * Math.exp(-Math.max(0, altitude) / b.scaleHeight);
}

/** Luftdichte der Erde (Skalenhöhe 7 km). */
export function airDensity(altitude: number): number {
  return densityAt(EARTH, altitude);
}

// ------------------------------------------------------------------ Schwerkraft

/**
 * Beschleunigung durch alle Körper im Bezugssystem der Erde. Weil die Erde selbst von Sonne,
 * Mond und Planeten angezogen wird, kommt für jeden Körper ein indirekter Term hinzu – so bleibt
 * die Rechnung ein echtes Mehrkörperproblem.
 */
export function gravity(x: number, y: number, t: number): [number, number] {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2);
  let ax = (-EARTH.mu * x) / (r2 * r);
  let ay = (-EARTH.mu * y) / (r2 * r);
  for (const b of BODIES) {
    if (b === EARTH) continue;
    const [bx, by] = bodyPosition(b, t);
    const dx = x - bx;
    const dy = y - by;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    const b2 = bx * bx + by * by;
    const bd = Math.sqrt(b2);
    ax += (-b.mu * dx) / (d2 * d) - (b.mu * bx) / (b2 * bd);
    ay += (-b.mu * dy) / (d2 * d) - (b.mu * by) / (b2 * bd);
  }
  return [ax, ay];
}

/**
 * Der Körper, dessen Einflussbereich (Hill-Sphäre) den Punkt enthält – der kleinste zuerst,
 * sonst die Sonne.
 */
export function dominantBody(x: number, y: number, t: number): Body {
  let best: Body = SUN;
  for (const b of BODIES) {
    if (b === SUN) continue;
    const [bx, by] = bodyPosition(b, t);
    if (Math.hypot(x - bx, y - by) < b.hill && b.hill < best.hill) best = b;
  }
  return best;
}

// ------------------------------------------------------------------ Bahnen

export interface Orbit {
  /** Bezugskörper. */
  body: Body;
  /** Abstand zum Mittelpunkt, Geschwindigkeit relativ zum Körper. */
  r: number;
  v: number;
  bound: boolean;
  /** Höhe über der Oberfläche von Periapsis und Apoapsis (Apoapsis = ∞ ohne Bindung). */
  periapsis: number;
  apoapsis: number;
  eccentricity: number;
  /** Umlaufzeit (∞ ohne Bindung). */
  period: number;
}

/** Bahnelemente relativ zu einem Körper (Zwei-Körper-Näherung, für die Anzeige). */
export function orbitAround(b: Body, rx: number, ry: number, vx: number, vy: number): Orbit {
  const r = Math.hypot(rx, ry);
  const v = Math.hypot(vx, vy);
  const energy = (v * v) / 2 - b.mu / r;
  const h = rx * vy - ry * vx;
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / b.mu ** 2));
  const bound = energy < 0;
  const a = bound ? -b.mu / (2 * energy) : Infinity;
  const p = (h * h) / b.mu;
  const rp = p / (1 + e);
  return {
    body: b,
    r,
    v,
    bound,
    periapsis: rp - b.radius,
    apoapsis: bound ? a * (1 + Math.min(e, 1)) - b.radius : Infinity,
    eccentricity: e,
    period: bound ? 2 * Math.PI * Math.sqrt(a ** 3 / b.mu) : Infinity,
  };
}

/** Liegt der Punkt im Einflussbereich (Hill-Sphäre) des Mondes? */
export function inMoonSphere(x: number, y: number, t: number): boolean {
  const [mx, my] = moonPosition(t);
  return Math.hypot(x - mx, y - my) < MOON_HILL;
}

/** Kreisbahngeschwindigkeit in der Höhe h. */
export function circularSpeed(b: Body, h: number): number {
  return Math.sqrt(b.mu / (b.radius + h));
}

/**
 * Hohmann-Startfenster zu einem Körper mit demselben Mutterkörper: der Winkel, um den das Ziel
 * beim Start vorauseilen muss, und die Flugdauer.
 */
export function transferWindow(from: Body, to: Body): { lead: number; duration: number } {
  const parent = bodyById(from.parent!);
  const at = (from.distance + to.distance) / 2;
  const duration = Math.PI * Math.sqrt(at ** 3 / parent.mu);
  return { lead: Math.PI - RATES.get(to.id)! * duration, duration };
}

/**
 * Nötige Überschussgeschwindigkeit v∞ beim Verlassen von `from` für einen Hohmann-Transfer zu
 * `to` (positiv = in Flugrichtung des Planeten, negativ = dagegen).
 */
export function requiredExcess(from: Body, to: Body): number {
  const parent = bodyById(from.parent!);
  const v = Math.sqrt(parent.mu / from.distance);
  return v * (Math.sqrt((2 * to.distance) / (from.distance + to.distance)) - 1);
}

/** Überschussgeschwindigkeit relativ zu einem Körper (0, solange die Bahn gebunden ist). */
export function excessSpeed(b: Body, rx: number, ry: number, vx: number, vy: number): number {
  const e = (vx * vx + vy * vy) / 2 - b.mu / Math.hypot(rx, ry);
  return e > 0 ? Math.sqrt(2 * e) : 0;
}

/** Aktueller Winkelvorsprung von `to` vor `from` (in Flugrichtung, 0 … 2π). */
export function phaseLead(from: Body, to: Body, t: number): number {
  const d = orbitAngle(from, t) - orbitAngle(to, t);
  return ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

export function angularRate(b: Body): number {
  return RATES.get(b.id)!;
}

// ------------------------------------------------------------------ Raumstation

/** Die Raumstation „Kepler“ kreist in 150 km Höhe um die Erde. */
export const STATION = {
  name: 'Raumstation Kepler',
  altitude: 150_000,
  radius: EARTH_R + 150_000,
  rate: Math.sqrt((G0 * EARTH_R ** 2) / (EARTH_R + 150_000) ** 3),
  phase0: (60 * Math.PI) / 180,
  /** Andockstutzen: Abstand vom Mittelpunkt entlang der Flugrichtung (m). */
  port: 18,
};

export function stationState(t: number): [number, number, number, number] {
  const a = STATION.phase0 - STATION.rate * t;
  const w = STATION.rate * STATION.radius;
  return [
    STATION.radius * Math.cos(a),
    STATION.radius * Math.sin(a),
    w * Math.sin(a),
    -w * Math.cos(a),
  ];
}

/** Weltposition des Andockstutzens (vorn an der Station, in Flugrichtung). */
export function stationPort(t: number): [number, number] {
  const [x, y, vx, vy] = stationState(t);
  const v = Math.hypot(vx, vy);
  return [x + (vx / v) * STATION.port, y + (vy / v) * STATION.port];
}
