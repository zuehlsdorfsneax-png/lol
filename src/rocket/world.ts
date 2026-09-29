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

export type BodyId =
  'sun' | 'mercury' | 'venus' | 'earth' | 'moon' | 'mars' | 'phobos' | 'jupiter' | 'europa';

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

/** Deutsche Formen der Namen, mit Artikel wo nötig („auf dem Mars“, „zur Erde“, „bei Europa“). */
export interface NameForms {
  /** der Mars */
  nom: string;
  /** des Mars */
  gen: string;
  /** (auf/über) dem Mars */
  dat: string;
  /** (um) den Mars */
  acc: string;
  /** zum Mars */
  to: string;
  /** beim Mars */
  at: string;
}

const FORMS: Record<BodyId, NameForms> = {
  sun: {
    nom: 'die Sonne',
    gen: 'der Sonne',
    dat: 'der Sonne',
    acc: 'die Sonne',
    to: 'zur Sonne',
    at: 'bei der Sonne',
  },
  mercury: {
    nom: 'der Merkur',
    gen: 'des Merkur',
    dat: 'dem Merkur',
    acc: 'den Merkur',
    to: 'zum Merkur',
    at: 'beim Merkur',
  },
  venus: {
    nom: 'die Venus',
    gen: 'der Venus',
    dat: 'der Venus',
    acc: 'die Venus',
    to: 'zur Venus',
    at: 'bei der Venus',
  },
  earth: {
    nom: 'die Erde',
    gen: 'der Erde',
    dat: 'der Erde',
    acc: 'die Erde',
    to: 'zur Erde',
    at: 'bei der Erde',
  },
  moon: {
    nom: 'der Mond',
    gen: 'des Mondes',
    dat: 'dem Mond',
    acc: 'den Mond',
    to: 'zum Mond',
    at: 'beim Mond',
  },
  mars: {
    nom: 'der Mars',
    gen: 'des Mars',
    dat: 'dem Mars',
    acc: 'den Mars',
    to: 'zum Mars',
    at: 'beim Mars',
  },
  phobos: {
    nom: 'Phobos',
    gen: 'des Phobos',
    dat: 'Phobos',
    acc: 'Phobos',
    to: 'zu Phobos',
    at: 'bei Phobos',
  },
  jupiter: {
    nom: 'der Jupiter',
    gen: 'des Jupiter',
    dat: 'dem Jupiter',
    acc: 'den Jupiter',
    to: 'zum Jupiter',
    at: 'beim Jupiter',
  },
  europa: {
    nom: 'Europa',
    gen: 'Europas',
    dat: 'Europa',
    acc: 'Europa',
    to: 'zu Europa',
    at: 'bei Europa',
  },
};

