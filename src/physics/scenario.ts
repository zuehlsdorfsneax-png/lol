import { AU, DAY, EARTH, G, KM, MOON, SUN } from './constants';
import { hillRadius, radiusFromMass, rocheLimit } from './criteria';
import type { BodyInit } from './nbody';

/** Einstellbare Parameter des Erde–Mond–Sonne-Systems (in anschaulichen Einheiten). */
export interface ScenarioParams {
  /** Sonnenmasse in Vielfachen von M☉ (0 = ohne Sonne, reines Zwei-Körper-Problem). */
  sunMass: number;
  /** Erdmasse in Vielfachen von M⊕. */
  earthMass: number;
  /** Mondmasse in Vielfachen von M☾. */
  moonMass: number;
  /** Große Halbachse der Erdbahn in AE. */
  earthOrbit: number;
  /** Exzentrizität der Erdbahn (Start im Perihel). */
  earthEccentricity: number;
  /** Anfangsabstand Erde–Mond in km. */
  moonDistance: number;
  /** Startgeschwindigkeit des Mondes als Vielfaches der Kreisbahngeschwindigkeit. */
  moonSpeed: number;
  /** Rückläufiger (retrograder) Umlauf des Mondes. */
  moonRetrograde: boolean;
  /** Startposition des Mondes in Grad (0° = Vollmond, von der Sonne abgewandt; 180° = Neumond). */
  moonAngle: number;
  /** Optionaler Störkörper, der an der Erde vorbeifliegt. */
  intruder: IntruderParams | null;
  /** Optionale Wolke masseloser Testteilchen um die Erde. */
  particles: ParticleParams | null;
}

export interface IntruderParams {
  /** Masse in Erdmassen. */
  mass: number;
  /** Geplanter kleinster Abstand zur Erde in km. */
  distance: number;
  /** Relativgeschwindigkeit in km/s. */
  speed: number;
  /** Tage bis zur größten Annäherung. */
  leadDays: number;
}

export interface ParticleParams {
  count: number;
  innerKm: number;
  outerKm: number;
  retrograde: boolean;
}

export const REAL_PARAMS: ScenarioParams = {
  sunMass: 1,
  earthMass: 1,
  moonMass: 1,
  earthOrbit: EARTH.semiMajorAxis / AU,
  earthEccentricity: EARTH.eccentricity,
  // Start im Perigäum mit passender Geschwindigkeit ergibt die reale Exzentrizität 0,0549.
  moonDistance: (MOON.semiMajorAxis * (1 - MOON.eccentricity)) / KM,
  moonSpeed: Math.sqrt(1 + MOON.eccentricity),
  moonRetrograde: false,
  // Die Startwerte sind oskulierende Bahnelemente. Weil die Sonne die Bahn periodisch verformt
  // (Variation), hängt die mittlere Bahn von der Startphase ab. 35° ist so gewählt, dass die
  // mittlere Umlaufzeit dem beobachteten siderischen Monat entspricht (siehe Methodik).
  moonAngle: 35,
  intruder: null,
  particles: null,
};

export interface BodyIndices {
  sun: number;
  earth: number;
  moon: number;
  intruder: number;
  /** Index des ersten Testteilchens (oder -1). */
  firstParticle: number;
}

/** Abgeleitete Größen, die sich direkt aus den Parametern ergeben. */
export interface ScenarioInfo {
  sunMass: number;
  earthMass: number;
  moonMass: number;
  earthRadius: number;
  moonRadius: number;
  sunRadius: number;
  /** Hill-Radius der Erde r_H = a·∛(m/3M). */
  hillRadius: number;
  /** Hill-Radius im Perihel der Erdbahn (kleinster Wert). */
  hillRadiusPerihelion: number;
  rocheFluid: number;
  rocheRigid: number;
  /** Kreisbahngeschwindigkeit des Mondes im Startabstand. */
  moonCircularSpeed: number;
  moonDistance: number;
  earthPerihelion: number;
}

export interface Scenario {
  bodies: BodyInit[];
  indices: BodyIndices;
  info: ScenarioInfo;
}

export function scenarioInfo(p: ScenarioParams): ScenarioInfo {
  const sunMass = p.sunMass * SUN.mass;
  const earthMass = p.earthMass * EARTH.mass;
  const moonMass = p.moonMass * MOON.mass;
  // Radien bei gleichbleibender Dichte: mehr Masse = größerer Körper.
  const earthRadius = radiusFromMass(earthMass, EARTH.density);
  const moonRadius = radiusFromMass(moonMass, MOON.density);
  const moonDistance = p.moonDistance * KM;
  return {
    sunMass,
    earthMass,
    moonMass,
    earthRadius,
    moonRadius,
    sunRadius: radiusFromMass(Math.max(sunMass, 1), SUN.density),
    hillRadius: hillRadius(p.earthOrbit * AU, earthMass + moonMass, sunMass),
    hillRadiusPerihelion:
      hillRadius(p.earthOrbit * AU, earthMass + moonMass, sunMass) * (1 - p.earthEccentricity),
    rocheFluid: rocheLimit(earthRadius, EARTH.density, MOON.density),
    rocheRigid: rocheLimit(earthRadius, EARTH.density, MOON.density, true),
    moonCircularSpeed: Math.sqrt((G * (earthMass + moonMass)) / moonDistance),
    moonDistance,
    earthPerihelion: p.earthOrbit * AU * (1 - p.earthEccentricity),
  };
}

