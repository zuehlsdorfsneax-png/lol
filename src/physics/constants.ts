/**
 * Physikalische Konstanten und Himmelskörper-Daten (SI-Einheiten).
 * Quellen: CODATA 2018 (G), IAU 2012 (AE), NASA Planetary Fact Sheets.
 */

/** Gravitationskonstante in m³/(kg·s²). */
export const G = 6.6743e-11;
/** Astronomische Einheit in m. */
export const AU = 1.495978707e11;
export const KM = 1000;
export const DAY = 86_400;
/** Julianisches Jahr in s. */
export const YEAR = 365.25 * DAY;

export const SUN = {
  mass: 1.98847e30,
  radius: 6.957e8,
  density: 1408,
} as const;

export const EARTH = {
  mass: 5.9722e24,
  radius: 6.371e6,
  density: 5513,
  /** Große Halbachse der Erdbahn. */
  semiMajorAxis: 1.00000261 * AU,
  eccentricity: 0.0167,
  siderealYear: 365.256363 * DAY,
} as const;

export const MOON = {
  mass: 7.342e22,
  radius: 1.7374e6,
  density: 3344,
  /** Mittlerer Abstand (große Halbachse) Erde–Mond. */
  semiMajorAxis: 3.84399e8,
  eccentricity: 0.0549,
  /** Siderischer Monat: Umlauf relativ zu den Fixsternen. */
  siderealPeriod: 27.321661 * DAY,
  /** Synodischer Monat: von Neumond zu Neumond. */
  synodicPeriod: 29.530589 * DAY,
  /** Umlaufzeit der Apsidenlinie (Perigäum wandert einmal herum). */
  apsidalPeriod: 8.85 * YEAR,
  /** Umlaufzeit der Knotenlinie (rückläufig). */
  nodalPeriod: 18.61 * YEAR,
  /** Normiertes Trägheitsmoment C/(M·R²), Lunar Prospector (Konopliv et al. 1998). */
  momentOfInertia: 0.3929,
  momentOfInertiaError: 0.0009,
  /** Heutige Entfernungszunahme durch Gezeitenreibung (Lunar Laser Ranging) in m/Jahr. */
  recessionPerYear: 0.0382,
  surfaceGravity: 1.62,
} as const;

/** Newtons Näherung: Mondabstand in Erdradien (≈ 60). */
export const MOON_DISTANCE_IN_EARTH_RADII = MOON.semiMajorAxis / EARTH.radius;
/** Fallbeschleunigung an der Erdoberfläche (Normwert) in m/s². */
export const STANDARD_GRAVITY = 9.80665;
