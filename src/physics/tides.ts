import { EARTH, G, MOON } from './constants';

/**
 * Gezeitenentwicklung des Erde–Mond-Systems über die Drehimpulserhaltung:
 * L = I_Erde·ω_Erde + μ'·√(G·M·a) bleibt konstant, während Gezeitenreibung Drehimpuls von der
 * Erdrotation auf die Mondbahn überträgt (Kreisbahn, Sonne vernachlässigt).
 */
export const EARTH_MOMENT_OF_INERTIA = 0.3307 * EARTH.mass * EARTH.radius ** 2;
const SIDEREAL_DAY = 86_164.1;
const M = EARTH.mass + MOON.mass;
const REDUCED = (EARTH.mass * MOON.mass) / M;

function orbitalMomentum(a: number): number {
  return REDUCED * Math.sqrt(G * M * a);
}

/** Heutiger Gesamtdrehimpuls (Erdrotation + Mondbahn). */
export const TOTAL_MOMENTUM =
  EARTH_MOMENT_OF_INERTIA * ((2 * Math.PI) / SIDEREAL_DAY) + orbitalMomentum(MOON.semiMajorAxis);

/** Länge eines (siderischen) Erdtages in s, wenn der Mond im Abstand a kreist. */
export function dayLength(a: number): number {
  const spin = (TOTAL_MOMENTUM - orbitalMomentum(a)) / EARTH_MOMENT_OF_INERTIA;
  return spin > 0 ? (2 * Math.PI) / spin : Infinity;
}

/** Siderischer Monat in s beim Abstand a (drittes Keplersches Gesetz). */
export function monthLength(a: number): number {
  return 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));
}

/** Endzustand: Tag = Monat (gebundene Rotation beider Körper). */
export function synchronousDistance(): number {
  let lo: number = MOON.semiMajorAxis;
  let hi = 2 * MOON.semiMajorAxis;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (dayLength(mid) < monthLength(mid)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
