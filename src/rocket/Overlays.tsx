import type { ComponentChildren } from 'preact';
import { Icon } from '../ui/Icon';
import type { Challenge, ChallengeResult } from './challenges';
import type { Flight } from './flight';
import { clock, distance, fmt } from './format';
import { goalById, type GoalId } from './goals';
import { bodyById } from './world';

/** Statistik eines Flugs (für Flugbericht und Absturzmeldung). */
export function FlightStatsTable({ f }: { f: Flight }) {
  const s = f.stats;
  const visited = [...f.visited].map((id) => bodyById(id).name);
  const rows: [string, string][] = [
    ['Flugzeit', clock(f.t - (s.liftoff ?? 0))],
    ['Höchste Höhe über der Erde', distance(f.maxAltitude)],
    ['Höchstes Tempo', `${fmt(s.maxSpeed)} m/s`],
    ['Stärkste Belastung', `${fmt(s.maxG, 1)} g`],
    ['Verbrauchtes Δv', `${fmt(s.dvUsed)} m/s`],
    ['Flugstrecke', distance(s.distance)],
    ['Höchste Hitze', `${Math.round(f.maxHeat * 100)} %`],
    ['Landungen', String(s.landings)],
  ];
  if (visited.length) rows.push(['Einflussbereiche', visited.join(', ')]);
  return (
    <dl class="report-grid">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FlightReport({
  f,
  title,
  newGoals,
  children,
}: {
  f: Flight;
  title: string;
  newGoals: GoalId[];
  children: ComponentChildren;
}) {
  return (
    <div class="rocket-overlay report" role="dialog" aria-label={title}>
      <h3>{title}</h3>
      <FlightStatsTable f={f} />
      {newGoals.length > 0 && (
        <ul class="report-goals">
          {newGoals.map((g) => (
            <li key={g}>
              ★ {goalById(g).title} <span class="pts">+{goalById(g).points}</span>
            </li>
          ))}
        </ul>
      )}
      <div class="btn-row">{children}</div>
    </div>
  );
}

function Stars({ n, animate = false }: { n: number; animate?: boolean }) {
  return (
    <div class={`stars ${animate ? 'animate' : ''}`} role="img" aria-label={`${n} von 3 Sternen`}>
      {[0, 1, 2].map((i) => (
        <span key={i} class={i < n ? 'on' : ''} style={{ animationDelay: `${0.25 + i * 0.35}s` }}>
          ★
        </span>
      ))}
    </div>
  );
}

export function ChallengeBrief({
  challenge,
  best,
  onStart,
  onExit,
}: {
  challenge: Challenge;
  /** Je Stern-Bedingung: schon einmal erfüllt? */
  best: boolean[];
  onStart: () => void;
  onExit: () => void;
}) {
  return (
    <div class="rocket-overlay brief" role="dialog" aria-label={challenge.title}>
      <span class="eyebrow">{challenge.group}</span>
      <h3>{challenge.title}</h3>
      <p>{challenge.brief}</p>
      <ol class="star-goals">
        {challenge.stars.map((s, i) => (
          <li key={s} class={best[i] ? 'done' : ''}>
            <span aria-hidden="true">★</span> {s}
            {best[i] && <span class="visually-hidden"> (schon geschafft)</span>}
          </li>
        ))}
      </ol>
      <ul class="brief-tips">
        {challenge.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {!challenge.computer && (
        <p class="small muted">Ohne Bordcomputer – hier zählt dein Können.</p>
      )}
      <div class="btn-row">
        <button type="button" class="btn primary" onClick={onStart}>
          Los geht’s!
        </button>
        <button type="button" class="btn" onClick={onExit}>
          Zurück
        </button>
      </div>
    </div>
  );
}

export function ChallengeResultView({
  challenge,
  result,
  best,
  bestMet,
  f,
  onRetry,
  onNext,
  onContinue,
  onExit,
}: {
  challenge: Challenge;
  result: ChallengeResult;
  best: number;
  bestMet: boolean[];
  f: Flight;
  onRetry: () => void;
  onNext: (() => void) | null;
  onContinue: (() => void) | null;
  onExit: () => void;
}) {
  return (
    <div class="rocket-overlay result" role="dialog" aria-label="Ergebnis">
      <span class="eyebrow">{challenge.title}</span>
      <h3>
        {result.success ? (result.stars === 3 ? 'Perfekt!' : 'Geschafft!') : 'Nicht geschafft'}
      </h3>
      <Stars n={result.stars} animate />
      <p>{result.text}</p>
      {result.success && (
        // Jede Bedingung einzeln: Die Sterne 2 und 3 hängen oft nicht voneinander ab.
        <ol class="star-goals">
          {challenge.stars.map((s, i) => {
            const now = result.met?.[i] ?? i < result.stars;
            return (
              <li key={s} class={now ? 'done' : bestMet[i] ? 'earlier' : ''}>
                <span aria-hidden="true">{now ? '★' : '☆'}</span> {s}
                {!now && bestMet[i] && <span class="small muted"> – schon früher geschafft</span>}
              </li>
            );
          })}
        </ol>
      )}
      {result.success && best > result.stars && (
        <p class="small muted">Dein Rekord: {best} Sterne.</p>
      )}
      <details class="report-more">
        <summary>Flugdaten</summary>
        <FlightStatsTable f={f} />
      </details>
      <div class="btn-row">
        <button type="button" class="btn primary" onClick={onRetry}>
          <Icon name="reset" /> Nochmal
        </button>
        {onNext && (
          <button type="button" class="btn" onClick={onNext}>
            Nächste Herausforderung
          </button>
        )}
        {onContinue && (
          <button type="button" class="btn" onClick={onContinue}>
            Weiterfliegen
          </button>
        )}
        <button type="button" class="btn" onClick={onExit}>
          Zur Übersicht
        </button>
      </div>
    </div>
  );
}
