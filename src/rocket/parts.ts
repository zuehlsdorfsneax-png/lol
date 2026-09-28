import { EARTH, G0, MOON } from './world';

export type PartKind =
  | 'capsule'
  | 'probe'
  | 'payload'
  | 'chute'
  | 'shield'
  | 'tank'
  | 'engine'
  | 'decoupler'
  | 'legs'
  | 'booster';

/** Aussehen der Triebwerksflamme. */
export type FlameKind = 'chemisch' | 'atom' | 'ionen';

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
  /** Ab so vielen Punkten freigeschaltet (im Sandkasten immer). */
  unlock?: number;
  flame?: FlameKind;
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
    info: 'Hier sitzt die Crew. Jede Rakete braucht eine Kapsel oder einen Sondenkern.',
  },
  {
    id: 'sonde',
    name: 'Sondenkern',
    kind: 'probe',
    width: 1.4,
    height: 0.9,
    dry: 150,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Ein Bordcomputer statt Crew: steuert unbemannte Sonden. Leicht – aber ohne Menschen an Bord zählt keine Heimkehr.',
  },
  {
    id: 'satellit',
    name: 'Satellit',
    kind: 'payload',
    width: 2.0,
    height: 1.8,
    dry: 500,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Nutzlast: Im Flug mit N aussetzen – dann kreist er allein weiter und bleibt auch für spätere Flüge auf seiner Bahn.',
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
    id: 'hitzeschild',
    name: 'Hitzeschild',
    kind: 'shield',
    width: 2.6,
    height: 0.35,
    dry: 300,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Schluckt drei Viertel der Hitze beim Wiedereintritt – aber nur, wenn er vorn ist: als unterstes Teil der Rakete und mit dem Boden voran (SAS: retrograd).',
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
    id: 'tank-xl',
    name: 'Tank XL',
    kind: 'tank',
    width: 3.2,
    height: 11,
    dry: 1900,
    fuel: 21_000,
    thrust: 0,
    isp: 0,
    unlock: 150,
    info: 'Riesentank (21 t) mit 3,2 m Durchmesser – für schwere Erststufen.',
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
    id: 'mammut',
    name: 'Triebwerk Mammut',
    kind: 'engine',
    width: 3.2,
    height: 3.2,
    dry: 4500,
    fuel: 0,
    thrust: 1_500_000,
    isp: 290,
    unlock: 150,
    info: 'Das stärkste Triebwerk: 1.500 kN hebt auch die schwersten Raketen von der Rampe.',
  },
  {
    id: 'atom',
    name: 'Atomtriebwerk',
    kind: 'engine',
    width: 1.8,
    height: 2.8,
    dry: 3000,
    fuel: 0,
    thrust: 60_000,
    isp: 800,
    unlock: 300,
    flame: 'atom',
    info: 'Ein Kernreaktor heizt Wasserstoff auf: fast dreimal so sparsam wie chemische Triebwerke, aber schwer und schwach. Für lange Reisen im All.',
  },
  {
    id: 'ionen',
    name: 'Ionentriebwerk',
    kind: 'engine',
    width: 1.2,
    height: 0.9,
    dry: 400,
    fuel: 0,
    thrust: 4_000,
    isp: 4200,
    unlock: 550,
    flame: 'ionen',
    info: 'Beschleunigt geladene Teilchen mit Strom: extrem sparsam, aber mit winzigem Schub. Brennt dafür stundenlang – bei schwachem Schub ist Zeitraffer bis 100× erlaubt.',
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

/** Ist das Teil bei so vielen Punkten schon freigeschaltet? */
export function unlocked(id: string, points: number, sandbox = false): boolean {
  return sandbox || points >= (part(id).unlock ?? 0);
}

/** Steuert ein Teil die Rakete (Kapsel oder Sondenkern)? */
export function isControl(id: string): boolean {
  const k = part(id).kind;
  return k === 'capsule' || k === 'probe';
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
    id: 'satnet',
    name: 'Satellitenträger',
    info: 'Unbemannt mit drei Satelliten: in die Umlaufbahn, dann nacheinander aussetzen (N) – fertig ist das Satellitennetz.',
    parts: [
      'satellit',
      'satellit',
      'satellit',
      'sonde',
      'tank-m',
      'falke',
      'trenner',
      'tank-l',
      'titan',
    ],
  },
  {
    id: 'selene',
    name: 'Selene (Mond)',
    info: 'Mondrakete mit Hitzeschild: Die Landefähre bleibt vor dem Wiedereintritt zurück, die Kapsel taucht mit dem Schild voran ein.',
    parts: [
      'fallschirm',
      'kapsel',
      'hitzeschild',
      'trenner',
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
    id: 'jupiter',
    name: 'Jupiter-Sonde',
    info: 'Unbemannte Sonde mit Atomtriebwerk und Satellit – für Jupiter und seinen Eismond Europa.',
    parts: [
      'sonde',
      'satellit',
      'tank-m',
      'beine',
      'kolibri',
      'trenner',
      'tank-l',
      'atom',
      'trenner',
      'tank-xl',
      'tank-l',
      'titan',
      'trenner',
      'tank-xl',
      'booster',
      'tank-xl',
      'mammut',
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
  if (!design.some(isControl))
    problems.push({
      level: 'error',
      text: 'Es fehlt eine Kapsel oder ein Sondenkern – wer soll die Rakete steuern?',
    });
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
  if (design.includes('kapsel') && !design.includes('fallschirm'))
    problems.push({
      level: 'warn',
      text: 'Ohne Fallschirm ist eine Landung auf der Erde nur mit Triebwerk möglich.',
    });
  if (design.length > MAX_PARTS)
    problems.push({ level: 'error', text: `Höchstens ${MAX_PARTS} Teile.` });
  const shield = design.indexOf('hitzeschild');
  if (shield >= 0 && shield < design.length - 1 && part(design[shield + 1]!).kind !== 'decoupler')
    problems.push({
      level: 'warn',
      text: 'Der Hitzeschild wirkt nur als unterstes Teil: Setze einen Stufentrenner direkt darunter, damit er beim Wiedereintritt vorn ist.',
    });
  return problems;
}
