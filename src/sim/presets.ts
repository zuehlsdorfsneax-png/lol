import {
  EARTH_HILL_RADIUS,
  KM,
  REAL_PARAMS,
  type ScenarioParams,
  MOON_DISTANCE_KM,
} from '../physics';
import type { SimSettings } from './Simulation';
import type { FrameId } from './view';

export interface Preset {
  id: string;
  title: string;
  description: string;
  params: ScenarioParams;
  settings?: Partial<SimSettings>;
  view: {
    frame: FrameId;
    /** Sichtbarer Radius in m. */
    radius: number;
    /** Simulierte Sekunden pro echter Sekunde. */
    speedIndex: number;
    follow?: 'earth' | 'moon' | 'sun' | 'none';
  };
  chapter?: number;
}

const BASE: ScenarioParams = { ...REAL_PARAMS, moonDistance: MOON_DISTANCE_KM, moonSpeed: 1 };
const RH = EARTH_HILL_RADIUS / KM;

export const SPEEDS = [
  { label: '1 Tag/s', value: 86_400 },
  { label: '1 Woche/s', value: 7 * 86_400 },
  { label: '1 Monat/s', value: 30 * 86_400 },
  { label: '1 Jahr/s', value: 365.25 * 86_400 },
  { label: '5 Jahre/s', value: 5 * 365.25 * 86_400 },
  { label: '25 Jahre/s', value: 25 * 365.25 * 86_400 },
] as const;

