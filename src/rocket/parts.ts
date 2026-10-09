import { GAME_EARTH, G0, GAME_MOON, enginePressure, type Body } from './world';

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
  | 'rcs'
  | 'solar'
  | 'light'
  | 'fairing'
  | 'fins'
  | 'structure'
  | 'airbag'
  | 'dock';

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
  /** Schub in N und spezifischer Impuls in s, beides im Vakuum. */
  thrust: number;
  isp: number;
  /**
   * Spezifischer Impuls bei 1 bar (Meereshöhe der Erde). Der Massenstrom bleibt gleich, also sinkt
   * der Schub in dichter Luft im selben Verhältnis. Vakuumdüsen verlieren dort mehr als die Hälfte.
   */
  ispSea?: number;
  info: string;
  /** Ab so vielen Punkten freigeschaltet (im Sandkasten immer). */
  unlock?: number;
  flame?: FlameKind;
  /** Vakuumtriebwerk: große Düse, für den Start vom Boden kaum geeignet. */
  vacuum?: boolean;
  /** Fallschirm: Bremsfläche im Vergleich zum normalen Schirm. */
  chuteArea?: number;
  /** Eingebauter Hitzeschutz: Anteil der Hitze, der noch ankommt. */
  heatProtect?: number;
  /** Hitzeschild: Anteil der Hitze, der mit dem Schild voran noch ankommt. */
  shieldFactor?: number;
  /** Landebeine: so schnell (m/s) darf die Rakete aufsetzen. */
  landSpeed?: number;
  /** So schräg (rad) darf die Rakete aufsetzen, wenn das Teil in der aktiven Stufe ist. */
  landTilt?: number;
  /** Tankadapter: Breite der Oberkante (die Unterkante hat `width`). */
  topWidth?: number;
  /** Eingebautes Reaktionsrad (Sondenkern). */
  wheel?: boolean;
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
    id: 'kapsel-mini',
    name: 'Kapsel Spatz',
    kind: 'capsule',
    width: 1.8,
    height: 1.7,
    dry: 650,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 150,
    info: 'Enge Ein-Personen-Kapsel, halb so schwer wie die normale: mehr Δv für weite Reisen. Passt zum kleinen Fallschirm.',
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
    id: 'sonde-xl',
    name: 'Sondenkern Kepler',
    kind: 'probe',
    width: 2.4,
    height: 1.3,
    dry: 480,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 150,
    wheel: true,
    info: 'Großer Sondenkern mit eingebautem Reaktionsrad und großer Antennenschüssel: dreht so flink wie mit einem Rad – passt auf 2,4-m-Tanks.',
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
    id: 'teleskop',
    name: 'Weltraumteleskop',
    kind: 'payload',
    width: 2.2,
    height: 3.6,
    dry: 1100,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 300,
    info: 'Nutzlast wie der Satellit (mit N aussetzen): Über der Luft flimmern die Sterne nicht – das Teleskop sieht schärfer als jedes auf der Erde.',
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
    id: 'fallschirm-s',
    name: 'Sondenfallschirm',
    kind: 'chute',
    width: 0.9,
    height: 0.55,
    dry: 45,
    fuel: 0,
    thrust: 0,
    isp: 0,
    chuteArea: 0.4,
    info: 'Kleiner, leichter Schirm (40 % Fläche) für Sonden und Mini-Lander – bremst einen Sondenkern sicher auf der Erde ab.',
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
    id: 'verkleidung-s',
    name: 'Sondenverkleidung',
    kind: 'fairing',
    width: 1.4,
    height: 2.2,
    dry: 60,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Nutzlastverkleidung für 1,4-m-Sonden, ganz oben: so schlank wie ein Nasenkegel. Sobald die Luft dünn ist (Erde: 30 km), sprengt sie sich ab – ihre 60 kg fliegen nicht mit in die Bahn.',
  },
  {
    id: 'verkleidung',
    name: 'Nutzlastverkleidung',
    kind: 'fairing',
    width: 2.4,
    height: 3.4,
    dry: 220,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Ganz oben über Satellit oder Sonde: halber Luftwiderstand wie mit Nasenkegel. Über der dichten Luft (Erde: 30 km) sprengt sie sich in zwei Hälften ab und spart so 220 kg.',
  },
  {
    id: 'verkleidung-xl',
    name: 'Große Verkleidung',
    kind: 'fairing',
    width: 3.2,
    height: 4.4,
    dry: 420,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 150,
    info: 'Verkleidung für 3,2-m-Raketen: schützt große Nutzlasten beim Aufstieg und wird über der dichten Luft abgeworfen (420 kg).',
  },
  {
    id: 'gitterflossen',
    name: 'Gitterflossen',
    kind: 'fins',
    width: 2.4,
    height: 0.6,
    dry: 160,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 50,
    info: 'Vier Gitterflossen wie bei wiederverwendbaren Erststufen: lenken mit dem Fahrtwind. Je höher der Staudruck, desto schneller dreht die Rakete (bis doppelt so schnell). Im Vakuum ohne Wirkung.',
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
    shieldFactor: 0.25,
    width: 2.6,
    height: 0.35,
    dry: 300,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Schluckt drei Viertel der Hitze beim Wiedereintritt – aber nur, wenn er vorn ist: als unterstes Teil der Rakete und mit dem Boden voran (SAS: retrograd).',
  },
  {
    id: 'hitzeschild-xl',
    name: 'Großer Hitzeschild',
    kind: 'shield',
    width: 3.4,
    height: 0.45,
    dry: 520,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 300,
    shieldFactor: 0.12,
    info: 'Dicker Ablationsschild mit 3,4 m Durchmesser: Mit ihm voran kommt nur ein Achtel der Hitze an – für den schnellen Rückflug vom Mars oder von Jupiter.',
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
    id: 'tank-sonde-l',
    name: 'Sondentank L',
    kind: 'tank',
    width: 1.4,
    height: 4.2,
    dry: 200,
    fuel: 1600,
    thrust: 0,
    isp: 0,
    info: 'Langer, schmaler Tank (1,6 t) für Sonden mit großer Reichweite.',
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
    id: 'adapter',
    name: 'Tankadapter 3,2 → 2,4',
    kind: 'tank',
    width: 3.2,
    height: 2.4,
    topWidth: 2.4,
    dry: 420,
    fuel: 3600,
    thrust: 0,
    isp: 0,
    unlock: 150,
    info: 'Kegelförmiger Tank (3,6 t): verbindet eine dicke 3,2-m-Stufe glatt mit einer schlanken 2,4-m-Oberstufe.',
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
    ispSea: 280,
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
    ispSea: 285,
    info: 'Klein und sparsam – ideal zum Landen auf dem Mond. Zu schwach für den Start von der Erde.',
  },
  {
    id: 'moewe',
    name: 'Triebwerk Möwe',
    kind: 'engine',
    width: 1.8,
    height: 1.4,
    dry: 550,
    fuel: 0,
    thrust: 95_000,
    isp: 322,
    ispSea: 290,
    unlock: 150,
    info: 'Doppelt so stark wie der Kolibri und fast so sparsam: das Landetriebwerk für schwere Lander auf Mond und Mars.',
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
    ispSea: 280,
    info: 'Das Allround-Triebwerk: Isp 280 s am Boden und 310 s im Vakuum – taugt für Erst- und Oberstufen.',
  },
  {
    id: 'adler',
    name: 'Triebwerk Adler',
    kind: 'engine',
    width: 2.4,
    height: 2.2,
    dry: 1500,
    fuel: 0,
    thrust: 360_000,
    isp: 300,
    ispSea: 275,
    unlock: 50,
    info: 'Zwischen Falke und Titan: kräftig genug für mittlere Erststufen, sparsamer als der Titan.',
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
    ispSea: 165,
    vacuum: true,
    unlock: 150,
    info: 'Riesige Düse für den Weltraum: sehr sparsam im Vakuum, aber in dichter Luft verliert es über die Hälfte seines Schubs. Für Oberstufen.',
  },
  {
    id: 'hermes',
    name: 'Vakuumtriebwerk Hermes',
    kind: 'engine',
    width: 1.4,
    height: 1.9,
    dry: 330,
    fuel: 0,
    thrust: 55_000,
    isp: 375,
    ispSea: 160,
    vacuum: true,
    unlock: 150,
    info: 'Kleine Vakuumdüse für Sonden: sparsamer als jedes andere chemische Triebwerk, aber nur im Weltraum mit vollem Schub.',
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
    ispSea: 262,
    unlock: 50,
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
    ispSea: 268,
    unlock: 150,
    info: 'Das stärkste Triebwerk: 1.500 kN hebt auch die schwersten Raketen von der Rampe.',
  },
  {
    id: 'herkules',
    name: 'Vakuumtriebwerk Herkules',
    kind: 'engine',
    width: 3.2,
    height: 4.2,
    dry: 3400,
    fuel: 0,
    thrust: 900_000,
    isp: 358,
    ispSea: 150,
    vacuum: true,
    unlock: 550,
    info: 'Die größte Vakuumdüse: 900 kN für schwere Oberstufen und Transferstufen zu Mars und Jupiter. In dichter Luft verliert sie über die Hälfte des Schubs.',
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
    ispSea: 240,
    unlock: 300,
    flame: 'atom',
    info: 'Ein Kernreaktor heizt Wasserstoff auf: fast dreimal so sparsam wie chemische Triebwerke, aber schwer und schwach. Für lange Reisen im All.',
  },
  {
    id: 'orion',
    name: 'Triebwerk Orion',
    kind: 'engine',
    width: 2.4,
    height: 2.6,
    dry: 1600,
    fuel: 0,
    thrust: 450_000,
    isp: 340,
    ispSea: 311,
    unlock: 300,
    info: 'Kräftiges, sparsames Oberstufen-Triebwerk: startet auch in der Luft zuverlässig und schiebt schwere Transferstufen schnell aus der Erdbahn – kürzere Brennzeiten, genauere Manöver.',
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
    ispSea: 100,
    unlock: 550,
    flame: 'ionen',
    info: 'Beschleunigt geladene Teilchen mit Strom aus der Bordbatterie: extrem sparsam, aber mit winzigem Schub. Brennt dafür stundenlang – bei schwachem Schub ist Zeitraffer bis 100× erlaubt.',
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
    id: 'trenner-s',
    name: 'Sondentrenner',
    kind: 'decoupler',
    width: 1.4,
    height: 0.3,
    dry: 40,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Leichter Stufentrenner mit 1,4 m Durchmesser – passt zu Sondenkern und Sondentanks.',
  },
  {
    id: 'zwischenstufe-s',
    name: 'Zwischenstufe 2,4 → 1,4',
    kind: 'structure',
    width: 2.4,
    height: 1.0,
    topWidth: 1.4,
    dry: 70,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Leerer Kegelstumpf aus Kohlefaser: setzt eine schlanke Sondenstufe sauber auf eine 2,4-m-Stufe. Kein Treibstoff, nur 70 kg.',
  },
  {
    id: 'zwischenstufe',
    name: 'Zwischenstufe 3,2 → 2,4',
    kind: 'structure',
    width: 3.2,
    height: 1.4,
    topWidth: 2.4,
    dry: 200,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 150,
    info: 'Leichter Übergang von der dicken Erststufe zur 2,4-m-Oberstufe: 200 kg statt 420 kg wie der Tankadapter, dafür ohne Treibstoff.',
  },
  {
    id: 'andockstutzen',
    name: 'Andockstutzen',
    kind: 'dock',
    width: 1.4,
    height: 0.5,
    dry: 90,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Ganz oben auf Kapsel oder Sonde: Fangring mit Federn. Er greift die Station schon aus 30 m Abstand und verträgt 4 m/s statt 2 m/s Annäherung.',
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
    ispSea: 245,
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
    ispSea: 250,
    unlock: 150,
    info: 'Doppelt so große Feststoff-Booster: 720 kN extra für schwere Raketen. Fallen mit ihrer Stufe ab.',
  },
  {
    id: 'booster-s',
    name: 'Kleinbooster (Paar)',
    kind: 'booster',
    width: 2.4,
    height: 0.35,
    dry: 800,
    fuel: 4500,
    thrust: 170_000,
    isp: 270,
    ispSea: 240,
    info: 'Zwei schlanke Feststoff-Booster: 170 kN Starthilfe für leichte Raketen. Fallen mit ihrer Stufe ab.',
  },
  {
    id: 'booster-fl',
    name: 'Flüssigbooster (Paar)',
    kind: 'booster',
    width: 3.2,
    height: 0.5,
    dry: 3800,
    fuel: 26_000,
    thrust: 1_000_000,
    isp: 305,
    ispSea: 280,
    unlock: 550,
    info: 'Zwei riesige Flüssig-Booster mit eigenen Triebwerken: 1.000 kN extra und sparsamer als Feststoff. Für die schwersten Raketen.',
  },
  {
    id: 'beine-xl',
    name: 'Stoßdämpfer-Beine',
    kind: 'legs',
    landSpeed: 20,
    width: 3.2,
    height: 0.8,
    dry: 450,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 300,
    info: 'Lange Landebeine mit Öldämpfern: halten bis 20 m/s und mehr Schräglage aus – für schwere Lander und holprige Landungen. Direkt über das Triebwerk der untersten Stufe.',
  },
  {
    id: 'beine',
    name: 'Landebeine',
    kind: 'legs',
    landSpeed: 14,
    width: 2.4,
    height: 0.6,
    dry: 200,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Federn die Landung ab: erlauben bis 14 m/s statt 8 m/s und mehr Schräglage. Gehören in die unterste Stufe, direkt über das Triebwerk.',
  },
  {
    id: 'beine-s',
    name: 'Sondenbeine',
    kind: 'legs',
    width: 1.4,
    height: 0.45,
    dry: 70,
    fuel: 0,
    thrust: 0,
    isp: 0,
    landSpeed: 11,
    info: 'Leichte Landebeine für Sonden: erlauben bis 11 m/s beim Aufsetzen. Direkt über das Triebwerk der untersten Stufe.',
  },
  {
    id: 'airbags',
    name: 'Lande-Airbags',
    kind: 'airbag',
    width: 2.4,
    height: 0.5,
    dry: 220,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 150,
    landSpeed: 20,
    landTilt: 0.65,
    info: 'Wie bei Mars Pathfinder: Kurz vor dem Boden blasen sich Luftkissen auf. Aufsetzen mit bis zu 20 m/s, auch schräg. Danach sind sie leer – nur für eine Landung.',
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
  {
    id: 'solar',
    name: 'Solarflügel',
    kind: 'solar',
    width: 2.4,
    height: 0.7,
    dry: 160,
    fuel: 0,
    thrust: 0,
    isp: 0,
    unlock: 550,
    info: 'Klappt im All zwei Solarflügel aus: Der Strom verstärkt Ionentriebwerke (in Erdnähe 2,5-facher Schub). Die Sonnenkraft fällt mit dem Quadrat der Entfernung – bei Jupiter bringt der Flügel kaum noch etwas.',
  },
  {
    id: 'scheinwerfer',
    name: 'Scheinwerfer',
    kind: 'light',
    width: 2.4,
    height: 0.35,
    dry: 30,
    fuel: 0,
    thrust: 0,
    isp: 0,
    info: 'Landescheinwerfer: Nachts und im Schatten beleuchten sie den Boden unter der Rakete – so sieht man die Landestelle.',
  },
];

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));

