import { EARTH, G0, MOON, type Body } from './world';

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
  | 'booster'
  | 'nose'
  | 'airbrake'
  | 'wheel'
  | 'rcs';

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
  /** Vakuumtriebwerk: in dichter Luft sinkt der Schub. */
  vacuum?: boolean;
  /** Fallschirm: Bremsfläche im Vergleich zum normalen Schirm. */
  chuteArea?: number;
  /** Eingebauter Hitzeschutz: Anteil der Hitze, der noch ankommt. */
  heatProtect?: number;
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
    id: 'kapsel-xl',
    name: 'Kapsel Aurora',
    kind: 'capsule',
    width: 3.2,
    height: 2.8,
    dry: 3200,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 150,
    heatProtect: 0.5,
    info: 'Große Kapsel für drei Personen mit eingebautem Hitzeschutz: Beim Wiedereintritt kommt nur die Hälfte der Hitze an.',
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
    id: 'fallschirm-xl',
    name: 'Großer Fallschirm',
    kind: 'chute',
    width: 1.8,
    height: 0.9,
    dry: 260,
    fuel: 0,
    thrust: 0,
    isp: 0,
    chuteArea: 2.5,
    info: 'Zweieinhalbmal so viel Bremsfläche wie der normale Schirm – für schwere Kapseln und die dünne Marsluft.',
  },
  {
    id: 'nase',
    name: 'Nasenkegel',
    kind: 'nose',
    width: 2.4,
    height: 1.8,
    dry: 80,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Spitze Verkleidung für ganz oben (z. B. auf Satelliten oder Sonden): halbiert den Luftwiderstand beim Aufstieg.',
  },
  {
    id: 'luftbremse',
    name: 'Luftbremse',
    kind: 'airbrake',
    width: 2.4,
    height: 0.5,
    dry: 150,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Klappen, die sich mit U ausfahren lassen: bremsen in der Luft stark ab – ideal vor der Landung auf dem Mars.',
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
    id: 'tank-xs',
    name: 'Tank XS',
    kind: 'tank',
    width: 2.4,
    height: 1.2,
    dry: 160,
    fuel: 1100,
    thrust: 0,
    isp: 0,
    info: 'Winziger Tank (1,1 t) zum Feinabstimmen.',
  },
  {
    id: 'tank-sonde',
    name: 'Sondentank',
    kind: 'tank',
    width: 1.4,
    height: 2.2,
    dry: 110,
    fuel: 800,
    thrust: 0,
    isp: 0,
    info: 'Schmaler Tank (0,8 t) passend zum Sondenkern – für leichte Sonden mit Spatz- oder Ionentriebwerk.',
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
    id: 'tank-xxl',
    name: 'Tank XXL',
    kind: 'tank',
    width: 3.2,
    height: 16,
    dry: 2900,
    fuel: 32_000,
    thrust: 0,
    isp: 0,
    unlock: 300,
    info: 'Der größte Tank (32 t) – zusammen mit dem Mammut eine Schwerlast-Erststufe.',
  },
  {
    id: 'spatz',
    name: 'Triebwerk Spatz',
    kind: 'engine',
    width: 1.2,
    height: 0.8,
    dry: 120,
    fuel: 0,
    thrust: 16_000,
    isp: 325,
    info: 'Das kleinste Triebwerk: leicht und sparsam für Sonden und Mini-Lander auf Mond, Phobos oder Europa.',
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
    id: 'nova',
    name: 'Vakuumtriebwerk Nova',
    kind: 'engine',
    width: 2.2,
    height: 3,
    dry: 1100,
    fuel: 0,
    thrust: 220_000,
    isp: 365,
    vacuum: true,
    unlock: 150,
    info: 'Riesige Düse für den Weltraum: sehr sparsam im Vakuum, aber in dichter Luft verliert es über die Hälfte seines Schubs. Für Oberstufen.',
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
    id: 'booster-xl',
    name: 'Großbooster (Paar)',
    kind: 'booster',
    width: 2.4,
    height: 0.5,
    dry: 3000,
    fuel: 18_000,
    thrust: 720_000,
    isp: 280,
    unlock: 150,
    info: 'Doppelt so große Feststoff-Booster: 720 kN extra für schwere Raketen. Fallen mit ihrer Stufe ab.',
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
  {
    id: 'rad',
    name: 'Reaktionsrad',
    kind: 'wheel',
    width: 2.0,
    height: 0.5,
    dry: 150,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Ein schnell drehendes Schwungrad: Die Rakete dreht sich knapp um die Hälfte schneller (mit zwei Rädern fast doppelt so schnell) – auch ohne Luft und ohne Treibstoff.',
  },
  {
    id: 'rcs-block',
    name: 'RCS-Block',
    kind: 'rcs',
    width: 2.4,
    height: 0.6,
    dry: 120,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Vier zusätzliche Lagekontrolldüsen: RCS schiebt viermal so kräftig – praktisch zum Andocken schwerer Raketen.',
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

export const MAX_PARTS = 32;

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
  {
    id: 'pfeil',
    name: 'Pfeil',
    info: 'Schlanker Satellitenträger mit Nasenkegel (halber Luftwiderstand) und Vakuum-Oberstufe Nova.',
    parts: ['nase', 'satellit', 'sonde', 'tank-m', 'nova', 'trenner', 'tank-l', 'tank-m', 'titan'],
  },
  {
    id: 'aurora',
    name: 'Aurora (Mars)',
    info: 'Drei Personen zum Mars: großer Fallschirm, Luftbremsen, Reaktionsrad und Schwerlast-Erststufe mit Großboostern.',
    parts: [
      'fallschirm-xl',
      'kapsel-xl',
      'rad',
      'rcs-block',
      'tank-m',
      'luftbremse',
      'beine',
      'falke',
      'trenner',
      'tank-l',
      'tank-m',
      'nova',
      'trenner',
      'tank-xl',
      'mammut',
      'booster-xl',
    ],
  },
  {
    id: 'spatzsonde',
    name: 'Spatz-Sonde',
    info: 'Winzige Sonde mit Sondentank und Spatz-Triebwerk auf einer kleinen Trägerrakete – landet auf Phobos oder Europa.',
    parts: [
      'nase',
      'sonde',
      'tank-sonde',
      'beine',
      'spatz',
      'trenner',
      'tank-m',
      'falke',
      'trenner',
      'tank-l',
      'titan',
    ],
  },
];

/** Anteil der Bremsfläche, wenn ein Fallschirm erst halb (gerefft) offen ist. */
export const CHUTE_SEMI = 0.12;

/**
 * Wie weit ein offener Schirm über die Spitze hinausragt (m) – Fangleinen plus Kappe, genau wie
 * gezeichnet. `open`: 0…1, `area`: Bremsfläche (1 = normaler Schirm).
 */
export function chuteExtent(open: number, area = 1): number {
  const k = Math.sqrt(Math.max(1, area));
  const full = Math.min(1, Math.max(0, (open - CHUTE_SEMI) / (1 - CHUTE_SEMI)));
  return (10 + 8 * full) * Math.sqrt(k) + (3.6 + 1.4 * full) * k * 1.1;
}

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
  /** … und auf dem Startkörper (ohne Sandkasten: die Erde). */
  twrStart: number;
  burnTime: number;
}

