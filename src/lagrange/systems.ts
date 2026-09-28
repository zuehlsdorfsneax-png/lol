import { AU, DAY, EARTH, KM, MOON, SUN, YEAR } from '../physics';

export interface CR3BPSystem {
  id: string;
  name: string;
  mu: number;
  labels: [string, string];
  /** Längeneinheit (Abstand der Hauptkörper) in m. */
  length: number;
  /** Zeiteinheit (Umlaufzeit / 2π) in s. */
  time: number;
  note: string;
}

const PLUTO = 1.303e22;
const CHARON = 1.586e21;
const JUPITER = 1.898e27;

export const SYSTEMS: readonly CR3BPSystem[] = [
  {
    id: 'erde-mond',
    name: 'Erde–Mond',
    mu: MOON.mass / (EARTH.mass + MOON.mass),
    labels: ['Erde', 'Mond'],
    length: MOON.semiMajorAxis,
    time: MOON.siderealPeriod / (2 * Math.PI),
    note: 'An L4/L5 des Erde–Mond-Systems wurden 2018 schwache Staubwolken gemeldet (Kordylewski-Wolken).',
  },
  {
    id: 'sonne-erde',
    name: 'Sonne–Erde',
    mu: EARTH.mass / (SUN.mass + EARTH.mass),
    labels: ['Sonne', 'Erde'],
    length: AU,
    time: YEAR / (2 * Math.PI),
    note: 'L1 (1,5 Mio. km sonnenwärts) nutzt das Sonnenobservatorium SOHO, L2 das James-Webb-Weltraumteleskop.',
  },
  {
    id: 'sonne-jupiter',
    name: 'Sonne–Jupiter',
    mu: JUPITER / (SUN.mass + JUPITER),
    labels: ['Sonne', 'Jupiter'],
    length: 5.2 * AU,
    time: (11.862 * YEAR) / (2 * Math.PI),
    note: 'An L4 und L5 von Jupiter kreisen über 10.000 bekannte Trojaner-Asteroiden.',
  },
  {
    id: 'pluto-charon',
    name: 'Pluto–Charon',
    mu: CHARON / (PLUTO + CHARON),
    labels: ['Pluto', 'Charon'],
    length: 19_596 * KM,
    time: (6.387 * DAY) / (2 * Math.PI),
    note: 'Charon ist so schwer (μ ≈ 0,11), dass L4 und L5 instabil sind – das Routh-Kriterium ist verletzt.',
  },
];

export function findSystem(id: string | null): CR3BPSystem {
  return SYSTEMS.find((s) => s.id === id) ?? SYSTEMS[0]!;
}