/**
 * Baut aus den Parametern Anfangsbedingungen: Erde–Mond-Schwerpunkt im Perihel der Erdbahn,
 * Mond tangential mit dem gewählten Vielfachen der Kreisbahngeschwindigkeit. Zum Schluss
 * wird alles ins Schwerpunktsystem verschoben (Gesamtimpuls null).
 */
export function buildScenario(p: ScenarioParams): Scenario {
  const info = scenarioInfo(p);
  const { sunMass, earthMass, moonMass } = info;
  const bodies: BodyInit[] = [];
  const indices: BodyIndices = { sun: -1, earth: -1, moon: -1, intruder: -1, firstParticle: -1 };

  // Schwerpunkt Erde–Mond auf der Bahn um die Sonne.
  let bx = 0;
  let bvy = 0;
  if (sunMass > 0) {
    bx = info.earthPerihelion;
    bvy = Math.sqrt(
      (G * (sunMass + earthMass + moonMass) * (1 + p.earthEccentricity)) / info.earthPerihelion,
    );
    indices.sun = bodies.length;
    bodies.push({
      name: 'Sonne',
      kind: 'star',
      mass: sunMass,
      radius: info.sunRadius,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    });
  }

  // Mond relativ zur Erde.
  const angle = (p.moonAngle * Math.PI) / 180;
  const r0 = info.moonDistance;
  const rx = r0 * Math.cos(angle);
  const ry = r0 * Math.sin(angle);
  const speed = p.moonSpeed * info.moonCircularSpeed;
  const dir = p.moonRetrograde ? -1 : 1;
  const rvx = -Math.sin(angle) * speed * dir;
  const rvy = Math.cos(angle) * speed * dir;
  const mTotal = earthMass + moonMass;
  const fEarth = moonMass / mTotal;
  const fMoon = earthMass / mTotal;

  indices.earth = bodies.length;
  bodies.push({
    name: 'Erde',
    kind: 'planet',
    mass: earthMass,
    radius: info.earthRadius,
    x: bx - fEarth * rx,
    y: -fEarth * ry,
    vx: -fEarth * rvx,
    vy: bvy - fEarth * rvy,
  });
  indices.moon = bodies.length;
  bodies.push({
    name: 'Mond',
    kind: 'moon',
    mass: moonMass,
    radius: info.moonRadius,
    x: bx + fMoon * rx,
    y: fMoon * ry,
    vx: fMoon * rvx,
    vy: bvy + fMoon * rvy,
  });

  const earth = bodies[indices.earth]!;

  if (p.intruder) {
    // Geradliniger Anflug relativ zur Erde: größte Annäherung nach `leadDays` im Abstand `distance`.
    const v = p.intruder.speed * KM;
    const lead = p.intruder.leadDays * DAY;
    const mass = p.intruder.mass * EARTH.mass;
    indices.intruder = bodies.length;
    bodies.push({
      name: 'Störkörper',
      kind: 'intruder',
      mass,
      radius: radiusFromMass(mass, 1300),
      x: earth.x - p.intruder.distance * KM,
      y: earth.y - v * lead,
      vx: earth.vx,
      vy: earth.vy + v,
    });
  }

  if (p.particles && p.particles.count > 0) {
    const { count, innerKm, outerKm, retrograde } = p.particles;
    indices.firstParticle = bodies.length;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let k = 0; k < count; k++) {
      const t = count === 1 ? 0 : k / (count - 1);
      const r = (innerKm + (outerKm - innerKm) * t) * KM;
      const phi = k * golden;
      const v = Math.sqrt((G * earthMass) / r) * (retrograde ? -1 : 1);
      bodies.push({
        name: `Teilchen ${k + 1}`,
        kind: 'particle',
        mass: 0,
        radius: 0,
        x: earth.x + r * Math.cos(phi),
        y: earth.y + r * Math.sin(phi),
        vx: earth.vx - v * Math.sin(phi),
        vy: earth.vy + v * Math.cos(phi),
      });
    }
  }

  // Schwerpunktsystem: Gesamtimpuls null.
  let m = 0;
  let cx = 0;
  let cy = 0;
  let px = 0;
  let py = 0;
  for (const b of bodies) {
    m += b.mass;
    cx += b.mass * b.x;
    cy += b.mass * b.y;
    px += b.mass * b.vx;
    py += b.mass * b.vy;
  }
  for (const b of bodies) {
    b.x -= cx / m;
    b.y -= cy / m;
    b.vx -= px / m;
    b.vy -= py / m;
  }

  return { bodies, indices, info };
}