/** Sandkasten-Regeln, die die Werte der Werft ändern. */
export interface BuildRules {
  /** Schubfaktor (Verbrauch wächst mit). */
  thrust: number;
  /** Treibstoff wird nicht verbraucht: Δv und Brenndauer unbegrenzt. */
  infiniteFuel: boolean;
  /** Wo der Flug beginnt (für das Schub-Gewichts-Verhältnis). */
  body: Body;
}

export function stageStats(design: Design, rules?: BuildRules): StageStats[] {
  const k = rules?.thrust ?? 1;
  const endless = rules?.infiniteFuel ?? false;
  const home = rules?.body ?? EARTH;
  const gStart = home.mu / home.radius ** 2;
  const segs = segments(design);
  const stats: StageStats[] = [];
  let above = 0;
  for (const seg of segs) {
    const defs = seg.map(part);
    const dry = defs.reduce((s, p) => s + p.dry, 0);
    const fuel = defs.reduce((s, p) => s + p.fuel, 0);
    const thrust = k * defs.reduce((s, p) => s + p.thrust, 0);
    const flow = k * defs.reduce((s, p) => s + (p.thrust > 0 ? p.thrust / (p.isp * G0) : 0), 0);
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
      deltaV:
        thrust > 0 && fuel > 0
          ? endless
            ? Infinity
            : isp * G0 * Math.log(startMass / endMass)
          : 0,
      twrEarth: thrust / (startMass * gEarth),
      twrMoon: thrust / (startMass * gMoon),
      twrStart: thrust / (startMass * gStart),
      burnTime: flow > 0 && fuel > 0 ? (endless ? Infinity : fuel / flow) : 0,
    });
    above += dry + fuel;
  }
  // Zündreihenfolge: unterste Stufe zuerst.
  stats.reverse();
  stats.forEach((s, i) => (s.number = i + 1));
  return stats;
}