/**
 * Eintrag im Bauplan: Teil-ID, bei seitlich angebauten Teilen „id@x“. Ein Seitenteil ist ein
 * symmetrisches Paar im Abstand x (m, Mitte zur Achse) und hängt am Teil, das in der Liste davor
 * steht: gleiche Unterkante, gleiche Stufe, aber keine eigene Höhe im Stapel.
 */
const SIDE = new Map<string, { def: PartDef; side: number } | null>();

function entry(e: string): { def: PartDef; side: number } | null {
  const core = BY_ID.get(e);
  if (core) return { def: core, side: 0 };
  let hit = SIDE.get(e);
  if (hit === undefined) {
    const at = e.indexOf('@');
    const def = at > 0 ? BY_ID.get(e.slice(0, at)) : undefined;
    const side = Number(e.slice(at + 1));
    hit = def && Number.isFinite(side) && side > 0 && side <= 100 ? { def, side } : null;
    SIDE.set(e, hit);
  }
  return hit;
}

export function part(id: string): PartDef {
  const p = entry(id);
  if (!p) throw new Error(`Unbekanntes Bauteil: ${id}`);
  return p.def;
}

export function isPart(id: string): boolean {
  return entry(id) !== null;
}

/** Seitlicher Abstand eines Eintrags (0: Teil im Stapel). */
export function sideOf(e: string): number {
  return entry(e)?.side ?? 0;
}