export const PRESETS: readonly Preset[] = [
  {
    id: 'real',
    title: 'Reales System',
    description:
      'Erde, Mond und Sonne mit den gemessenen Werten: Mondbahn mit Exzentrizität 0,055, Start im Perigäum. Die Bahn dreht sich langsam (Apsidendrehung, 8,85 Jahre).',
    params: REAL_PARAMS,
    view: { frame: 'earth', radius: 6e8, speedIndex: 1 },
  },
  {
    id: 'zwei-koerper',
    title: 'Ohne Sonne (Zwei-Körper-Problem)',
    description:
      'Nur Erde und Mond. Die Ellipse ist exakt geschlossen und dreht sich nicht – jede Veränderung im realen System stammt von der Sonne.',
    params: { ...REAL_PARAMS, sunMass: 0 },
    view: { frame: 'earth', radius: 6e8, speedIndex: 1 },
    chapter: 3,
  },
  {
    id: 'absturz',
    title: 'Zu langsam: Absturz',
    description:
      'Der Mond hat nur 15 % der Kreisbahngeschwindigkeit. Seine Bahn wird eine schmale Ellipse, deren erdnächster Punkt unter der Erdoberfläche liegt.',
    params: { ...BASE, moonSpeed: 0.15 },
    view: { frame: 'earth', radius: 5e8, speedIndex: 0 },
    chapter: 8,
  },
  {
    id: 'roche',
    title: 'Knapp vorbei: Roche-Grenze',
    description:
      'Mit 27 % der Kreisbahngeschwindigkeit verfehlt der Mond die Erde, taucht aber tief unter die Roche-Grenze – Gezeitenkräfte würden ihn zerreißen.',
    params: { ...BASE, moonSpeed: 0.27 },
    view: { frame: 'earth', radius: 5e8, speedIndex: 0 },
    chapter: 8,
  },
  {
    id: 'flucht',
    title: 'Zu schnell: Flucht',
    description:
      'Mit 130 % der Kreisbahngeschwindigkeit reicht der Mond fast bis an die Hill-Grenze. Dort übernimmt die Sonne – obwohl er langsamer ist als die Fluchtgeschwindigkeit (141 %).',
    params: { ...BASE, moonSpeed: 1.3 },
    view: { frame: 'rotating', radius: 3.5e9, speedIndex: 1 },
    chapter: 8,
  },
  {
    id: 'grenze',
    title: 'Am Rand der Stabilität',
    description:
      'Kreisbahn bei 0,45 Hill-Radien – knapp innerhalb der Stabilitätsgrenze (≈ 0,49 Hill-Radien). Die Sonne verformt die Bahn stark, aber der Mond bleibt.',
    params: { ...BASE, moonDistance: 0.45 * RH },
    view: { frame: 'rotating', radius: 2.2e9, speedIndex: 3 },
    chapter: 5,
  },
  {
    id: 'jenseits',
    title: 'Jenseits der Grenze',
    description:
      'Kreisbahn bei 0,55 Hill-Radien. Nach wenigen Umläufen schlüpft der Mond durch das "Tor" bei L1 oder L2 und umkreist danach die Sonne.',
    params: { ...BASE, moonDistance: 0.55 * RH },
    view: { frame: 'rotating', radius: 3e9, speedIndex: 3 },
    chapter: 8,
  },
  {
    id: 'retrograd',
    title: 'Retrograder Mond bei 0,7 Hill-Radien',
    description:
      'Ein rückwärts kreisender Mond ist auch bei 0,7 Hill-Radien noch stabil – ein prograder würde dort sofort entkommen. Vergleiche mit "Jenseits der Grenze".',
    params: { ...BASE, moonDistance: 0.7 * RH, moonRetrograde: true },
    view: { frame: 'rotating', radius: 2.5e9, speedIndex: 3 },
    chapter: 5,
  },
  {
    id: 'merkurbahn',
    title: 'Erde auf der Merkurbahn',
    description:
      'Bei 0,39 AE schrumpft der Hill-Radius auf 580.000 km. Der Mond steht jetzt bei 0,66 Hill-Radien – weit jenseits der Grenze.',
    params: { ...BASE, earthOrbit: 0.387, earthEccentricity: 0 },
    view: { frame: 'rotating', radius: 1.6e9, speedIndex: 2 },
    chapter: 8,
  },
  {
    id: 'schwere-sonne',
    title: 'Achtfache Sonnenmasse',
    description:
      'Der Hill-Radius wächst mit ∛(m/M): Bei 8-facher Sonnenmasse halbiert er sich. Der Mond wird herausgerissen.',
    params: { ...BASE, sunMass: 8 },
    view: { frame: 'rotating', radius: 1.6e9, speedIndex: 2 },
    chapter: 8,
  },
  {
    id: 'exzentrisch',
    title: 'Stark elliptische Erdbahn',
    description:
      'Exzentrizität 0,6: Im Perihel (0,4 AE) ist der Hill-Radius nur noch 40 % so groß. Der Mond überlebt, bis die Erde der Sonne zu nahe kommt.',
    params: { ...BASE, earthEccentricity: 0.6 },
    view: { frame: 'rotating', radius: 2e9, speedIndex: 2 },
    chapter: 8,
  },
  {
    id: 'teilchen',
    title: 'Teilchenwolke: Wo endet die Stabilität?',
    description:
      '300 masselose Testteilchen auf Kreisbahnen von 60.000 bis 1,4 Mio. km. Nach wenigen Jahren bleiben nur die inneren – die Grenze liegt bei etwa der Hälfte des Hill-Radius.',
    params: {
      ...REAL_PARAMS,
      particles: { count: 300, innerKm: 60_000, outerKm: 1_400_000, retrograde: false },
    },
    view: { frame: 'rotating', radius: 2.4e9, speedIndex: 2 },
    chapter: 5,
  },
  {
    id: 'teilchen-retro',
    title: 'Teilchenwolke rückläufig',
    description:
      'Dieselbe Wolke, aber alle Teilchen kreisen rückwärts. Deutlich mehr überleben – retrograde Bahnen sind bis fast zum Hill-Radius stabil.',
    params: {
      ...REAL_PARAMS,
      particles: { count: 300, innerKm: 60_000, outerKm: 1_400_000, retrograde: true },
    },
    view: { frame: 'rotating', radius: 2.4e9, speedIndex: 2 },
    chapter: 5,
  },
  {
    id: 'vorbeiflug',
    title: 'Vorbeiflug eines Schurkenplaneten',
    description:
      'Ein Planet mit Jupitermasse rast mit 20 km/s in 500.000 km Abstand an der Erde vorbei. Seine Gezeitenkraft reißt den Mond aus der Bahn.',
    params: { ...BASE, intruder: { mass: 317.8, distance: 500_000, speed: 20, leadDays: 20 } },
    view: { frame: 'earth', radius: 3e9, speedIndex: 0 },
    chapter: 8,
  },
  {
    id: 'doppelplanet',
    title: 'Doppelplanet',
    description:
      'Der Mond hat 40-fache Masse (halbe Erdmasse). Der gemeinsame Schwerpunkt liegt nun weit außerhalb der Erde – beide umkreisen ihn.',
    params: { ...BASE, moonMass: 40 },
    view: { frame: 'inertial', radius: 5e8, speedIndex: 1, follow: 'earth' },
    chapter: 2,
  },
  {
    id: 'mondbahn-sonne',
    title: 'Die Mondbahn um die Sonne',
    description:
      'Im ruhenden System der Sonne betrachtet macht der Mond keine Schleifen: Seine Bahn ist überall zur Sonne hin gekrümmt – weil die Sonne ihn stärker anzieht als die Erde.',
    params: REAL_PARAMS,
    view: { frame: 'inertial', radius: 1.6e11, speedIndex: 3, follow: 'none' },
    chapter: 3,
  },
  {
    id: 'euler',
    title: 'Numerik-Falle: Euler-Verfahren',
    description:
      'Dieselbe stabile Mondbahn, gerechnet mit dem einfachen Euler-Verfahren und festen 6-Stunden-Schritten: Der Mond spiralt nach außen. Das ist kein physikalischer Effekt, sondern ein Rechenfehler.',
    params: { ...REAL_PARAMS, sunMass: 0 },
    settings: { integrator: 'euler', adaptive: false, fixedDt: 6 * 3600 },
    view: { frame: 'earth', radius: 1.2e9, speedIndex: 2 },
    chapter: 0,
  },
];

export function findPreset(id: string | null): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}
