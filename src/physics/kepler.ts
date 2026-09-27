/** Kepler-Gleichung M = E − e·sin E für die exzentrische Anomalie E (Newton-Verfahren). */
export function solveKepler(meanAnomaly: number, e: number): number {
  let E = e < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 50; i++) {
    const f = E - e * Math.sin(E) - meanAnomaly;
    const d = f / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-13) break;
  }
  return E;
}

/** Position auf der Ellipse (Brennpunkt im Ursprung) zur exzentrischen Anomalie E. */
export function ellipsePosition(a: number, e: number, E: number): { x: number; y: number } {
  return { x: a * (Math.cos(E) - e), y: a * Math.sqrt(1 - e * e) * Math.sin(E) };
}

/** Position auf der Ellipse nach dem Bruchteil `phase` (0..1) eines Umlaufs, ab Perihel. */
export function positionAtPhase(a: number, e: number, phase: number): { x: number; y: number } {
  return ellipsePosition(a, e, solveKepler(2 * Math.PI * phase, e));
}

export interface OrbitData {
  name: string;
  /** Große Halbachse (Einheit je nach Tabelle). */
  a: number;
  /** Umlaufzeit (Einheit je nach Tabelle). */
  T: number;
}

/** Planeten: a in AE, T in Jahren (NASA Planetary Fact Sheet). */
export const PLANETS: readonly OrbitData[] = [
  { name: 'Merkur', a: 0.387, T: 0.2408 },
  { name: 'Venus', a: 0.723, T: 0.6152 },
  { name: 'Erde', a: 1.0, T: 1.0 },
  { name: 'Mars', a: 1.524, T: 1.8809 },
  { name: 'Jupiter', a: 5.203, T: 11.862 },
  { name: 'Saturn', a: 9.537, T: 29.457 },
  { name: 'Uranus', a: 19.191, T: 84.011 },
  { name: 'Neptun', a: 30.069, T: 164.79 },
];

/** Galileische Monde: a in km, T in Tagen. */
export const JUPITER_MOONS: readonly OrbitData[] = [
  { name: 'Io', a: 421_700, T: 1.769 },
  { name: 'Europa', a: 671_034, T: 3.551 },
  { name: 'Ganymed', a: 1_070_412, T: 7.155 },
  { name: 'Kallisto', a: 1_882_709, T: 16.689 },
];

/** Masse des Zentralkörpers aus dem 3. Keplerschen Gesetz: M = 4π²a³ / (G·T²) (SI). */
export function centralMass(a: number, T: number, g: number): number {
  return (4 * Math.PI ** 2 * a ** 3) / (g * T * T);
}