/** Wie oft das Teil an der Rakete ist: Seitenteile als Paar. */
export function copies(e: string): number {
  return sideOf(e) > 0 ? 2 : 1;
}

/** Beitrag zur Höhe des Stapels: Seitenteile stehen neben ihrem Träger. */
export function stackHeight(e: string): number {
  return sideOf(e) > 0 ? 0 : part(e).height;
}

/** Eintrag für ein Teil im Abstand `side` (0: im Stapel), auf 0,1 m gerundet. */
export function sideEntry(id: string, side: number): string {
  return side > 0 ? `${id}@${Math.round(side * 10) / 10}` : id;
}

/** Diese Arten lassen sich seitlich anbauen (keine Trenner, Spitzen, Schilde, Beine …). */
export function sideMountable(def: PartDef): boolean {
  return [
    'tank',
    'engine',
    'chute',
    'payload',
    'wheel',
    'rcs',
    'solar',
    'light',
    'fins',
    'airbrake',
  ].includes(def.kind);
}

/** Seitenbooster: Breite, Überstand nach oben und Abstand der Röhren. */
export function boosterPod(def: PartDef): { width: number; rise: number; offset: number } {
  switch (def.id) {
    case 'booster-xl':
      return { width: 1.5, rise: 3.4, offset: 0.82 };
    case 'booster-fl':
      return { width: 1.9, rise: 5.6, offset: 1.0 };
    case 'booster-s':
      return { width: 0.8, rise: 0.4, offset: 0.5 };
    default:
      return { width: 1.1, rise: 1.4, offset: 0.62 };
  }
}

