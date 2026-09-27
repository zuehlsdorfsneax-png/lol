import { EARTH, G0, MOON } from './world';

export type PartKind = 'capsule' | 'chute' | 'tank' | 'engine' | 'decoupler' | 'legs' | 'booster';

export interface PartDef {
  id: string;
  name: string;
  kind: PartKind;
  /** Abmessungen in m. */
  width: number;
  height: number;
  /** Leermasse und Treibstoff in kg. */
  dry: number;
  fuel: number;
  /** Schub in N (Vakuum) und spezifischer Impuls in s. */
  thrust: number;
  isp: number;
  info: string;
}

export const PARTS: readonly PartDef[] = [
  {
    id: 'kapsel',
    name: 'Kapsel',
    kind: 'capsule',
    width: 2.4,
    height: 2.2,
    dry: 1200,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Hier sitzt die Crew. Ohne Kapsel startet keine Rakete.',
  },
  {
    id: 'fallschirm',
    name: 'Fallschirm',
    kind: 'chute',
    width: 1.1,
    height: 0.7,
    dry: 100,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Bremst in der Erdatmosphäre auf Landegeschwindigkeit. Auf dem Mond wirkungslos – dort gibt es keine Luft.',
  },
  {
    id: 'tank-s',
    name: 'Tank S',
    kind: 'tank',
    width: 2.4,
    height: 2.4,
    dry: 300,
    fuel: 2400,
    thrust: 0,
    isp: 0,
    info: 'Kleiner Treibstofftank (2,4 t).',
  },
  {
    id: 'tank-m',
    name: 'Tank M',
    kind: 'tank',
    width: 2.4,
    height: 4.8,
    dry: 550,
    fuel: 5000,
    thrust: 0,
    isp: 0,
    info: 'Mittlerer Tank (5 t).',
  },
  {
    id: 'tank-l',
    name: 'Tank L',
    kind: 'tank',
    width: 2.4,
    height: 9.6,
    dry: 1000,
    fuel: 10_000,
    thrust: 0,
    isp: 0,
    info: 'Großer Tank (10 t).',
  },
  {
    id: 'kolibri',
    name: 'Triebwerk Kolibri',
    kind: 'engine',
    width: 1.6,
    height: 1.2,
    dry: 350,
    fuel: 0,
    thrust: 45_000,
    isp: 330,
    info: 'Klein und sparsam – ideal zum Landen auf dem Mond. Zu schwach für den Start von der Erde.',
  },
  {
    id: 'falke',
    name: 'Triebwerk Falke',
    kind: 'engine',
    width: 2.0,
    height: 1.8,
    dry: 900,
    fuel: 0,
    thrust: 180_000,
    isp: 310,
    info: 'Das Allround-Triebwerk für Oberstufen.',
  },
  {
    id: 'titan',
    name: 'Triebwerk Titan',
    kind: 'engine',
    width: 2.4,
    height: 2.6,
    dry: 2200,
    fuel: 0,
    thrust: 620_000,
    isp: 285,
    info: 'Sehr viel Schub für die erste Stufe, aber durstig.',
  },
  {
    id: 'trenner',
    name: 'Stufentrenner',
    kind: 'decoupler',
    width: 2.4,
    height: 0.45,
    dry: 100,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Wirft beim Zünden der nächsten Stufe alles darunter ab. So muss die Rakete leere Tanks nicht mitschleppen.',
  },
  {
    id: 'booster',
    name: 'Seitenbooster (Paar)',
    kind: 'booster',
    width: 2.4,
    height: 0.4,
    dry: 1600,
    fuel: 9000,
    thrust: 360_000,
    isp: 275,
    info: 'Zwei Feststoff-Booster links und rechts. Sie zünden mit ihrer Stufe und fallen mit ihr ab – ideal als Starthilfe unten an der ersten Stufe.',
  },
  {
    id: 'beine',
    name: 'Landebeine',
    kind: 'legs',
    width: 2.4,
    height: 0.6,
    dry: 200,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Federn die Landung ab: erlauben bis 14 m/s statt 8 m/s und mehr Schräglage. Gehören in die unterste Stufe, direkt über das Triebwerk.',
  },
];

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export function part(id: string): PartDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unbekanntes Bauteil: ${id}`);
  return p;
}

export function isPart(id: string): boolean {
  return BY_ID.has(id);
}

/** Eine Rakete: Bauteile von oben nach unten. */
export type Design = string[];

export const MAX_PARTS = 24;

export interface Template {
  id: string;
  name: string;
  info: string;
  parts: Design;
}

export const TEMPLATES: readonly Template[] = [
  {
    id: 'huepfer',
    name: 'Hüpfer',
    info: 'Einstufig: fliegt ins Weltall und landet am Fallschirm wieder – für den Einstieg.',
    parts: ['fallschirm', 'kapsel', 'tank-m', 'falke'],
  },
  {
    id: 'orbiter',
    name: 'Orbiter',
    info: 'Zwei Stufen – genug für eine Umlaufbahn um die Erde.',
    parts: ['fallschirm', 'kapsel', 'tank-m', 'falke', 'trenner', 'tank-l', 'titan'],
  },
  {
    id: 'saturn',
    name: 'Mond-Riese',
    info: 'Große Mondrakete mit Seitenboostern: viel Reserve für Landung, Rückflug und Umwege.',
    parts: [
      'fallschirm',
      'kapsel',
      'tank-m',
      'beine',
      'kolibri',
      'trenner',
      'tank-l',
      'falke',
      'trenner',
      'tank-l',
      'booster',
      'tank-l',
      'titan',
    ],
  },
  {
    id: 'ares',
    name: 'Ares (Mars)',
    info: 'Für den Flug zum Mars: große Transferstufe, Landefähre mit Fallschirm und Beinen. Reicht bis zur Marslandung.',
    parts: [
      'fallschirm',
      'kapsel',
      'tank-m',
      'beine',
      'kolibri',
      'trenner',
      'tank-l',
      'tank-m',
      'falke',
      'trenner',
      'tank-l',
      'booster',
      'tank-l',
      'booster',
      'titan',
    ],
  },
  {
    id: 'faehre',
    name: 'Stationsfähre',
    info: 'Leichte Fähre für das Andocken an der Raumstation Kepler in 150 km Höhe.',
    parts: ['fallschirm', 'kapsel', 'tank-s', 'kolibri', 'trenner', 'tank-l', 'titan'],
  },
  {
    id: 'luna',
    name: 'Luna 1',
    info: 'Drei Stufen mit Mondlandefähre: hin zum Mond, landen und zurück.',
    parts: [
      'fallschirm',
      'kapsel',
      'tank-m',
      'beine',
      'kolibri',
      'trenner',
      'tank-l',
      'falke',
      'trenner',
      'tank-l',
      'tank-l',
      'titan',
    ],
  },
];

/** Aufteilung in Stufen: Segment 0 ist die Spitze, das letzte Segment brennt zuerst. */
export function segments(design: Design): Design[] {
  const out: Design[] = [[]];
  for (const id of design) {
    if (part(id).kind === 'decoupler' && out[out.length - 1]!.length > 0) out.push([]);
    out[out.length - 1]!.push(id);
  }
  return out;
}

export interface StageStats {
  /** Nummer der Stufe in Zündreihenfolge (1 = zuerst). */
  number: number;
  parts: Design;
  dry: number;
  fuel: number;
  thrust: number;
  /** Mittlerer spezifischer Impuls aller Triebwerke der Stufe. */
  isp: number;
  /** Masse beim Zünden (inklusive aller Stufen darüber). */
  startMass: number;
  deltaV: number;
  /** Schub-Gewichts-Verhältnis beim Zünden auf Erde und Mond. */
  twrEarth: number;
  twrMoon: number;
  burnTime: number;
}

export function stageStats(design: Design): StageStats[] {
  const segs = segments(design);
  const stats: StageStats[] = [];
  let above = 0;
  for (const seg of segs) {
    const defs = seg.map(part);
    const dry = defs.reduce((s, p) => s + p.dry, 0);
    const fuel = defs.reduce((s, p) => s + p.fuel, 0);
    const thrust = defs.reduce((s, p) => s + p.thrust, 0);
    const flow = defs.reduce((s, p) => s + (p.thrust > 0 ? p.thrust / (p.isp * G0) : 0), 0);
    const isp = flow > 0 ? thrust / (flow * G0) : 0;
    const startMass = above + dry + fuel;
    const endMass = startMass - fuel;
    const gEarth = EARTH.mu / EARTH.radius ** 2;
    const gMoon = MOON.mu / MOON.radius ** 2;
    stats.push({
      number: 0,
      parts: seg,
      dry,
      fuel,
      thrust,
      isp,
      startMass,
      deltaV: thrust > 0 && fuel > 0 ? isp * G0 * Math.log(startMass / endMass) : 0,
      twrEarth: thrust / (startMass * gEarth),
      twrMoon: thrust / (startMass * gMoon),
      burnTime: flow > 0 ? fuel / flow : 0,
    });
    above += dry + fuel;
  }
  // Zündreihenfolge: unterste Stufe zuerst.
  stats.reverse();
  stats.forEach((s, i) => (s.number = i + 1));
  return stats;
}

export function totalDeltaV(design: Design): number {
  return stageStats(design).reduce((s, st) => s + st.deltaV, 0);
}

export function totalMass(design: Design): number {
  return design.reduce((s, id) => s + part(id).dry + part(id).fuel, 0);
}

export function designHeight(design: Design): number {
  return design.reduce((s, id) => s + part(id).height, 0);
}

export type DesignProblem = { level: 'error' | 'warn'; text: string };

export function checkDesign(design: Design): DesignProblem[] {
  const problems: DesignProblem[] = [];
  if (design.length === 0) return [{ level: 'error', text: 'Die Rakete hat noch keine Teile.' }];
  if (!design.some((id) => part(id).kind === 'capsule'))
    problems.push({ level: 'error', text: 'Es fehlt eine Kapsel – wer soll denn fliegen?' });
  const stats = stageStats(design);
  const first = stats[0]!;
  if (first.thrust === 0)
    problems.push({ level: 'error', text: 'Ganz unten muss ein Triebwerk sitzen.' });
  else if (first.fuel === 0)
    problems.push({ level: 'error', text: 'Die unterste Stufe hat keinen Tank.' });
  else if (first.twrEarth < 1)
    problems.push({
      level: 'warn',
      text: `Zu schwer: Der Schub der ersten Stufe trägt nur ${Math.round(first.twrEarth * 100)} % des Gewichts. Die Rakete hebt nicht ab.`,
    });
  if (design[design.length - 1] && part(design[design.length - 1]!).kind === 'decoupler')
    problems.push({ level: 'warn', text: 'Ganz unten hängt ein Stufentrenner ohne Stufe.' });
  if (!design.includes('fallschirm'))
    problems.push({
      level: 'warn',
      text: 'Ohne Fallschirm ist eine Landung auf der Erde nur mit Triebwerk möglich.',
    });
  if (design.length > MAX_PARTS)
    problems.push({ level: 'error', text: `Höchstens ${MAX_PARTS} Teile.` });
  return problems;
}
