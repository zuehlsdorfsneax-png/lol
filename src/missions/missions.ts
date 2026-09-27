import {
  EARTH_HILL_RADIUS,
  KM,
  REAL_PARAMS,
  YEAR,
  type OrbitalElements,
  type ScenarioParams,
} from '../physics';
import type { FrameId } from '../sim/view';

/** Ergebnis eines Missionslaufs. */
export interface RunResult {
  outcome: 'stable' | 'crash' | 'escape' | 'sun' | 'collision';
  time: number;
  elements: OrbitalElements | null;
}

export type ControlKey = 'moonSpeed' | 'moonDistanceRH' | 'earthOrbit' | 'sunMass';

export interface SimMission {
  kind: 'sim';
  id: string;
  title: string;
  chapter: number;
  difficulty: 1 | 2 | 3;
  briefing: string;
  goal: string;
  control: {
    key: ControlKey;
    label: string;
    min: number;
    max: number;
    step: number;
    log?: boolean;
    initial: number;
    format: (v: number) => string;
  };
  base: ScenarioParams;
  years: number;
  /** Sterne (0 = nicht geschafft). */
  score: (r: RunResult, value: number) => number;
  starRules: [string, string, string];
  hint: string;
  explanation: string;
  view: { frame: FrameId; radius: number };
}

export interface SpecialMission {
  kind: 'l1' | 'trojan';
  id: string;
  title: string;
  chapter: number;
  difficulty: 1 | 2 | 3;
  briefing: string;
  goal: string;
  starRules: [string, string, string];
  explanation: string;
}

export type Mission = SimMission | SpecialMission;

const de = (v: number, d = 2): string =>
  v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const BASE: ScenarioParams = { ...REAL_PARAMS, moonDistance: 384_400, moonSpeed: 1, moonAngle: 0 };
const RH_KM = EARTH_HILL_RADIUS / KM;

/** Wendet den Reglerwert auf die Parameter an. */
export function applyControl(m: SimMission, value: number): ScenarioParams {
  switch (m.control.key) {
    case 'moonSpeed':
      return { ...m.base, moonSpeed: value };
    case 'moonDistanceRH':
      return { ...m.base, moonDistance: value * RH_KM };
    case 'earthOrbit':
      return { ...m.base, earthOrbit: value };
    case 'sunMass':
      return { ...m.base, sunMass: value };
  }
}

const stars = (ok: boolean, levels: boolean[]): number =>
  ok ? 1 + levels.filter(Boolean).length : 0;