/** Reiter der Werft mit Untergruppen; jedes Teil steht in genau einer Gruppe. */
export interface PartCategory {
  id: string;
  label: string;
  groups: { label: string; parts: PartDef[] }[];
}

const CATEGORY_RULES: {
  id: string;
  label: string;
  groups: [string, (p: PartDef) => boolean][];
}[] = [
  {
    id: 'kopf',
    label: 'Kapseln',
    groups: [
      ['Mit Crew', (p) => p.kind === 'capsule'],
      ['Sondenkerne', (p) => p.kind === 'probe'],
      ['Nutzlast', (p) => p.kind === 'payload'],
    ],
  },
  {
    id: 'tank',
    label: 'Tanks',
    groups: [
      ['Ø 1,4 m', (p) => p.kind === 'tank' && p.width < 2],
      ['Ø 2,4 m', (p) => p.kind === 'tank' && p.width >= 2 && p.width < 3],
      ['Ø 3,2 m', (p) => p.kind === 'tank' && p.width >= 3],
    ],
  },
  {
    id: 'antrieb',
    label: 'Antrieb',
    groups: [
      ['Für den Start', (p) => p.kind === 'engine' && !p.vacuum && !p.flame],
      ['Für das Vakuum', (p) => p.kind === 'engine' && !!p.vacuum],
      ['Atom und Ionen', (p) => p.kind === 'engine' && !!p.flame],
      ['Seitenbooster', (p) => p.kind === 'booster'],
    ],
  },
  {
    id: 'aero',
    label: 'Aero',
    groups: [
      ['Spitze', (p) => p.kind === 'nose' || p.kind === 'fairing'],
      ['Lenken und Bremsen', (p) => p.kind === 'fins' || p.kind === 'airbrake'],
    ],
  },
  {
    id: 'landung',
    label: 'Landung',
    groups: [
      ['Fallschirme', (p) => p.kind === 'chute'],
      ['Hitzeschilde', (p) => p.kind === 'shield'],
      ['Aufsetzen', (p) => p.kind === 'legs' || p.kind === 'airbag'],
    ],
  },
  {
    id: 'technik',
    label: 'Technik',
    groups: [
      ['Stufentrenner', (p) => p.kind === 'decoupler'],
      ['Zwischenstufen', (p) => p.kind === 'structure'],
      ['Andocken', (p) => p.kind === 'dock'],
      ['Lage', (p) => p.kind === 'wheel' || p.kind === 'rcs'],
      ['Strom und Licht', (p) => p.kind === 'solar' || p.kind === 'light'],
    ],
  },
];