export function totalDeltaV(design: Design, rules?: BuildRules): number {
  return stageStats(design, rules).reduce((s, st) => s + st.deltaV, 0);
}

export function totalMass(design: Design): number {
  return design.reduce((s, id) => s + part(id).dry + part(id).fuel, 0);
}

export function designHeight(design: Design): number {
  return design.reduce((s, id) => s + part(id).height, 0);
}

export type DesignProblem = { level: 'error' | 'warn'; text: string };

export function checkDesign(design: Design, rules?: BuildRules): DesignProblem[] {
  const problems: DesignProblem[] = [];
  if (design.length === 0) return [{ level: 'error', text: 'Die Rakete hat noch keine Teile.' }];
  if (!design.some(isControl))
    problems.push({
      level: 'error',
      text: 'Es fehlt eine Kapsel oder ein Sondenkern – wer soll die Rakete steuern?',
    });
  const stats = stageStats(design, rules);
  const first = stats[0]!;
  const home = rules?.body ?? EARTH;
  if (first.thrust === 0)
    problems.push({ level: 'error', text: 'Ganz unten muss ein Triebwerk sitzen.' });
  else if (first.fuel === 0)
    problems.push({ level: 'error', text: 'Die unterste Stufe hat keinen Tank.' });
  else if (first.twrStart < 1)
    problems.push({
      level: 'warn',
      text: `Zu schwer: Der Schub der ersten Stufe trägt ${home === EARTH ? '' : `am Startort (${home.name}) `}nur ${Math.round(first.twrStart * 100)} % des Gewichts. Die Rakete hebt nicht ab.`,
    });
  if (design.slice(1).some((id) => part(id).kind === 'nose'))
    problems.push({
      level: 'warn',
      text: 'Ein Nasenkegel wirkt nur ganz oben – weiter unten ist er nur Ballast.',
    });
  if (design[design.length - 1] && part(design[design.length - 1]!).kind === 'decoupler')
    problems.push({ level: 'warn', text: 'Ganz unten hängt ein Stufentrenner ohne Stufe.' });
  const has = (kind: PartKind): boolean => design.some((id) => part(id).kind === kind);
  if (has('capsule') && !has('chute'))
    problems.push({
      level: 'warn',
      text: 'Ohne Fallschirm ist eine Landung auf der Erde nur mit Triebwerk möglich.',
    });
  if (design.length > MAX_PARTS)
    problems.push({ level: 'error', text: `Höchstens ${MAX_PARTS} Teile.` });
  // Jeder Hitzeschild braucht einen Stufentrenner direkt darunter (oder sitzt ganz unten).
  const buried = design.some(
    (id, i) =>
      part(id).kind === 'shield' &&
      i < design.length - 1 &&
      part(design[i + 1]!).kind !== 'decoupler',
  );
  if (buried)
    problems.push({
      level: 'warn',
      text: 'Ein Hitzeschild wirkt nur als unterstes Teil: Setze einen Stufentrenner direkt darunter, damit er beim Wiedereintritt vorn ist.',
    });
  return problems;
}