export const MISSIONS: readonly Mission[] = [
  {
    kind: 'sim',
    id: 'erste-bahn',
    title: 'Die erste Umlaufbahn',
    chapter: 2,
    difficulty: 1,
    briefing:
      'Ein frisch eingefangener Mond steht 384 400 km von der Erde entfernt – die Sonne bleibt vorerst außen vor. Mit welcher Geschwindigkeit muss er starten, damit er die Erde ein Jahr lang umkreist, ohne abzustürzen oder davonzufliegen?',
    goal: 'Ein Jahr in der Umlaufbahn bleiben – je kreisförmiger, desto besser.',
    control: {
      key: 'moonSpeed',
      label: 'Startgeschwindigkeit (× v_Kreis)',
      min: 0.05,
      max: 1.6,
      step: 0.005,
      initial: 0.15,
      format: (v) => `${de(v, 3)} × v_K`,
    },
    base: { ...BASE, sunMass: 0 },
    years: 1,
    score: (r) =>
      stars(r.outcome === 'stable', [(r.elements?.e ?? 1) < 0.1, (r.elements?.e ?? 1) < 0.02]),
    starRules: ['Ein Jahr überstanden', 'Exzentrizität unter 0,1', 'Fast ein Kreis: e < 0,02'],
    hint: 'Auf einer Kreisbahn ist die Anziehung genau die nötige Zentripetalkraft: v = √(GM/r).',
    explanation:
      'Bei v = 1 · v_K ist die Gravitation genau die Zentripetalkraft – die Bahn ist ein Kreis. Langsamer wird sie eine Ellipse mit dem Start als erdfernstem Punkt, schneller eine Ellipse mit dem Start als erdnächstem Punkt. Ab √2 · v_K ist der Mond ungebunden.',
    view: { frame: 'earth', radius: 7e8 },
  },
  {
    kind: 'sim',
    id: 'absturz',
    title: 'Mondabsturz',
    chapter: 8,
    difficulty: 2,
    briefing:
      'Wie viel Geschwindigkeit müsste der Mond verlieren, damit er auf die Erde stürzt? Finde die größte Startgeschwindigkeit, bei der er innerhalb von zwei Jahren noch einschlägt.',
    goal: 'Der Mond soll abstürzen – mit möglichst wenig Abbremsung.',
    control: {
      key: 'moonSpeed',
      label: 'Startgeschwindigkeit (× v_Kreis)',
      min: 0,
      max: 1,
      step: 0.0025,
      initial: 0.5,
      format: (v) => `${de(v, 4)} × v_K`,
    },
    base: BASE,
    years: 2,
    score: (r, v) => stars(r.outcome === 'crash', [v >= 0.18, v >= 0.2]),
    starRules: ['Absturz', 'Absturz mit v ≥ 0,18 · v_K', 'Absturz mit v ≥ 0,20 · v_K'],
    hint: 'Der erdnächste Punkt liegt bei r_P = r₀ · f² / (2 − f²). Er muss kleiner als Erd- plus Mondradius (8 108 km) sein.',
    explanation:
      'Aus r_P = r₀ · f²/(2 − f²) < 8 108 km folgt f < 0,203. Der Mond müsste also rund 80 % seiner Geschwindigkeit verlieren. Unterhalb von f ≈ 0,30 würde er schon an der Roche-Grenze zerrissen.',
    view: { frame: 'earth', radius: 5e8 },
  },
  {
    kind: 'sim',
    id: 'flucht',
    title: 'Ausbruch',
    chapter: 8,
    difficulty: 2,
    briefing:
      'Ohne Sonne bräuchte der Mond die 1,414-fache Kreisbahngeschwindigkeit, um der Erde zu entkommen. Mit Sonne geht es billiger. Wie wenig reicht?',
    goal: 'Der Mond soll innerhalb von fünf Jahren entkommen – mit möglichst kleiner Geschwindigkeit.',
    control: {
      key: 'moonSpeed',
      label: 'Startgeschwindigkeit (× v_Kreis)',
      min: 1,
      max: 1.8,
      step: 0.0025,
      initial: 1.1,
      format: (v) => `${de(v, 4)} × v_K`,
    },
    base: BASE,
    years: 5,
    score: (r, v) => stars(r.outcome === 'escape' || r.outcome === 'sun', [v <= 1.3, v <= 1.22]),
    starRules: ['Entkommen', 'Entkommen mit v ≤ 1,30 · v_K', 'Entkommen mit v ≤ 1,22 · v_K'],
    hint: 'Der Mond muss nicht unendlich weit fliegen – es genügt, wenn sein erdfernster Punkt jenseits der Stabilitätsgrenze (≈ 0,48 r_H) liegt.',
    explanation:
      'Schon ab etwa 1,19 · v_K reicht die Ellipse bis 0,62 Hill-Radien. Dort öffnet sich das Tor bei L1 oder L2, und die Gezeitenkraft der Sonne zieht den Mond aus der Erdumgebung – 16 % weniger als die klassische Fluchtgeschwindigkeit.',
    view: { frame: 'rotating', radius: 3.5e9 },
  },
  {
    kind: 'sim',
    id: 'grenzgaenger',
    title: 'Grenzgänger',
    chapter: 5,
    difficulty: 2,
    briefing:
      'Wie weit draußen kann ein Mond auf einer Kreisbahn kreisen, bevor die Sonne ihn entreißt? Setze den Mond so weit hinaus wie möglich – er muss 30 Jahre überstehen.',
    goal: 'Größtmöglicher Abstand (in Hill-Radien), 30 Jahre stabil.',
    control: {
      key: 'moonDistanceRH',
      label: 'Abstand (Hill-Radien)',
      min: 0.1,
      max: 1,
      step: 0.0025,
      initial: 0.3,
      format: (v) => `${de(v, 3)} r_H`,
    },
    base: BASE,
    years: 30,
    score: (r, v) => stars(r.outcome === 'stable', [v >= 0.42, v >= 0.465]),
    starRules: ['30 Jahre stabil', 'Abstand ≥ 0,42 r_H', 'Abstand ≥ 0,465 r_H'],
    hint: 'Numerische Studien (Domingos et al. 2006) finden für prograde Monde eine Grenze bei etwa der Hälfte des Hill-Radius.',
    explanation:
      'Die Simulation findet die Grenze bei 0,478 r_H, Domingos et al. geben 0,481 r_H an. Jenseits davon kann der Mond durch das Tor bei L1/L2 entkommen – die Gezeitenkraft der Sonne wächst mit r³.',
    view: { frame: 'rotating', radius: 2.4e9 },
  },
  {
    kind: 'sim',
    id: 'rueckwaerts',
    title: 'Rückwärts weiter',
    chapter: 5,
    difficulty: 2,
    briefing:
      'Dieser Mond kreist rückläufig (retrograd) um die Erde. Wie weit hinaus kommst du jetzt?',
    goal: 'Größtmöglicher Abstand für einen retrograden Mond, 30 Jahre stabil.',
    control: {
      key: 'moonDistanceRH',
      label: 'Abstand (Hill-Radien)',
      min: 0.1,
      max: 1.1,
      step: 0.0025,
      initial: 0.5,
      format: (v) => `${de(v, 3)} r_H`,
    },
    base: { ...BASE, moonRetrograde: true },
    years: 30,
    score: (r, v) => stars(r.outcome === 'stable', [v >= 0.75, v >= 0.9]),
    starRules: ['30 Jahre stabil', 'Abstand ≥ 0,75 r_H', 'Abstand ≥ 0,90 r_H'],
    hint: 'Die Coriolis-Kraft im rotierenden System zeigt bei retrograden Monden zur Erde hin.',
    explanation:
      'Retrograde Monde sind bis etwa 0,92 r_H stabil – fast doppelt so weit wie prograde. Im mitrotierenden System drückt die Coriolis-Kraft sie zur Erde hin. Im Sonnensystem kreisen tatsächlich viele weit entfernte, eingefangene Monde rückläufig.',
    view: { frame: 'rotating', radius: 2.6e9 },
  },
  {
    kind: 'sim',
    id: 'naeher',
    title: 'Näher an die Sonne',
    chapter: 8,
    difficulty: 3,
    briefing:
      'Stell dir vor, die Erde wäre auf einer Kreisbahn näher an der Sonne entstanden. Wie nah darf sie der Sonne kommen, ohne ihren Mond (384 400 km) zu verlieren?',
    goal: 'Kleinstmöglicher Abstand Erde–Sonne, Mond 30 Jahre stabil.',
    control: {
      key: 'earthOrbit',
      label: 'Abstand Erde–Sonne',
      min: 0.3,
      max: 1.2,
      step: 0.0025,
      initial: 1,
      format: (v) => `${de(v, 3)} AE`,
    },
    base: { ...BASE, earthEccentricity: 0 },
    years: 30,
    score: (r, v) => stars(r.outcome === 'stable' && v <= 0.8, [v <= 0.62, v <= 0.54]),
    starRules: ['Stabil bei ≤ 0,80 AE', 'Stabil bei ≤ 0,62 AE', 'Stabil bei ≤ 0,54 AE'],
    hint: 'Der Hill-Radius wächst linear mit dem Abstand zur Sonne: r_H = a · ∛(m/3M).',
    explanation:
      'Die Grenze liegt bei etwa 0,52 AE: Dort ist der Hill-Radius auf 790 000 km geschrumpft, und der Mond steht bei 0,48 r_H. Auf der Venusbahn (0,72 AE) wäre unser Mond noch sicher, auf der Merkurbahn (0,39 AE) nicht mehr.',
    view: { frame: 'rotating', radius: 1.6e9 },
  },
  {
    kind: 'sim',
    id: 'schwere-sonne',
    title: 'Schwergewicht',
    chapter: 8,
    difficulty: 3,
    briefing:
      'Was wäre, wenn die Sonne schwerer wäre? Erhöhe ihre Masse, so weit es geht – der Mond muss trotzdem 30 Jahre bleiben.',
    goal: 'Größtmögliche Sonnenmasse, Mond 30 Jahre stabil.',
    control: {
      key: 'sunMass',
      label: 'Sonnenmasse',
      min: 1,
      max: 12,
      step: 0.01,
      log: true,
      initial: 1,
      format: (v) => `${de(v, 2)} M☉`,
    },
    base: BASE,
    years: 30,
    score: (r, v) => stars(r.outcome === 'stable' && v >= 2, [v >= 4.5, v >= 6.2]),
    starRules: ['Stabil bei ≥ 2 M☉', 'Stabil bei ≥ 4,5 M☉', 'Stabil bei ≥ 6,2 M☉'],
    hint: 'r_H ∝ M^(−1/3): Achtfache Masse halbiert den Hill-Radius.',
    explanation:
      'Bei etwa 6,5 Sonnenmassen ist der Hill-Radius auf 0,54 seines heutigen Wertes geschrumpft – der Mond stünde bei 0,48 r_H. Die dritte Wurzel macht den Mond erstaunlich robust gegen eine schwerere Sonne.',
    view: { frame: 'rotating', radius: 1.8e9 },
  },
  {
    kind: 'l1',
    id: 'l1',
    title: 'L1-Station',
    chapter: 4,
    difficulty: 3,
    briefing:
      'Deine Sonde soll wie das Sonnenobservatorium SOHO am Lagrange-Punkt L1 zwischen Sonne und Erde bleiben. Doch L1 ist instabil: Jede kleine Abweichung wächst exponentiell. Halte die Sonde mit kurzen Triebwerksstößen in der Zielzone – ein Jahr lang.',
    goal: 'Ein Jahr in der Zielzone um L1 bleiben, sparsam mit Treibstoff.',
    starRules: [
      'Ein halbes Jahr gehalten',
      'Ein ganzes Jahr gehalten',
      'Ein Jahr mit weniger als der Hälfte des Treibstoffs',
    ],
    explanation:
      'Die Abweichung von L1 wächst etwa alle 23 Tage um den Faktor e ≈ 2,7. Echte Sonden fliegen deshalb auf „Halo-Bahnen“ um L1 und korrigieren nur alle paar Wochen um wenige cm/s. Die Coriolis-Kraft lenkt jeden Schub zur Seite ab – deshalb ist Steuern im rotierenden System so ungewohnt.',
  },
  {
    kind: 'trojan',
    id: 'trojaner',
    title: 'Trojaner',
    chapter: 4,
    difficulty: 2,
    briefing:
      'Über 10 000 Asteroiden begleiten Jupiter an den Punkten L4 und L5. Setze einen eigenen Trojaner ins System: Klicke nahe L4 und ziehe, um ihm eine Startgeschwindigkeit zu geben. Er muss 50 Jupiterumläufe (593 Jahre) überstehen, ohne Jupiter nahe zu kommen.',
    goal: 'Ein Asteroid, der 50 Umläufe lang stabil bleibt – je weiter von L4 gestartet, desto mehr Sterne.',
    starRules: [
      '50 Umläufe stabil',
      'Start mehr als 0,05 von L4 entfernt',
      'Start mehr als 0,12 von L4 entfernt',
    ],
    explanation:
      'L4 ist ein Maximum des effektiven Potentials, doch die Coriolis-Kraft lenkt wegrollende Körper auf „Kaulquappen“-Bahnen um den Punkt. Bei größerer Auslenkung entstehen Hufeisenbahnen, die L4, L3 und L5 umfassen. Stabil ist das nur, weil μ(Jupiter) = 0,00095 unter der Routh-Grenze 0,0385 liegt.',
  },
];

export function findMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export const MISSION_YEAR = YEAR;
