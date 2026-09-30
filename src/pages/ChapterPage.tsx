import { CHAPTERS, VISIBLE_CHAPTERS } from '../app/content';
import { PageHead } from '../ui/content';
import { Basics } from './chapters/Basics';
import { Chapter3 } from './chapters/Chapter3';
import { Chapter4 } from './chapters/Chapter4';
import { Chapter5 } from './chapters/Chapter5';
import { Conclusion } from './chapters/Conclusion';
import { Hollow } from './chapters/Hollow';
import { Intro } from './chapters/Intro';
import { OwnWork } from './chapters/OwnWork';
import { Tides } from './chapters/Tides';

const LEADS: Record<number, string> = {
  1: 'Worum es geht: Was Bahnstabilität bedeutet, wie die Problemfrage lautet und welchen Weg die Arbeit nimmt.',
  2: 'Newtons Axiome und das Gravitationsgesetz, das Zweikörperproblem, die Bedeutung des Erde-Mond-Sonne-Systems und das Baryzentrum.',
  3: 'Die Sonne zieht den Mond mehr als doppelt so stark an wie die Erde. Warum reißt sie ihn trotzdem nicht fort – und was bewirkt sie stattdessen?',
  4: 'Fünf Punkte, an denen sich Gravitation und Fliehkraft genau aufheben. Wir berechnen sie, beweisen ihre Lage und untersuchen, welche davon stabil sind.',
  5: 'Die Hill-Sphäre ist die wichtigste Grenze dafür, ob der Mond an die Erde gebunden bleibt.',
  6: 'Die Gezeiten bremsen die Erde und schieben den Mond nach außen. Wohin führt das?',
  7: 'Ist der Mond hohl oder gar eine Attrappe? Wir prüfen die These mit Physik und mit unserem eigenen Programm.',
  8: 'Unsere digitale Drei-Körper-Simulation: Aufbau, Formeln, untersuchte Fälle und Auswertung.',
  9: 'Die Antwort auf die Problemfrage, die wichtigsten Erkenntnisse, Grenzen und Ausblick.',
};

export function ChapterPage({ n }: { n: number }) {
  const meta = CHAPTERS.find((c) => c.n === n) ?? CHAPTERS[0]!;
  const Body = [Intro, Basics, Chapter3, Chapter4, Chapter5, Tides, Hollow, OwnWork, Conclusion][
    meta.n - 1
  ]!;
  const prev = [...VISIBLE_CHAPTERS].reverse().find((c) => c.n < meta.n);
  const next = VISIBLE_CHAPTERS.find((c) => c.n > meta.n);
  return (
    <article class="chapter">
      <PageHead eyebrow={`Kapitel ${meta.n}`} title={meta.title}>
        {LEADS[meta.n]}
      </PageHead>
      <Body />
      <nav class="chapter-nav" aria-label="Kapitelnavigation">
        {prev ? (
          <a class="chapter-nav-link" href={`#kapitel-${prev.n}`}>
            <span class="small muted">← Kapitel {prev.n}</span>
            <span>{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a class="chapter-nav-link next" href={`#kapitel-${next.n}`}>
            <span class="small muted">Kapitel {next.n} →</span>
            <span>{next.title}</span>
          </a>
        ) : (
          <a class="chapter-nav-link next" href="#missionen">
            <span class="small muted">Weiter →</span>
            <span>Missionen spielen</span>
          </a>
        )}
      </nav>
    </article>
  );
}
