import { CHAPTERS } from '../app/content';
import { PageHead } from '../ui/content';
import { Chapter1 } from './chapters/Chapter1';
import { Chapter2 } from './chapters/Chapter2';
import { Chapter3 } from './chapters/Chapter3';
import { Chapter4 } from './chapters/Chapter4';
import { Chapter5 } from './chapters/Chapter5';
import { Chapter6 } from './chapters/Chapter6';

const LEADS: Record<number, string> = {
  1: 'Ist der Mond innen hohl – vielleicht sogar ein Raumschiff? Die These klingt abenteuerlich, lässt sich aber physikalisch sauber prüfen. Dabei lernen wir, welche Messgrößen etwas über das Innere eines Himmelskörpers verraten.',
  2: 'Von Keplers Beobachtungsregeln zu Newtons Gravitationsgesetz: Woher das 1/r²-Gesetz kommt, wie Newton es am Mond überprüft hat und warum gerade dieses Gesetz stabile Bahnen erlaubt.',
  3: 'Die Sonne zieht den Mond mehr als doppelt so stark an wie die Erde. Warum reißt sie ihn trotzdem nicht fort – und was bewirkt sie stattdessen?',
  4: 'Fünf Punkte, an denen sich Gravitation und Fliehkraft genau aufheben. Wir berechnen sie, beweisen ihre Lage und untersuchen, welche davon stabil sind.',
  5: 'Seit über vier Milliarden Jahren umkreist der Mond die Erde. Drei Kriterien erklären, warum die Sonne ihn nicht entreißen kann – eines davon ist sogar ein mathematischer Beweis.',
  6: 'Was müsste sich ändern, damit der Mond abstürzt oder verloren geht? Wir bestimmen die Grenzen systematisch – mit Rechnung und mit Tausenden von Simulationen.',
};

export function ChapterPage({ n }: { n: number }) {
  const meta = CHAPTERS.find((c) => c.n === n) ?? CHAPTERS[0]!;
  const Body = [Chapter1, Chapter2, Chapter3, Chapter4, Chapter5, Chapter6][meta.n - 1]!;
  const prev = CHAPTERS.find((c) => c.n === meta.n - 1);
  const next = CHAPTERS.find((c) => c.n === meta.n + 1);
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
