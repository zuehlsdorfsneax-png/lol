/** Ziele (Erfolge) der Raketenwerft, Punkte und Ränge. */

export type GoalId =
  | 'lift'
  | 'km10'
  | 'space'
  | 'orbit'
  | 'high'
  | 'dock'
  | 'refuel'
  | 'satellite'
  | 'highsat'
  | 'network'
  | 'moonsat'
  | 'planetsat'
  | 'soi'
  | 'flyby'
  | 'moonorbit'
  | 'moonland'
  | 'return'
  | 'escape'
  | 'mercury'
  | 'mercuryland'
  | 'venus'
  | 'venusland'
  | 'mars'
  | 'marsorbit'
  | 'marsland'
  | 'phobos'
  | 'marsreturn'
  | 'jupiter'
  | 'jupiterorbit'
  | 'europa'
  | 'europaland'
  | 'sunclose'
  | 'soft'
  | 'node'
  | 'fire'
  | 'pinpoint';

export type GoalGroup = 'Erde' | 'Station' | 'Satelliten' | 'Mond' | 'Planeten' | 'Können';

export interface GoalDef {
  id: GoalId;
  title: string;
  text: string;
  points: number;
  group: GoalGroup;
}

export const GOAL_GROUPS: readonly GoalGroup[] = [
  'Erde',
  'Station',
  'Satelliten',
  'Mond',
  'Planeten',
  'Können',
];

