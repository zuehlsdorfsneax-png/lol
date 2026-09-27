import { useMemo } from 'preact/hooks';
import { MISSIONS } from '../missions/missions';
import { progressStore } from '../missions/progress';
import { Stars } from '../missions/Stars';
import { PageHead } from '../ui/content';

const DIFFICULTY = ['', 'leicht', 'mittel', 'schwer'];

export function MissionsPage() {
  const progress = useMemo(() => progressStore.load(), []);
  const total = MISSIONS.reduce((s, m) => s + (progress.stars[m.id] ?? 0), 0);
  return (
    <div class="stack" style={{ gap: '22px', maxWidth: '1100px' }}>
      <PageHead eyebrow="Spielen" title="Missionen">
        Neun Aufträge, in denen du die Grenzen der Stabilität selbst findest. Jede Mission gibt bis
        zu drei Sterne – der dritte verlangt, dass du die Grenze fast genau triffst.
      </PageHead>
      <div class="row">
        <Stars count={3} size={20} label={false} />
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
    </div>
  );
}
