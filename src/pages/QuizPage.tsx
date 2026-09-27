import { useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { playFailure, playSuccess } from '../missions/sound';
import { QUESTIONS } from '../quiz/questions';
import { PageHead, StatusChip } from '../ui/content';
import { Icon } from '../ui/Icon';

export function QuizPage() {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => progressStore.load().quizBest);
  const done = index >= QUESTIONS.length;
  const q = QUESTIONS[index];

  const choose = (i: number): void => {
    if (chosen !== null || !q) return;
    setChosen(i);
    if (i === q.answer) {
      setScore((s) => s + 1);
      playSuccess(0);
    } else {
      playFailure();
    }
  };

  const next = (): void => {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setChosen(null);
    if (nextIndex >= QUESTIONS.length) {
      const p = progressStore.update((prev) => ({
        ...prev,
        quizBest: Math.max(prev.quizBest, score),
      }));
      setBest(p.quizBest);
    }
  };

  const restart = (): void => {
    setIndex(0);
    setChosen(null);
    setScore(0);
  };

  return (
    <div class="stack" style={{ gap: '20px', maxWidth: '760px' }}>
      <PageHead eyebrow="Spielen" title="Quiz">
        {QUESTIONS.length} Fragen quer durch alle neun Kapitel und die Spiele. Nach jeder Antwort
        gibt es die Erklärung.
      </PageHead>
      {done ? (
        <section class="panel panel-pad">
          <h2>
            {score} von {QUESTIONS.length} richtig
          </h2>
          <p class="muted">
            Bestes Ergebnis bisher: {best} von {QUESTIONS.length}.
          </p>
          <p>
            {score === QUESTIONS.length
              ? 'Perfekt – du beherrschst das Drei-Körper-Problem.'
              : score >= QUESTIONS.length * 0.7
                ? 'Sehr gut! Die Erklärungen zu den verpassten Fragen findest du in den Kapiteln.'
                : 'Ein guter Anfang. Die Kapitel und Experimente helfen weiter.'}
          </p>
          <div class="btn-row">
            <button type="button" class="btn primary" onClick={restart}>
              <Icon name="reset" /> Noch einmal
            </button>
            <a class="btn" href="#missionen">
              Zu den Missionen
            </a>
          </div>
        </section>
      ) : (
        q && (
          <section class="panel panel-pad" aria-live="polite">
            <div class="row" style={{ justifyContent: 'space-between' }}>
              <span class="eyebrow">
                Frage {index + 1} von {QUESTIONS.length} · Kapitel {q.chapter}
              </span>
              <span class="small muted">{score} richtig</span>
            </div>
            <h2 style={{ fontSize: '1.3rem' }}>{q.text}</h2>
            <div class="stack" style={{ gap: '8px' }}>
              {q.options.map((o, i) => {
                const state =
                  chosen === null ? '' : i === q.answer ? 'ok' : i === chosen ? 'fail' : '';
                return (
                  <button
                    key={o}
                    type="button"
                    class={`btn quiz-option ${state}`}
                    disabled={chosen !== null && state === ''}
                    onClick={() => choose(i)}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {chosen !== null && (
              <div class="stack" style={{ gap: '10px' }}>
                <StatusChip status={chosen === q.answer ? 'ok' : 'fail'}>
                  {chosen === q.answer ? 'Richtig' : 'Nicht ganz'}
                </StatusChip>
                <p>{q.explanation}</p>
                <div class="btn-row">
                  <button type="button" class="btn primary" onClick={next}>
                    {index + 1 < QUESTIONS.length ? 'Nächste Frage' : 'Auswertung'}{' '}
                    <Icon name="arrow" />
                  </button>
                  <a class="btn ghost" href={`#kapitel-${q.chapter}`}>
                    Zu Kapitel {q.chapter}
                  </a>
                </div>
              </div>
            )}
          </section>
        )
      )}
    </div>
  );
}