export const GOALS: readonly GoalDef[] = [
  {
    id: 'lift',
    group: 'Erde',
    points: 5,
    title: 'Abheben',
    text: 'Die Rakete verlässt die Startrampe.',
  },
  {
    id: 'km10',
    group: 'Erde',
    points: 5,
    title: '10 km Höhe',
    text: 'Höher als jedes Verkehrsflugzeug.',
  },
  {
    id: 'space',
    group: 'Erde',
    points: 10,
    title: 'Weltraum',
    text: 'Über 40 km: Hier endet die Atmosphäre im Spiel.',
  },
  {
    id: 'orbit',
    group: 'Erde',
    points: 20,
    title: 'Umlaufbahn',
    text: 'Der tiefste Bahnpunkt liegt über der Atmosphäre – die Rakete fällt ständig um die Erde herum.',
  },
  {
    id: 'high',
    group: 'Erde',
    points: 15,
    title: 'Hohe Bahn',
    text: 'Eine geschlossene Erdbahn, deren höchster Punkt über 1.000 km liegt.',
  },
  {
    id: 'dock',
    group: 'Station',
    points: 30,
    title: 'Angedockt',
    text: 'An der Raumstation Kepler festgemacht – Rendezvous im Orbit geschafft.',
  },
  {
    id: 'refuel',
    group: 'Station',
    points: 10,
    title: 'Aufgetankt',
    text: 'Alle Tanks an der Station gefüllt. Mit vollen Tanks aus der Umlaufbahn reicht es weit.',
  },
  {
    id: 'satellite',
    group: 'Satelliten',
    points: 25,
    title: 'Satellit im Orbit',
    text: 'Einen Satelliten auf einer Erdumlaufbahn oberhalb der Atmosphäre ausgesetzt.',
  },
  {
    id: 'highsat',
    group: 'Satelliten',
    points: 30,
    title: 'Hoher Satellit',
    text: 'Ein Satellit, dessen tiefster Bahnpunkt über 2.000 km liegt – dort bremst keine Luft mehr.',
  },
  {
    id: 'network',
    group: 'Satelliten',
    points: 40,
    title: 'Satellitennetz',
    text: 'Drei Satelliten kreisen gleichzeitig um die Erde.',
  },
  {
    id: 'moonsat',
    group: 'Satelliten',
    points: 35,
    title: 'Mondsatellit',
    text: 'Ein Satellit umkreist den Mond.',
  },
  {
    id: 'planetsat',
    group: 'Satelliten',
    points: 60,
    title: 'Planetensonde',
    text: 'Ein Satellit umkreist einen anderen Planeten.',
  },
  {
    id: 'soi',
    group: 'Mond',
    points: 15,
    title: 'Hill-Sphäre des Mondes',
    text: 'Ab hier zieht der Mond stärker an der Bahn als die Erde (Kapitel 5).',
  },
  {
    id: 'flyby',
    group: 'Mond',
    points: 15,
    title: 'Mondvorbeiflug',
    text: 'Durch die Hill-Sphäre des Mondes und wieder hinaus – der Mond lenkt die Bahn um wie ein Katapult.',
  },
  {
    id: 'moonorbit',
    group: 'Mond',
    points: 20,
    title: 'Mondumlaufbahn',
    text: 'Vom Mond eingefangen.',
  },
  {
    id: 'moonland',
    group: 'Mond',
    points: 40,
    title: 'Mondlandung',
    text: 'Sanft auf dem Mond aufgesetzt.',
  },
  {
    id: 'return',
    group: 'Mond',
    points: 50,
    title: 'Heimkehr',
    text: 'Vom Mond zurück und mit der Crew (Kapsel) sicher auf der Erde gelandet.',
  },
  {
    id: 'escape',
    group: 'Planeten',
    points: 30,
    title: 'Flucht aus dem System',
    text: 'Raus aus der Hill-Sphäre der Erde – jetzt kreist die Rakete um die Sonne. Genau das passiert einem Mond mit zu viel Tempo (Problemfrage).',
  },
  {
    id: 'mercury',
    group: 'Planeten',
    points: 50,
    title: 'Merkur erreicht',
    text: 'In der Hill-Sphäre des sonnennächsten Planeten angekommen.',
  },
  {
    id: 'mercuryland',
    group: 'Planeten',
    points: 90,
    title: 'Merkurlandung',
    text: 'Ohne Luft zum Bremsen – nur mit dem Triebwerk auf dem Merkur gelandet.',
  },
  {
    id: 'venus',
    group: 'Planeten',
    points: 40,
    title: 'Venus erreicht',
    text: 'In der Hill-Sphäre der Venus angekommen.',
  },
  {
    id: 'venusland',
    group: 'Planeten',
    points: 60,
    title: 'Venuslandung',
    text: 'Durch die dichte Venusatmosphäre bis zum Boden.',
  },
  {
    id: 'mars',
    group: 'Planeten',
    points: 40,
    title: 'Mars erreicht',
    text: 'In der Hill-Sphäre des Mars angekommen.',
  },
  {
    id: 'marsorbit',
    group: 'Planeten',
    points: 40,
    title: 'Marsumlaufbahn',
    text: 'Vom Mars eingefangen.',
  },
  {
    id: 'marsland',
    group: 'Planeten',
    points: 80,
    title: 'Marslandung',
    text: 'Fallschirm und Triebwerk zusammen – sicher auf dem roten Planeten.',
  },
  {
    id: 'phobos',
    group: 'Planeten',
    points: 60,
    title: 'Phobos-Landung',
    text: 'Auf dem winzigen Marsmond aufgesetzt – fast schwerelos.',
  },
  {
    id: 'marsreturn',
    group: 'Planeten',
    points: 150,
    title: 'Marsheimkehr',
    text: 'Auf dem Mars gelandet und mit der Crew (Kapsel) sicher zur Erde zurückgekehrt – das hat noch kein Mensch geschafft.',
  },
  {
    id: 'jupiter',
    group: 'Planeten',
    points: 70,
    title: 'Jupiter-Vorbeiflug',
    text: 'In die Hill-Sphäre des Riesenplaneten eingedrungen.',
  },
  {
    id: 'jupiterorbit',
    group: 'Planeten',
    points: 90,
    title: 'Jupiterumlaufbahn',
    text: 'Vom Riesenplaneten eingefangen.',
  },
  {
    id: 'europa',
    group: 'Planeten',
    points: 70,
    title: 'Europa erreicht',
    text: 'In der Hill-Sphäre des Eismondes angekommen.',
  },
  {
    id: 'europaland',
    group: 'Planeten',
    points: 120,
    title: 'Europa-Landung',
    text: 'Auf dem Eispanzer über dem verborgenen Ozean gelandet.',
  },
  {
    id: 'sunclose',
    group: 'Planeten',
    points: 50,
    title: 'Sonnennah',
    text: 'Näher an der Sonne als die Venus.',
  },
  {
    id: 'soft',
    group: 'Können',
    points: 10,
    title: 'Butterweich',
    text: 'Nach einem Flug über 100 m mit weniger als 2 m/s aufgesetzt.',
  },
  {
    id: 'node',
    group: 'Können',
    points: 10,
    title: 'Nach Plan',
    text: 'Ein geplantes Manöver auf 1 m/s genau ausgeführt.',
  },
  {
    id: 'fire',
    group: 'Können',
    points: 15,
    title: 'Feuertaufe',
    text: 'Einen Wiedereintritt mit über 70 % Hitze überstanden.',
  },
  {
    id: 'pinpoint',
    group: 'Können',
    points: 30,
    title: 'Punktlandung',
    text: 'Aus der Umlaufbahn zurück und höchstens 5 km neben der Startrampe gelandet.',
  },
];

export const RANKS: readonly { points: number; title: string }[] = [
  { points: 0, title: 'Kadett' },
  { points: 50, title: 'Raketenbauer' },
  { points: 150, title: 'Pilot' },
  { points: 300, title: 'Astronaut' },
  { points: 550, title: 'Kommandant' },
  { points: 900, title: 'Raumfahrt-Legende' },
  { points: 1300, title: 'Held des Sonnensystems' },
];

/** Jeder Stern aus den Herausforderungen zählt so viele Punkte. */
export const STAR_POINTS = 10;

export function goalPoints(goals: Iterable<string>): number {
  let sum = 0;
  for (const id of goals) sum += GOALS.find((g) => g.id === id)?.points ?? 0;
  return sum;
}

/** Punkte aus Zielen und Sternen der Herausforderungen. */
export function careerPoints(goals: Iterable<string>, stars: Record<string, number> = {}): number {
  let sum = goalPoints(goals);
  for (const s of Object.values(stars)) sum += s * STAR_POINTS;
  return sum;
}

export function rankFor(points: number): { title: string; next: number | null; index: number } {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (points >= r.points) index = i;
  });
  return { title: RANKS[index]!.title, next: RANKS[index + 1]?.points ?? null, index };
}

export function goalById(id: GoalId): GoalDef {
  return GOALS.find((g) => g.id === id)!;
}
