/**
 * Die Spielwelt des Raketenspiels: Erde und Mond in verkleinertem Maßstab (wie in vielen
 * Raumfahrtspielen), aber mit echter Schwerkraft. Oberflächenschwerkraft und Massenverhältnis
 * Mond/Erde entsprechen der Wirklichkeit; Radien und Abstand sind etwa um den Faktor 10 kleiner,
 * damit ein Flug zum Mond nicht Tage dauert.
 *
 * Koordinaten: Meter, Sekunden, Ursprung im Erdmittelpunkt, y zeigt „nach oben“.
 */

export const G0 = 9.81;

export interface Body {
  name: string;
  radius: number;
  /** G·M in m³/s². */
  mu: number;
  /** Höhe der Atmosphäre (0 = keine). */
  atmosphere: number;
}

export const EARTH: Body = {
  name: 'Erde',
  radius: 600_000,
  mu: G0 * 600_000 ** 2,
  atmosphere: 40_000,
};

export const MOON: Body = {
  name: 'Mond',
  radius: 163_600,
  mu: 1.62 * 163_600 ** 2,
  atmosphere: 0,
};

/** Abstand Erde–Mond: wie in Wirklichkeit 60 Erdradien. */
export const MOON_DISTANCE = 60 * EARTH.radius;
/** Winkelgeschwindigkeit des Mondes auf seiner Kreisbahn. */
export const MOON_RATE = Math.sqrt((EARTH.mu + MOON.mu) / MOON_DISTANCE ** 3);
export const MOON_PERIOD = (2 * Math.PI) / MOON_RATE;
export const MOON_SPEED = MOON_RATE * MOON_DISTANCE;
/** Hill-Radius des Mondes im Schwerefeld der Erde – Grenze seines Einflussbereichs. */
export const MOON_HILL = MOON_DISTANCE * Math.cbrt(MOON.mu / (3 * EARTH.mu));
/** Startwinkel des Mondes (von der Startrampe aus gesehen links oben). */
export const MOON_PHASE0 = (130 * Math.PI) / 180;

/**
 * Der Mond läuft im Uhrzeigersinn um – in dieselbe Richtung, in die eine Rakete fliegt, die sich
 * nach dem Start nach rechts neigt. So kreisen Rakete und Mond gleichsinnig (prograd).
 */
export function moonAngle(t: number): number {
  return MOON_PHASE0 - MOON_RATE * t;
}

export function moonPosition(t: number): [number, number] {
  const a = moonAngle(t);
  return [MOON_DISTANCE * Math.cos(a), MOON_DISTANCE * Math.sin(a)];
}

export function moonVelocity(t: number): [number, number] {
  const a = moonAngle(t);
  return [MOON_SPEED * Math.sin(a), -MOON_SPEED * Math.cos(a)];
}

/** Luftdichte in kg/m³ (Skalenhöhe 7 km). */
export function airDensity(altitude: number): number {
  if (altitude >= EARTH.atmosphere) return 0;
  return 1.2 * Math.exp(-Math.max(0, altitude) / 7000);
}

/**
 * Beschleunigung durch Erde und Mond im Bezugssystem der (festgehaltenen) Erde. Weil die Erde
 * selbst vom Mond angezogen wird, kommt ein indirekter Term hinzu – so bleibt die Rechnung ein
 * echtes Drei-Körper-Problem.
 */
export function gravity(x: number, y: number, t: number): [number, number] {
  const r2 = x * x + y * y;
  const r = Math.sqrt(r2);
  let ax = (-EARTH.mu * x) / (r2 * r);
  let ay = (-EARTH.mu * y) / (r2 * r);
  const [mx, my] = moonPosition(t);
  const dx = x - mx;
  const dy = y - my;
  const d2 = dx * dx + dy * dy;
  const d = Math.sqrt(d2);
  const m3 = MOON_DISTANCE ** 3;
  ax += (-MOON.mu * dx) / (d2 * d) - (MOON.mu * mx) / m3;
  ay += (-MOON.mu * dy) / (d2 * d) - (MOON.mu * my) / m3;
  return [ax, ay];
}

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
export function orbitAround(body: Body, rx: number, ry: number, vx: number, vy: number): Orbit {
  const r = Math.hypot(rx, ry);
  const v = Math.hypot(vx, vy);
  const energy = (v * v) / 2 - body.mu / r;
  const h = rx * vy - ry * vx;
  const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / body.mu ** 2));
  const bound = energy < 0;
  const a = bound ? -body.mu / (2 * energy) : Infinity;
  const p = (h * h) / body.mu;
  const rp = p / (1 + e);
  return {
    body,
    r,
    v,
    bound,
    periapsis: rp - body.radius,
    apoapsis: bound ? a * (1 + Math.min(e, 1)) - body.radius : Infinity,
    eccentricity: e,
    period: bound ? 2 * Math.PI * Math.sqrt(a ** 3 / body.mu) : Infinity,
  };
}

/** Liegt der Punkt im Einflussbereich (Hill-Sphäre) des Mondes? */
export function inMoonSphere(x: number, y: number, t: number): boolean {
  const [mx, my] = moonPosition(t);
  return Math.hypot(x - mx, y - my) < MOON_HILL;
}

/** Kreisbahngeschwindigkeit in der Höhe h. */
export function circularSpeed(body: Body, h: number): number {
  return Math.sqrt(body.mu / (body.radius + h));
}