/** Innerhalb einer Gruppe: vom Kleinsten zum Größten (Schub, sonst Treibstoff, sonst Masse). */
const size = (p: PartDef): number => p.thrust || p.fuel || p.dry;

export const PART_CATEGORIES: readonly PartCategory[] = CATEGORY_RULES.map((c) => ({
  id: c.id,
  label: c.label,
  groups: c.groups.map(([label, has]) => ({
    label,
    parts: PARTS.filter(has).sort((a, b) => size(a) - size(b)),
  })),
}));

/** Spezifischer Impuls bei `pressure` bar: linear zwischen Vakuum- und Bodenwert, nie negativ. */
export function ispAt(p: PartDef, pressure: number): number {
  return Math.max(0, p.isp - (p.isp - (p.ispSea ?? p.isp)) * pressure);
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
      'zwischenstufe-s',
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
    id: 'odyssee',
    name: 'Odyssee',
    info: 'Das Raumschiff für alles: bemannt, mit Landebeinen, Hitzeschild und großem Schirm, kräftiger Transferstufe und über 11 km/s Δv – bis zu jedem Planeten, Mond und Zwergplaneten mit fester Oberfläche und dort landen.',
    parts: [
      'fallschirm-xl',
      'kapsel',
      'hitzeschild',
      'trenner',
      'rcs-block',
      'tank-m',
      'beine',
      'kolibri',
      'trenner',
      'tank-xl',
      'tank-xl',
      'nova',
      'trenner',
      'tank-xxl',
      'tank-xl',
      'mammut',
      'trenner',
      'tank-xl',
      'booster-xl',
      'tank-xxl',
      'booster-xl',
      'mammut',
    ],
  },
  {
    id: 'pionier',
    name: 'Pionier (Mars und zurück)',
    info: 'Leichter Ein-Personen-Lander mit Stoßdämpfer-Beinen, Hitzeschild und kräftiger Orion-Transferstufe: auf dem Mars landen, wieder starten und heim zur Erde.',
    parts: [
      'fallschirm',
      'kapsel-mini',
      'hitzeschild',
      'trenner',
      'tank-l',
      'beine-xl',
      'orion',
      'trenner',
      'tank-xl',
      'tank-xl',
      'orion',
      'trenner',
      'tank-xxl',
      'tank-xxl',
      'booster-xl',
      'mammut',
    ],
  },
  {
    id: 'kurier',
    name: 'Kurier',
    info: 'Kleine, günstige Fähre zur Raumstation: Mini-Kapsel, RCS und genug Δv für Rendezvous, Andocken und Heimkehr.',
    parts: [
      'fallschirm',
      'kapsel-mini',
      'hitzeschild',
      'trenner',
      'rcs-block',
      'tank-m',
      'orion',
      'trenner',
      'tank-xl',
      'titan',
    ],
  },
  {
    id: 'pfeil',
    name: 'Pfeil',
    info: 'Schlanker Satellitenträger mit Nasenkegel (halber Luftwiderstand) und Vakuum-Oberstufe Nova.',
    parts: [
      'nase',
      'satellit',
      'sonde',
      'zwischenstufe-s',
      'tank-m',
      'nova',
      'trenner',
      'tank-l',
      'tank-m',
      'titan',
    ],
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
      'tank-xxl',
      'mammut',
      'booster-xl',
    ],
  },
  {
    id: 'zwerg',
    name: 'Zwerg',
    info: 'Kleinster Satellitenträger: Kleinbooster, Adler-Erststufe und eine schlanke Sonden-Oberstufe mit Vakuumtriebwerk Hermes.',
    parts: [
      'nase',
      'satellit',
      'sonde',
      'tank-sonde-l',
      'hermes',
      'trenner-s',
      'zwischenstufe-s',
      'tank-m',
      'tank-m',
      'adler',
      'booster-s',
    ],
  },
  {
    id: 'sternwarte',
    name: 'Sternwarte',
    info: 'Bringt ein Weltraumteleskop über die Luft: Sondenkern Kepler steuert, die Hermes-Oberstufe hebt die Bahn an – dort mit N aussetzen.',
    parts: [
      'nase',
      'teleskop',
      'sonde-xl',
      'tank-m',
      'hermes',
      'zwischenstufe-s',
      'trenner',
      'tank-l',
      'tank-m',
      'adler',
      'booster-s',
    ],
  },
  {
    id: 'phoenix',
    name: 'Phönix (Marssonde)',
    info: 'Unbemannter Mars-Lander mit Sondenfallschirm, Sondenbeinen und Scheinwerfern – landet auch nachts. Hermes schiebt ihn zum Mars.',
    parts: [
      'fallschirm-s',
      'sonde',
      'zwischenstufe-s',
      'scheinwerfer',
      'tank-sonde',
      'beine-s',
      'spatz',
      'trenner-s',
      'tank-sonde-l',
      'hermes',
      'zwischenstufe-s',
      'trenner',
      'tank-l',
      'tank-m',
      'adler',
      'booster-s',
    ],
  },
  {
    id: 'daemmerung',
    name: 'Dämmerung (Ionensonde)',
    info: 'Ionensonde mit Solarflügeln wie die echte Dawn: winziger Schub, aber über 40 km/s Δv. Reist zum Zwergplaneten Ceres und landet dort.',
    parts: [
      'sonde-xl',
      'solar',
      'tank-sonde-l',
      'tank-sonde-l',
      'beine-s',
      'ionen',
      'trenner-s',
      'tank-xl',
      'nova',
      'trenner',
      'tank-xxl',
      'mammut',
    ],
  },
  {
    id: 'nachtfalke',
    name: 'Nachtfalke',
    info: 'Mondlander mit Scheinwerfern und Möwe-Triebwerk: landet auch in der Mondnacht und kehrt heim. Der Tankadapter verbindet die dicke Erststufe mit der schlanken Oberstufe.',
    parts: [
      'fallschirm',
      'kapsel',
      'hitzeschild',
      'trenner',
      'tank-m',
      'tank-s',
      'scheinwerfer',
      'beine',
      'moewe',
      'trenner',
      'tank-l',
      'tank-l',
      'nova',
      'trenner',
      'tank-xl',
      'adapter',
      'mammut',
    ],
  },
  {
    id: 'koloss',
    name: 'Koloss',
    info: 'Schwerlastrakete mit Flüssigboostern und dem Vakuumtriebwerk Herkules: drei Personen, großer Hitzeschild und Stoßdämpfer-Beine – zum Mars und wieder zurück.',
    parts: [
      'fallschirm-xl',
      'kapsel-xl',
      'hitzeschild-xl',
      'trenner',
      'rcs-block',
      'tank-xl',
      'beine-xl',
      'orion',
      'trenner',
      'tank-xxl',
      'tank-xl',
      'herkules',
      'trenner',
      'tank-xxl',
      'tank-xxl',
      'booster-fl',
      'tank-xxl',
      'mammut',
      'booster-fl',
    ],
  },
  {
    id: 'spatzsonde',
    name: 'Spatz-Sonde',
    info: 'Winzige Sonde mit Sondentank und Spatz-Triebwerk auf einer kleinen Trägerrakete – landet auf Phobos.',
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
  /** Schub im Vakuum (N). */
  thrust: number;
  /** Mittlerer spezifischer Impuls aller Triebwerke der Stufe (Vakuum und Meereshöhe). */
  isp: number;
  ispSea: number;
  /** Treibstoffverbrauch bei Vollgas (kg/s). */
  flow: number;
  /** Masse beim Zünden (inklusive aller Stufen darüber). */
  startMass: number;
  deltaV: number;
  /** Schub-Gewichts-Verhältnis beim Zünden auf der Erde (Boden), dem Mond … */
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
  /** Start schon in einer Umlaufbahn: Abheben muss die Rakete dann nicht können. */
  orbital?: boolean;
}

