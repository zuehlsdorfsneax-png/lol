import {
  EARTH,
  KM,
  MOON,
  REAL_PARAMS,
  SUN,
  criticalMoonDistance,
  scenarioInfo,
  type Outcome,
  type ScenarioParams,
} from '../physics';

export type AxisKey =
  | 'moonDistanceRH'
  | 'moonSpeed'
  | 'moonAngle'
  | 'earthOrbit'
  | 'earthEccentricity'
  | 'sunMass'
  | 'moonMass';

export interface AxisDef {
  key: AxisKey;
  label: string;
  short: string;
  min: number;
  max: number;
  log: boolean;
  format: (v: number) => string;
}

const de = (v: number, d: number): string =>
  v.toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });

export const AXES: Record<AxisKey, AxisDef> = {
  moonDistanceRH: {
    key: 'moonDistanceRH',
    label: 'Mondabstand (Hill-Radien)',
    short: 'd / r_H',
    min: 0.05,
    max: 1,
    log: false,
    format: (v) => de(v, 2),
  },
  moonSpeed: {
    key: 'moonSpeed',
    label: 'Startgeschwindigkeit (× v_Kreis)',
    short: 'v / v_K',
    min: 0.1,
    max: 1.6,
    log: false,
    format: (v) => de(v, 2),
  },
  moonAngle: {
    key: 'moonAngle',
    label: 'Startwinkel (°)',
    short: 'Winkel',
    min: 0,
    max: 360,
    log: false,
    format: (v) => `${de(v, 0)}°`,
  },
  earthOrbit: {
    key: 'earthOrbit',
    label: 'Abstand Erde–Sonne (AE)',
    short: 'a_Erde',
    min: 0.2,
    max: 2,
    log: true,
    format: (v) => de(v, 2),
  },
  earthEccentricity: {
    key: 'earthEccentricity',
    label: 'Exzentrizität der Erdbahn',
    short: 'e_Erde',
    min: 0,
    max: 0.9,
    log: false,
    format: (v) => de(v, 2),
  },
  sunMass: {
    key: 'sunMass',
    label: 'Sonnenmasse (× M☉)',
    short: 'M☉',
    min: 0.2,
    max: 20,
    log: true,
    format: (v) => de(v, 2),
  },
  moonMass: {
    key: 'moonMass',
    label: 'Mondmasse (× M☾)',
    short: 'M☾',
    min: 0.01,
    max: 100,
    log: true,
    format: (v) => de(v, 2),
  },
};

export interface MapConfig {
  x: AxisKey;
  y: AxisKey;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  nx: number;
  ny: number;
  years: number;
  retrograde: boolean;
  roche: boolean;
  base: ScenarioParams;
}

export function axisValue(def: AxisDef, min: number, max: number, t: number): number {
  return def.log
    ? Math.exp(Math.log(min) + t * (Math.log(max) - Math.log(min)))
    : min + t * (max - min);
}

/** Parameter für eine Zelle (Zellmitte). */
export function cellParams(cfg: MapConfig, i: number, j: number): ScenarioParams {
  const xv = axisValue(AXES[cfg.x], cfg.xMin, cfg.xMax, (i + 0.5) / cfg.nx);
  const yv = axisValue(AXES[cfg.y], cfg.yMin, cfg.yMax, (j + 0.5) / cfg.ny);
  let p: ScenarioParams = {
    ...cfg.base,
    moonRetrograde: cfg.retrograde,
    intruder: null,
    particles: null,
  };
  // Erst alle Größen außer dem Abstand in Hill-Radien setzen – dieser hängt von ihnen ab.
  const apply = (key: AxisKey, v: number): void => {
    if (key !== 'moonDistanceRH') p = { ...p, [key]: v };
  };
  apply(cfg.x, xv);
  apply(cfg.y, yv);
  const rh = cfg.x === 'moonDistanceRH' ? xv : cfg.y === 'moonDistanceRH' ? yv : null;
  if (rh !== null) p = { ...p, moonDistance: (rh * scenarioInfo(p).hillRadius) / KM };
  return p;
}

export interface CellResult {
  i: number;
  j: number;
  outcome: Outcome;
  time: number;
  minDistance: number;
  maxDistance: number;
}

/** Für die Karte werden die Ausgänge zu drei Klassen zusammengefasst. */
export type OutcomeClass = 'stable' | 'crash' | 'escape';

export function outcomeClass(o: Outcome): OutcomeClass {
  if (o === 'stable') return 'stable';
  if (o === 'crash' || o === 'roche') return 'crash';
  return 'escape';
}

export interface MapPreset {
  id: string;
  title: string;
  description: string;
  config: Omit<MapConfig, 'base' | 'nx' | 'ny' | 'years' | 'roche'>;
}

