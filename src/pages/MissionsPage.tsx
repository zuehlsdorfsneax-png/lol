import { useState } from 'preact/hooks';
import { MISSIONS } from '../missions/missions';
import { progressStore, resetAllProgress } from '../missions/progress';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Stars } from '../missions/Stars';
import { PageHead } from '../ui/content';

const DIFFICULTY = ['', 'leicht', 'mittel', 'schwer'];

export function MissionsPage() {
  const [progress, setProgress] = useState(() => progressStore.load());
  const total = MISSIONS.reduce((s, m) => s + (progress.stars[m.id] ?? 0), 0);
  return (
    <div class="stack" style={{ gap: '22px', maxWidth: '1100px' }}>
      <PageHead eyebrow="Spielen" title="Missionen">
        Neun Aufträge, in denen du die Grenzen der Stabilität selbst findest. Jede Mission gibt bis
        zu drei Sterne – der dritte verlangt, dass du die Grenze fast genau triffst.
      </PageHead>
      <div class="row">
        {/* Ein einzelnes Symbol – drei volle Sterne neben „0 von 27“ wären irreführend. */}
        <span class="total-star" aria-hidden="true">
          ★
        </span>
        <span>
          <strong>{total}</strong> von {MISSIONS.length * 3} Sternen gesammelt
        </span>
      </div>
      <div class="mission-grid">
        {MISSIONS.map((m, i) => (
          <a class="mission-card" href={`#mission-${m.id}`} key={m.id}>
            <div class="mission-meta">
              <span>
                Mission {i + 1} · Kapitel {m.chapter}
              </span>
              <span>{DIFFICULTY[m.difficulty]}</span>
            </div>
            <h3>{m.title}</h3>
            <p class="small muted">{m.goal}</p>
            <div class="mission-foot">
              <Stars count={progress.stars[m.id] ?? 0} />
              <span>
                {progress.best[m.id]
                  ? `bester Wert: ${progress.best[m.id]}`
                  : 'noch nicht gespielt'}
              </span>
            </div>
          </a>
        ))}
      </div>
      <section class="reset-box" aria-label="Fortschritt löschen">
        <p class="small muted">
          Neu anfangen? Das löscht die Sterne aller Missionen, den Quiz-Rekord, Lunas Sterne und die
          ganze Raketenwerft (Punkte, Hangar, Satelliten) auf diesem Gerät.
        </p>
        <ConfirmButton
          class="btn small"
          label="Allen Fortschritt löschen"
          confirm="Wirklich alles löschen?"
          onConfirm={() => setProgress(resetAllProgress())}
        />
      </section>
    </div>
  );
}
