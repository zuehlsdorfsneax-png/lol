import { G } from './constants';

/**
 * Rechnungen zur "Hohlmond-Theorie": Welche Eigenschaften müsste ein hohler Mond mit der
 * gemessenen Masse und dem gemessenen Radius haben?
 */

/** Dichte, die eine Kugelschale der Dicke t haben müsste, um die Masse M aufzubringen. */
export function shellDensity(mass: number, radius: number, thickness: number): number {
  const inner = Math.max(0, radius - thickness);
  return mass / ((4 / 3) * Math.PI * (radius ** 3 - inner ** 3));
}

/**
 * Normiertes Trägheitsmoment I/(M·R²) einer homogenen Hohlkugel mit Innenradius q·R:
 * 0,4·(1 − q⁵)/(1 − q³). Vollkugel (q = 0): 0,4; dünne Schale (q → 1): 2/3.
 */
export function momentOfInertiaFactor(innerRatio: number): number {
  const q = Math.min(Math.max(innerRatio, 0), 1);
  if (q > 0.999999) return 2 / 3;
  return (0.4 * (1 - q ** 5)) / (1 - q ** 3);
}

/**
 * Normiertes Trägheitsmoment eines Körpers aus Kern (Radius k·R, Dichte ρ_K) und Mantel
 * (Dichte ρ_M). Werte unter 0,4 bedeuten: Masse ist zur Mitte hin konzentriert.
 */
export function coreMantleMomentFactor(coreRatio: number, densityRatio: number): number {
  const k = coreRatio;
  // Masse- und Trägheitsbeiträge relativ zu einer Vollkugel aus Mantelmaterial.
  const mass = 1 + (densityRatio - 1) * k ** 3;
  const inertia = 0.4 * (1 + (densityRatio - 1) * k ** 5);
  return inertia / mass;
}

/**
 * Druckspannung in einer dünnen, selbstgravitierenden Kugelschale (Membran-Näherung):
 * Flächenlast w = (M/4πR²)·g/2 (mittlere Schwere in der Schale), Spannung σ = w·R/(2t).
 * Für dicke Schalen nur eine grobe Abschätzung.
 */
export function shellStress(mass: number, radius: number, thickness: number): number {
  const surfaceMass = mass / (4 * Math.PI * radius ** 2);
  const g = (G * mass) / radius ** 2;
  const load = (surfaceMass * g) / 2;
  return (load * radius) / (2 * thickness);
}

/**
 * Schwerebeschleunigung im Abstand r vom Mittelpunkt einer Kugel(schale) mit Innenradius
 * `inner` und Außenradius `outer`. Innerhalb des Hohlraums ist sie exakt null (Schalentheorem).
 */
export function gravityInsideShell(r: number, mass: number, outer: number, inner: number): number {
  if (r <= inner) return 0;
  if (r >= outer) return (G * mass) / (r * r);
  const enclosed = (r ** 3 - inner ** 3) / (outer ** 3 - inner ** 3);
  return (G * mass * enclosed) / (r * r);
}

/** Beschleunigung einer rollenden Kugel auf der schiefen Ebene: a = g·sin α / (1 + k). */
export function rollingAcceleration(g: number, angleRad: number, inertiaFactor: number): number {
  return (g * Math.sin(angleRad)) / (1 + inertiaFactor);
}

export interface Material {
  name: string;
  /** Dichte in kg/m³. */
  density: number;
}

export const MATERIALS: readonly Material[] = [
  { name: 'Wasser', density: 1000 },
  { name: 'Granit', density: 2700 },
  { name: 'Mondgestein (Mittel)', density: 3344 },
  { name: 'Eisen', density: 7874 },
  { name: 'Blei', density: 11_340 },
  { name: 'Gold', density: 19_300 },
  { name: 'Osmium (dichtestes Element)', density: 22_590 },
];

export interface Strength {
  name: string;
  /** Druckfestigkeit in Pa (Größenordnung). */
  strength: number;
}

export const STRENGTHS: readonly Strength[] = [
  { name: 'Granit', strength: 2e8 },
  { name: 'Baustahl', strength: 4e8 },
  { name: 'Hochfester Stahl', strength: 2e9 },
];