export const MAP_PRESETS: readonly MapPreset[] = [
  {
    id: 'abstand-geschwindigkeit',
    title: 'Abstand × Geschwindigkeit (prograd)',
    description:
      'Wo kann ein Mond stabil kreisen? Links unten stürzt er ab, oben und rechts entkommt er. Die Linien sind die Vorhersagen der Theorie.',
    config: {
      x: 'moonDistanceRH',
      y: 'moonSpeed',
      xMin: 0.05,
      xMax: 1,
      yMin: 0.1,
      yMax: 1.6,
      retrograde: false,
    },
  },
  {
    id: 'retrograd',
    title: 'Abstand × Geschwindigkeit (retrograd)',
    description:
      'Dieselbe Karte für rückläufige Monde: Die stabile Zone reicht fast doppelt so weit hinaus.',
    config: {
      x: 'moonDistanceRH',
      y: 'moonSpeed',
      xMin: 0.05,
      xMax: 1,
      yMin: 0.1,
      yMax: 1.6,
      retrograde: true,
    },
  },
  {
    id: 'sonne',
    title: 'Erdabstand × Sonnenmasse',
    description:
      'Der reale Mond (384 400 km) bei anderem Abstand zur Sonne und anderer Sonnenmasse. Die Grenze folgt der Theorie r_H ∝ a · M^(−1/3).',
    config: {
      x: 'earthOrbit',
      y: 'sunMass',
      xMin: 0.2,
      xMax: 2,
      yMin: 0.2,
      yMax: 20,
      retrograde: false,
    },
  },
  {
    id: 'exzentrizitaet',
    title: 'Exzentrizität der Erdbahn × Mondabstand',
    description:
      'Je elliptischer die Erdbahn, desto kleiner die Hill-Sphäre im Perihel – und desto enger die stabile Zone.',
    config: {
      x: 'earthEccentricity',
      y: 'moonDistanceRH',
      xMin: 0,
      xMax: 0.9,
      yMin: 0.05,
      yMax: 0.8,
      retrograde: false,
    },
  },
  {
    id: 'winkel',
    title: 'Startwinkel × Geschwindigkeit',
    description:
      'Nahe der Fluchtgrenze entscheidet die Position relativ zur Sonne: Ob der Mond das Tor bei L1 oder L2 trifft, hängt empfindlich vom Startwinkel ab.',
    config: {
      x: 'moonAngle',
      y: 'moonSpeed',
      xMin: 0,
      xMax: 360,
      yMin: 1.0,
      yMax: 1.45,
      retrograde: false,
    },
  },
];

export const DEFAULT_BASE: ScenarioParams = {
  ...REAL_PARAMS,
  moonDistance: 384_400,
  moonSpeed: 1,
  moonAngle: 0,
};

export interface Overlay {
  label: string;
  points: [number, number][];
}

/** Theoretische Grenzlinien für die jeweilige Achsenkombination (in Achsenwerten). */
export function theoryOverlays(cfg: MapConfig): Overlay[] {
  const out: Overlay[] = [];
  const info = scenarioInfo({ ...cfg.base, moonRetrograde: cfg.retrograde });
  const range = (a: number, b: number, n = 80): number[] =>
    Array.from({ length: n }, (_, k) => a + ((b - a) * k) / (n - 1));

  if (cfg.x === 'moonDistanceRH' && cfg.y === 'moonSpeed') {
    const rh = info.hillRadius;
    const touch = info.earthRadius + info.moonRadius;
    // Absturz, wenn die Periapsis kleiner als R_E + R_M ist: f² = 2x/(1+x), x = r_min/r₀.
    const curve = (rMin: number): [number, number][] =>
      range(cfg.xMin, cfg.xMax).map((d) => {
        const x = rMin / (d * rh);
        return [d, Math.sqrt((2 * x) / (1 + x))];
      });
    out.push({ label: 'Absturz (Theorie)', points: curve(touch) });
    out.push({ label: 'Roche-Grenze', points: curve(info.rocheFluid) });
    out.push({
      label: 'Fluchtgeschw. (ohne Sonne)',
      points: [
        [cfg.xMin, Math.SQRT2],
        [cfg.xMax, Math.SQRT2],
      ],
    });
    const crit = criticalMoonDistance(cfg.retrograde, cfg.base.earthEccentricity, 0);
    out.push({
      label: `Domingos et al.: ${de(crit, 2)} r_H`,
      points: [
        [crit, cfg.yMin],
        [crit, cfg.yMax],
      ],
    });
  }
  if (cfg.x === 'earthOrbit' && cfg.y === 'sunMass') {
    // Mond bei 384 400 km erreicht 0,48 r_H: 384 400 km = 0,48 · a · ∛(m / 3M)
    const d = cfg.base.moonDistance * KM;
    const m = EARTH.mass + MOON.mass;
    const crit = criticalMoonDistance(false, cfg.base.earthEccentricity, 0);
    out.push({
      label: `Mond bei ${de(crit, 2)} r_H`,
      points: range(cfg.xMin, cfg.xMax).map((a) => {
        const aM = a * 1.495978707e11;
        const M = m / (3 * (d / (crit * aM)) ** 3);
        return [a, M / SUN.mass];
      }),
    });
  }
  if (cfg.x === 'earthEccentricity' && cfg.y === 'moonDistanceRH') {
    out.push({
      label: 'Domingos et al. (2006)',
      points: range(cfg.xMin, cfg.xMax).map((e) => [
        e,
        Math.max(0, criticalMoonDistance(cfg.retrograde, e, 0)),
      ]),
    });
  }
  if (cfg.y === 'moonSpeed' && cfg.yMax > Math.SQRT2 && cfg.x !== 'moonDistanceRH') {
    out.push({
      label: 'Fluchtgeschw. (ohne Sonne)',
      points: [
        [cfg.xMin, Math.SQRT2],
        [cfg.xMax, Math.SQRT2],
      ],
    });
  }
  return out;
}

/** Lage des realen Mondes in der Karte (falls sichtbar). */
export function realMoonMarker(cfg: MapConfig): [number, number] | null {
  const real: Partial<Record<AxisKey, number>> = {
    moonDistanceRH: MOON.semiMajorAxis / scenarioInfo(REAL_PARAMS).hillRadius,
    moonSpeed: 1,
    moonAngle: 0,
    earthOrbit: 1,
    earthEccentricity: 0.0167,
    sunMass: 1,
    moonMass: 1,
  };
  const x = real[cfg.x];
  const y = real[cfg.y];
  if (x === undefined || y === undefined || cfg.retrograde) return null;
  return [x, y];
}
