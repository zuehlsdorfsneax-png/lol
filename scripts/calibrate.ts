/**
 * Bestimmt die Stabilitätsgrenzen des Erde–Mond–Sonne-Systems durch systematische Simulation.
 * Aufruf: npm run calibrate
 *
 * Für jeden Parameter wird ein Bereich fein abgetastet; ausgegeben wird der erste Wert, ab dem
 * der Mond innerhalb der Simulationsdauer abstürzt bzw. entkommt. Die Ergebnisse stehen in
 * Kapitel 8 und in den Missionen.
 */
import {
  KM,
  REAL_PARAMS,
  runStability,
  scenarioInfo,
  type Outcome,
  type ScenarioParams,
} from '../src/physics';

const YEARS = 30;
const base: ScenarioParams = { ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 1 };
const rh = scenarioInfo(base).hillRadius / KM;

function edge(
  label: string,
  values: number[],
  make: (v: number) => ScenarioParams,
  isBad: (o: Outcome) => boolean,
  unit: string,
  years = YEARS,
  roche = false,
): void {
  let lastGood: number | null = null;
  for (const v of values) {
    const r = runStability(make(v), { years, roche });
    if (isBad(r.outcome)) {
      console.log(
        `${label.padEnd(44)} stabil bis ${lastGood?.toFixed(4) ?? '–'} ${unit}, instabil ab ${v.toFixed(4)} ${unit} (${r.outcome})`,
      );
      return;
    }
    lastGood = v;
  }
  console.log(`${label.padEnd(44)} im ganzen Bereich stabil`);
}

const range = (a: number, b: number, step: number): number[] => {
  const out: number[] = [];
  for (let v = a; v <= b + 1e-12; v += step) out.push(v);
  return out;
};
/** Von b abwärts bis a. */
const down = (a: number, b: number, step: number): number[] => range(a, b, step).reverse();

console.log(
  `Hill-Radius der Erde: ${Math.round(rh).toLocaleString('de-DE')} km, Simulationsdauer ${YEARS} Jahre\n`,
);
edge(
  'Absturz: Startgeschwindigkeit (× v_Kreis)',
  down(0.15, 0.3, 0.0025),
  (f) => ({ ...base, moonSpeed: f }),
  (o) => o === 'crash',
  '',
  2,
);
edge(
  'Roche-Grenze: Startgeschwindigkeit',
  down(0.2, 0.4, 0.0025),
  (f) => ({ ...base, moonSpeed: f }),
  (o) => o !== 'stable',
  '',
  2,
  true,
);
edge(
  'Flucht: Startgeschwindigkeit (mit Sonne)',
  range(1, 1.45, 0.0025),
  (f) => ({ ...base, moonSpeed: f }),
  (o) => o === 'escape',
  '',
);
edge(
  'Flucht: Startgeschwindigkeit (ohne Sonne)',
  range(1.3, 1.5, 0.0025),
  (f) => ({ ...base, sunMass: 0, moonSpeed: f }),
  (o) => o === 'escape',
  '',
  10,
);
edge(
  'Abstand prograd (Kreisbahn)',
  range(0.4, 0.6, 0.0025),
  (x) => ({ ...base, moonDistance: x * rh }),
  (o) => o === 'escape',
  'r_H',
);
edge(
  'Abstand retrograd (Kreisbahn)',
  range(0.8, 1.1, 0.0025),
  (x) => ({ ...base, moonDistance: x * rh, moonRetrograde: true }),
  (o) => o === 'escape',
  'r_H',
);
edge(
  'Erdbahn kleiner (Kreisbahn, AE)',
  down(0.4, 1, 0.0025),
  (a) => ({ ...base, earthOrbit: a, earthEccentricity: 0 }),
  (o) => o === 'escape',
  'AE',
);
edge(
  'Sonnenmasse größer (× M☉)',
  range(1, 10, 0.05),
  (m) => ({ ...base, sunMass: m }),
  (o) => o === 'escape',
  'M☉',
);
edge(
  'Exzentrizität der Erdbahn',
  range(0, 0.9, 0.005),
  (e) => ({ ...base, earthEccentricity: e }),
  (o) => o !== 'stable',
  '',
);