export function stageStats(design: Design, rules?: BuildRules): StageStats[] {
  const k = rules?.thrust ?? 1;
  const endless = rules?.infiniteFuel ?? false;
  const home = rules?.body ?? GAME_EARTH;
  const gStart = home.mu / home.radius ** 2;
  const segs = segments(design);
  const stats: StageStats[] = [];
  let above = 0;
  let solar = 0;
  for (const seg of segs) {
    // Seitenteile zählen doppelt (Paar).
    const defs = seg.flatMap((e) => (copies(e) === 2 ? [part(e), part(e)] : [part(e)]));
    // Solarflügel dieser Stufe und darüber verstärken Ionentriebwerke (Werte für die Erdbahn).
    solar += defs.filter((p) => p.kind === 'solar').length;
    const power = (p: PartDef): number => (p.flame === 'ionen' ? 1 + 1.5 * Math.min(2, solar) : 1);
    const dry = defs.reduce((s, p) => s + p.dry, 0);
    const fuel = defs.reduce((s, p) => s + p.fuel, 0);
    const thrust = k * defs.reduce((s, p) => s + p.thrust * power(p), 0);
    const flowOf = (p: PartDef): number =>
      p.thrust > 0 ? (k * p.thrust * power(p)) / (p.isp * G0) : 0;
    // Schub bei Druck p: gleicher Massenstrom, kleinerer Isp.
    const thrustAt = (pressure: number): number =>
      defs.reduce((s, p) => s + flowOf(p) * G0 * ispAt(p, pressure), 0);
    const flow = defs.reduce((s, p) => s + flowOf(p), 0);
    const isp = flow > 0 ? thrust / (flow * G0) : 0;
    const thrustSea = thrustAt(1);
    const thrustHome = thrustAt(enginePressure(home.density0));
    const startMass = above + dry + fuel;
    const endMass = startMass - fuel;
    const gEarth = GAME_EARTH.mu / GAME_EARTH.radius ** 2;
    const gMoon = GAME_MOON.mu / GAME_MOON.radius ** 2;
    stats.push({
      number: 0,
      parts: seg,
      dry,
      fuel,
      thrust,
      isp,
      ispSea: flow > 0 ? thrustSea / (flow * G0) : 0,
      flow,
      startMass,
      deltaV:
        thrust > 0 && fuel > 0
          ? endless
            ? Infinity
            : isp * G0 * Math.log(startMass / endMass)
          : 0,
      twrEarth: thrustSea / (startMass * gEarth),
      twrMoon: thrust / (startMass * gMoon),
      twrStart: thrustHome / (startMass * gStart),
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
  return design.reduce((s, id) => s + (part(id).dry + part(id).fuel) * copies(id), 0);
}

export function designHeight(design: Design): number {
  return design.reduce((s, id) => s + stackHeight(id), 0);
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
  const home = rules?.body ?? GAME_EARTH;
  if (first.thrust === 0)
    problems.push({ level: 'error', text: 'Ganz unten muss ein Triebwerk sitzen.' });
  else if (first.fuel === 0)
    problems.push({ level: 'error', text: 'Die unterste Stufe hat keinen Tank.' });
  else if (first.twrStart < 1 && !rules?.orbital)
    problems.push({
      level: 'warn',
      text: `Zu schwer: Der Schub der ersten Stufe trägt ${home === GAME_EARTH ? '' : `am Startort (${home.name}) `}nur ${Math.round(first.twrStart * 100)} % des Gewichts. Die Rakete hebt nicht ab.`,
    });
  // Reihenfolge im Stapel: Seitenteile stehen daneben und zählen hier nicht.
  const core = design.filter((e) => sideOf(e) === 0);
  const buriedTop = core.slice(1).find((id) => ['nose', 'fairing', 'dock'].includes(part(id).kind));
  if (buriedTop)
    problems.push({
      level: 'warn',
      text: `${part(buriedTop).name} wirkt nur ganz oben – weiter unten ist das Teil nur Ballast.`,
    });
  if (core[core.length - 1] && part(core[core.length - 1]!).kind === 'decoupler')
    problems.push({ level: 'warn', text: 'Ganz unten hängt ein Stufentrenner ohne Stufe.' });
  const has = (kind: PartKind): boolean => design.some((id) => part(id).kind === kind);
  if (has('capsule') && !has('chute'))
    problems.push({
      level: 'warn',
      text: 'Ohne Fallschirm ist eine Landung auf der Erde nur mit Triebwerk möglich.',
    });
  // Landestufe (mit Beinen): Schafft ihr Triebwerk die Landung auf Mond oder Mars?
  const lander = stats.find((st) => st.parts.some((id) => part(id).kind === 'legs'));
  if (lander && lander.thrust > 0) {
    const gMars = 3.72;
    const twrMars = lander.thrust / (lander.startMass * gMars);
    if (lander.twrMoon < 1.2)
      problems.push({
        level: 'warn',
        text: `Die Landestufe ist selbst für den Mond zu schwach (Schub ${Math.round(lander.twrMoon * 100)} % des Gewichts dort) – ein stärkeres Triebwerk oder weniger Last darüber.`,
      });
    else if (twrMars < 1)
      problems.push({
        level: 'warn',
        text: `Hinweis: Für eine Marslandung reicht die Landestufe nicht (Schub ${Math.round(twrMars * 100)} % des Gewichts dort). Für den Mond reicht sie.`,
      });
    else if (twrMars < 1.3)
      problems.push({
        level: 'warn',
        text: `Hinweis: Für eine Marslandung ist die Landestufe knapp (Schub ${Math.round(twrMars * 100)} % des Gewichts dort). Für den Mond reicht sie.`,
      });
  }
  // Jeder Hitzeschild braucht einen Stufentrenner direkt darunter (oder sitzt ganz unten).
  const buried = core.some(
    (id, i) =>
      part(id).kind === 'shield' && i < core.length - 1 && part(core[i + 1]!).kind !== 'decoupler',
  );
  if (buried)
    problems.push({
      level: 'warn',
      text: 'Ein Hitzeschild wirkt nur als unterstes Teil: Setze einen Stufentrenner direkt darunter, damit er beim Wiedereintritt vorn ist.',
    });
  return problems;
}
