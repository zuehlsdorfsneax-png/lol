/** Kapitelstruktur – entspricht der Gliederung der Seminararbeit. */
export interface ChapterMeta {
  n: number;
  title: string;
  question: string;
}

export const CHAPTERS: readonly ChapterMeta[] = [
  { n: 1, title: 'Hohlmond-Theorie', question: 'Ist der Mond innen hohl?' },
  { n: 2, title: 'Gravitationsgesetze', question: 'Woher kommt das 1/r²-Gesetz?' },
  { n: 3, title: 'Störung durch die Sonne', question: 'Was macht die Sonne mit der Mondbahn?' },
  { n: 4, title: 'Lagrange-Punkte', question: 'Wo heben sich alle Kräfte auf?' },
  { n: 5, title: 'Warum stabil?', question: 'Warum bleibt der Mond seit Milliarden Jahren?' },
  {
    n: 6,
    title: 'Wann instabil?',
    question: 'Was müsste passieren, damit er abstürzt oder flieht?',
  },
];

export const PROBLEM_QUESTION =
  'Unter welchen physikalischen Bedingungen ist ein Mond in einem Drei-Körper-System (Erde–Mond–Sonne) langfristig stabil, und wann würde er abstürzen oder das System verlassen?';
