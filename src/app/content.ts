/** Kapitelstruktur – entspricht der Gliederung der Seminararbeit. */
export interface ChapterMeta {
  n: number;
  title: string;
  question: string;
}

export const CHAPTERS: readonly ChapterMeta[] = [
  { n: 1, title: 'Einleitung', question: 'Was bedeutet Bahnstabilität?' },
  {
    n: 2,
    title: 'Physikalische Grundlagen',
    question: 'Newton, Zweikörperproblem und Baryzentrum',
  },
  { n: 3, title: 'Einfluss der Sonne', question: 'Wie stört die Sonne das Erde-Mond-System?' },
  { n: 4, title: 'Lagrange-Punkte', question: 'Wo heben sich die Kräfte auf?' },
  { n: 5, title: 'Die Hill-Sphäre der Erde', question: 'Wie weit reicht die Macht der Erde?' },
  { n: 6, title: 'Gezeitenreibung', question: 'Warum entfernt sich der Mond?' },
  { n: 7, title: 'Widerlegung der Hohle-Mond-Theorie', question: 'Ist der Mond innen hohl?' },
  { n: 8, title: 'Eigenanteil: Simulation', question: 'Was zeigt unsere Drei-Körper-Simulation?' },
  { n: 9, title: 'Fazit', question: 'Die Antwort auf die Problemfrage' },
];

/**
 * Kapitel, die in Menü, Startseite und Vor/Zurück gezeigt werden. Die übrigen bleiben erhalten
 * und sind über ihre Adresse (#kapitel-3 …) weiter erreichbar – sie werden nur nicht angezeigt.
 */
export const SHOWN_CHAPTERS = new Set([2, 7]);
/**
 * Werkzeuge (Simulator, Stabilitätskarte, Lagrange-Labor) in Menü und Startseite zeigen? Aus:
 * Sie bleiben erhalten und über ihre Adresse erreichbar, werden nur nicht angezeigt.
 */
export const SHOW_TOOLS = false;
export const VISIBLE_CHAPTERS: readonly ChapterMeta[] = CHAPTERS.filter((c) =>
  SHOWN_CHAPTERS.has(c.n),
);

export const PROBLEM_QUESTION =
  'Unter welchen physikalischen Bedingungen ist ein Mond in einem Drei-Körper-System (Erde–Mond–Sonne) langfristig stabil, und wann würde er abstürzen oder das System verlassen?';
