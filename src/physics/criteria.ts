/**
 * Stabilitätskriterien für Monde (Satelliten) im Drei-Körper-System.
 */

/**
 * Hill-Radius: Bereich, in dem die Gravitation des Planeten die Gezeitenwirkung des Sterns
 * überwiegt. r_H = a·∛(m / 3M) (Murray & Dermott 1999). Im Perihel ist er um den Faktor
 * (1 − e) kleiner – siehe `perihelionHillRadius`.
 */
export function hillRadius(a: number, planetMass: number, starMass: number): number {
  if (starMass <= 0) return Infinity;
  return a * Math.cbrt(planetMass / (3 * starMass));
}

/** Hill-Radius im Perihel (kleinster Wert entlang einer exzentrischen Bahn). */
export function perihelionHillRadius(
  a: number,
  e: number,
  planetMass: number,
  starMass: number,
): number {
  return hillRadius(a, planetMass, starMass) * (1 - e);
}

/**
 * Kritische große Halbachse eines Mondes in Hill-Radien (r_H = a·∛(m/3M)) nach Domingos, Winter & Yokoyama (2006),
 * MNRAS 373, 1227: numerisch bestimmte Stabilitätsgrenze für prograde und retrograde Monde.
 * `planetEcc` = Exzentrizität der Planetenbahn, `moonEcc` = Exzentrizität der Mondbahn.
 */
export function criticalMoonDistance(
  retrograde: boolean,
  planetEcc: number,
  moonEcc: number,
): number {
  return retrograde
    ? 0.9309 * (1 - 1.0764 * planetEcc - 0.9812 * moonEcc)
    : 0.4895 * (1 - 1.0305 * planetEcc - 0.2738 * moonEcc);
}

/**
 * Roche-Grenze: Unterhalb dieses Abstands zerreißen Gezeitenkräfte einen Mond, der nur durch
 * seine eigene Schwerkraft zusammengehalten wird.
 * Starrer Körper: d = 1,26·R·∛(ρ_P/ρ_M), flüssiger Körper: d ≈ 2,44·R·∛(ρ_P/ρ_M).
 */
export function rocheLimit(
  planetRadius: number,
  planetDensity: number,
  moonDensity: number,
  rigid = false,
): number {
  return (rigid ? 1.26 : 2.44) * planetRadius * Math.cbrt(planetDensity / moonDensity);
}

/** Radius einer Kugel mit Masse m und Dichte ρ. */
export function radiusFromMass(mass: number, density: number): number {
  return Math.cbrt((3 * mass) / (4 * Math.PI * density));
}

/** Verhältnis der Anziehung von Stern und Planet auf den Mond. */
export function pullRatio(
  starMass: number,
  starDistance: number,
  planetMass: number,
  planetDistance: number,
): number {
  return (starMass / planetMass) * (planetDistance / starDistance) ** 2;
}

/**
 * Maximale Gezeitenbeschleunigung des Sterns relativ zur Anziehung des Planeten:
 * 2·(M/m)·(r/d)³. Das ist die eigentliche "Störung" der Mondbahn.
 */
export function tidalRatio(
  starMass: number,
  starDistance: number,
  planetMass: number,
  moonDistance: number,
): number {
  return 2 * (starMass / planetMass) * (moonDistance / starDistance) ** 3;
}

/** Abstand des Schwerpunkts zweier Körper vom Mittelpunkt des ersten. */
export function barycenterOffset(m1: number, m2: number, distance: number): number {
  return (distance * m2) / (m1 + m2);
}