/** Grammatische Formen eines Körpers für Sätze wie „Ankunft 120 km über dem Mars“. */
export function forms(b: { id: BodyId }): NameForms {
  return FORMS[b.id];
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
const JUPITER_R = 69_911_000 * SCALE;
const JUPITER_MU = 24.8 * JUPITER_R ** 2;
/**
 * Bahnwinkel der Erde beim Start: Die Sonne steht dann genau über der Startrampe (Mittag).
 * Alle Planeten sind um denselben Winkel gedreht, ihre Stellung zueinander bleibt gleich.
 */
const NOON = -Math.PI / 2;

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

export const MERCURY = body({
  id: 'mercury',
  name: 'Merkur',
  radius: 2_439_700 * SCALE,
  g: 3.7,
  atmosphere: 0,
  density0: 0,
  scaleHeight: 1,
  solid: true,
  parent: 'sun',
  distance: 0.387 * AU,
  phase0: NOON + 2.1,
  parentMu: SUN_MU,
  info: 'Der sonnennächste Planet: keine Luft, voller Krater, tagsüber über 400 °C heiß.',
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
  phase0: NOON + 1.2,
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
  phase0: NOON,
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
  phase0: NOON + 0.75,
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
  radius: JUPITER_R,
  g: 24.8,
  atmosphere: 400_000,
  density0: 5,
  scaleHeight: 40_000,
  solid: false,
  parent: 'sun',
  distance: 5.203 * AU,
  phase0: NOON + 2.6,
  parentMu: SUN_MU,
  info: 'Riesenplanet aus Gas ohne feste Oberfläche. Ein Vorbeiflug schleudert Raketen weit hinaus.',
});

export const EUROPA = body({
  id: 'europa',
  name: 'Europa',
  radius: 1_560_800 * SCALE,
  g: 1.315,
  atmosphere: 0,
  density0: 0,
  scaleHeight: 1,
  solid: true,
  parent: 'jupiter',
  distance: 671_100_000 * SCALE,
  phase0: 1,
  parentMu: JUPITER_MU,
  info: 'Eismond des Jupiter. Unter seinem Eispanzer liegt ein Ozean aus flüssigem Wasser.',
});

export const BODIES: readonly Body[] = [
  SUN,
  MERCURY,
  VENUS,
  EARTH,
  MOON,
  MARS,
  PHOBOS,
  JUPITER,
  EUROPA,
];
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

// Alle Körper in einem Durchgang: Eltern stehen in BODIES vor ihren Monden, jeder Winkel wird nur
// einmal berechnet (vorher rechnete jeder Körper seine Eltern und die Erde neu). Die Rechenschritte
// sind dieselben wie zuvor – die Ergebnisse stimmen Bit für Bit überein.
const N_BODIES = BODIES.length;
const PARENT = BODIES.map((b) => (b.parent ? BODIES.indexOf(bodyById(b.parent)) : -1));
const DIST = BODIES.map((b) => b.distance);
const RATE = BODIES.map((b) => RATES.get(b.id)!);
const SPEED = BODIES.map((b, i) => RATE[i]! * b.distance);
const PHASE = BODIES.map((b) => b.phase0);
const MU = BODIES.map((b) => b.mu);
const I_EARTH = BODIES.indexOf(EARTH);
const I_MOON = BODIES.indexOf(MOON);
const hx = new Float64Array(N_BODIES);
const hy = new Float64Array(N_BODIES);
const hvx = new Float64Array(N_BODIES);
const hvy = new Float64Array(N_BODIES);

function computeAll(t: number): [number, number, number, number][] {
  for (let i = 0; i < N_BODIES; i++) {
    const p = PARENT[i]!;
    if (p < 0) {
      hx[i] = hy[i] = hvx[i] = hvy[i] = 0;
      continue;
    }
    const a = PHASE[i]! - RATE[i]! * t;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    hx[i] = hx[p]! + DIST[i]! * c;
    hy[i] = hy[p]! + DIST[i]! * sn;
    hvx[i] = hvx[p]! + SPEED[i]! * sn;
    hvy[i] = hvy[p]! - SPEED[i]! * c;
  }
  const out = new Array<[number, number, number, number]>(N_BODIES);
  const ex = hx[I_EARTH]!;
  const ey = hy[I_EARTH]!;
  const evx = hvx[I_EARTH]!;
  const evy = hvy[I_EARTH]!;
  for (let i = 0; i < N_BODIES; i++) {
    if (i === I_EARTH) out[i] = [0, 0, 0, 0];
    else if (i === I_MOON) {
      // Der Mond direkt relativ zur Erde (genauer als die Differenz zweier Sonnenabstände).
      const a = PHASE[i]! - RATE[i]! * t;
      out[i] = [
        DIST[i]! * Math.cos(a),
        DIST[i]! * Math.sin(a),
        SPEED[i]! * Math.sin(a),
        -SPEED[i]! * Math.cos(a),
      ];
    } else out[i] = [hx[i]! - ex, hy[i]! - ey, hvx[i]! - evx, hvy[i]! - evy];
  }
  return out;
}

// Kleiner Zwischenspeicher: Runge-Kutta und Zeichnen fragen dieselben Zeitpunkte mehrfach ab.
const CACHE_SIZE = 8;
const cacheT = new Float64Array(CACHE_SIZE).fill(NaN);
const cacheS: [number, number, number, number][][] = Array.from({ length: CACHE_SIZE }, () => []);
let cacheNext = 0;
const INDEX = new Map(BODIES.map((b, i) => [b, i]));

/**
 * Zustände aller Körper zur Zeit t in der Reihenfolge von BODIES (Erdsystem). Nur lesen – die
 * Liste wird zwischengespeichert und geteilt.
 */
export function bodyStates(t: number): readonly (readonly [number, number, number, number])[] {
  return statesAt(t);
}

function statesAt(t: number): [number, number, number, number][] {
  for (let i = 0; i < CACHE_SIZE; i++) if (cacheT[i] === t) return cacheS[i]!;
  const slot = cacheNext;
  cacheNext = (cacheNext + 1) % CACHE_SIZE;
  cacheT[slot] = t;
  cacheS[slot] = computeAll(t);
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
  // Direkt über die Zustandsliste (ohne Zwischen-Arrays): wird pro Runge-Kutta-Schritt viermal
  // gerufen und ist die innerste Schleife von Flug, Vorhersage und Planung.
  const st = statesAt(t);
  for (let i = 0; i < N_BODIES; i++) {
    if (i === I_EARTH) continue;
    const s = st[i]!;
    const bx = s[0];
    const by = s[1];
    const mu = MU[i]!;
    const dx = x - bx;
    const dy = y - by;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    const b2 = bx * bx + by * by;
    const bd = Math.sqrt(b2);
    ax += (-mu * dx) / (d2 * d) - (mu * bx) / (b2 * bd);
    ay += (-mu * dy) / (d2 * d) - (mu * by) / (b2 * bd);
  }
  return [ax, ay];
}

/**
 * Der Körper, dessen Einflussbereich (Hill-Sphäre) den Punkt enthält – der kleinste zuerst,
 * sonst die Sonne.
 */
export function dominantBody(x: number, y: number, t: number): Body {
  let best: Body = SUN;
  const st = statesAt(t);
  for (let i = 0; i < N_BODIES; i++) {
    const b = BODIES[i]!;
    if (b === SUN) continue;
    const s = st[i]!;
    if (Math.hypot(x - s[0], y - s[1]) < b.hill && b.hill < best.hill) best = b;
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
