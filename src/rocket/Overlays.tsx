import type { ComponentChildren } from 'preact';
import { Icon } from '../ui/Icon';
import type { Challenge, ChallengeResult } from './challenges';
import { Dialog } from './Dialog';
import type { Flight, FlightSnapshot } from './flight';
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
    ['Größter Staudruck (Max Q)', `${fmt(s.maxQ / 1000, 1)} kPa`],
    ['Verbrauchtes Δv', `${fmt(s.dvUsed)} m/s`],
    ['Verbrannter Treibstoff', `${fmt(s.fuelUsed / 1000, 1)} t`],
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
    <Dialog class="report" label={title}>
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
    </Dialog>
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
    <Dialog class="brief" label={challenge.title}>
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
    </Dialog>
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
    <Dialog class="result" label="Ergebnis">
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
    </Dialog>
  );
}

/** Einführung beim ersten Flug: vier Schritte, je nach Gerät mit Knöpfen oder Tasten erklärt. */
const GUIDE: readonly { title: string; text: (touch: boolean) => string }[] = [
  {
    title: 'Abheben',
    text: (touch) =>
      touch
        ? 'Tippe auf START oder schiebe den Schubregler rechts unten nach oben. Die Rakete hebt ab, sobald ihr Schub größer ist als ihr Gewicht.'
        : 'Z gibt Vollgas, W und S (oder ↑ ↓) regeln den Schub fein. Die Rakete hebt ab, sobald ihr Schub größer ist als ihr Gewicht.',
  },
  {
    title: 'Lenken',
    text: (touch) =>
      `${touch ? 'Mit den runden Pfeilen links unten' : 'Mit A und D (oder ← →)'} neigst du die Rakete. Für eine Umlaufbahn ab etwa 1 km Höhe langsam zur Seite kippen. Die Lageanzeige zeigt dir mit dem grünen Kreis, wohin du gerade fliegst.`,
  },
  {
    title: 'Stufen abwerfen',
    text: (touch) =>
      `Ist ein Tank leer, wirf ihn ab (${touch ? 'Knopf STUFE' : 'Leertaste'}): Die Rakete wird leichter und fliegt mit der nächsten Stufe weiter. Zum Schluss bringt dich der Fallschirm sicher zurück.`,
  },
  {
    title: 'Karte und Hilfe-Pilot',
    text: (touch) =>
      `Die Karte (${touch ? 'oben links' : 'M'}) zeigt deine Bahn. Der Hilfe-Pilot (${touch ? 'Knopf rechts' : 'T'}) fliegt für dich – in eine Umlaufbahn oder, wenn das Δv nicht reicht, einen Hüpfer. Δv ist dein Treibstoffvorrat in m/s: Für eine Umlaufbahn braucht es etwa 3.900 m/s.`,
  },
];

/** „heute 14:32“ oder „3. Okt., 14:32“. */
function savedLabel(snap: FlightSnapshot | null): string {
  if (!snap?.savedAt) return '';
  const d = new Date(snap.savedAt);
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? `heute ${time}`
    : `${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}, ${time}`;
}

/** Tasten der Hilfe: Wörter wie „oder“ und „/“ stehen zwischen den Tastenkappen. */
const HELP_ROWS: [string[] | string, string][] = [
  [
    ['W', '/', 'S', 'oder', '↑', '/', '↓'],
    'Schub stufenlos (Umschalt: hoch; mit RCS: vor / zurück)',
  ],
  [['Z', '/', 'X'], 'Vollgas / Triebwerk aus'],
  [['A', '/', 'D', 'oder', '←', '/', '→'], 'Drehen (F: Feinsteuerung)'],
  [['1', 'bis', '7'], 'SAS: aus, prograd, retrograd, radial außen/innen, Ziel, Manöver'],
  ['Gedrückt halten', 'In der Flugansicht: Rakete zeigt in diese Richtung'],
  [['R', 'dann', 'Q', '/', 'E'], 'RCS-Düsen: seitwärts schieben (zum Andocken)'],
  [['Leertaste'], 'Nächste Stufe'],
  [['P'], 'Fallschirm scharf machen, entschärfen oder abwerfen'],
  [['N', '/', 'U'], 'Satellit aussetzen / Luftbremsen'],
  [['M'], 'Karte: Klick auf die Bahn plant ein Manöver, Anfasser ziehen'],
  [['B'], 'Bordcomputer: Pläne, Manöver, Missions-Autopilot'],
  [['L', '/', 'T', '/', 'C'], 'Lande-Autopilot / Hilfe-Pilot / Countdown'],
  [[',', 'und', '.'], 'Zeitraffer langsamer / schneller (Zeitsprung: automatisch vorspulen)'],
  [['F5', '/', 'F9'], 'Spielstand speichern / laden'],
  [['O'], 'Foto speichern (Buchstabe O)'],
  [['Esc', '/', 'H'], 'Menü (Pause, Speichern, Ton, Vollbild) / diese Hilfe'],
  ['Gamepad', 'Stick drehen, Trigger Schub, A Stufe, B Fallschirm, X RCS, Y Karte'],
];

/** Bedienung mit dem Finger (Handy, Tablet). */
const TOUCH_ROWS: [string, string][] = [
  ['Drehen', 'Runde Pfeilknöpfe unten links gedrückt halten'],
  ['Schub', 'Regler rechts hoch- und runterziehen; darunter „Vollgas“ und „Aus“'],
  ['Start und Stufen', 'Großer Knopf rechts: vor dem Start „Start“, im Flug die nächste Stufe'],
  ['Ausrichten', 'In der Flugansicht kurz gedrückt halten: Die Rakete zeigt dorthin'],
  ['SAS', 'Knöpfe an der Lageanzeige: prograd, retrograd, radial, Ziel, Manöver'],
  ['Zoomen', 'Mit zwei Fingern auseinander- oder zusammenziehen'],
  ['Karte', 'Kartenknopf oben links; auf der Karte die Bahn antippen plant ein Manöver'],
  ['Zeitraffer', 'Pfeile oben in der Mitte, der Doppelpfeil daneben springt vor'],
  ['Ziel und Bordcomputer', 'Oben rechts'],
  ['Menü', 'Knopf oben links: Pause, Speichern, Ton, Vollbild, Hilfe'],
];

function KeyTable() {
  return (
    <table class="table">
      <tbody>
        {HELP_ROWS.map(([keys, text]) => (
          <tr key={text}>
            <td class="keys">
              <KeyCaps keys={keys} />
            </td>
            <td>{text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const KEY_JOINERS = new Set(['/', 'oder', 'und', 'dann', 'bis']);

function KeyCaps({ keys }: { keys: string[] | string }) {
  if (typeof keys === 'string') return <span class="key-word">{keys}</span>;
  return (
    <>
      {keys.map((k, i) =>
        KEY_JOINERS.has(k) ? (
          <span key={i} class="key-join">
            {k}
          </span>
        ) : (
          <kbd key={i}>{k}</kbd>
        ),
      )}
    </>
  );
}

export function PauseMenu({
  confirm,
  inChallenge,
  saved,
  muted,
  fileExport,
  onResume,
  onRestart,
  onSave,
  onLoad,
  onPhoto,
  onHelp,
  onToggleMute,
  onFullscreen,
  onExit,
}: {
  confirm: 'restart' | 'exit' | null;
  inChallenge: boolean;
  saved: FlightSnapshot | null;
  muted: boolean;
  fileExport: boolean;
  onResume: () => void;
  onRestart: () => void;
  onSave: () => void;
  onLoad: () => void;
  onPhoto: () => void;
  onHelp: () => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onExit: () => void;
}) {
  return (
    <Dialog class="pause-menu" label="Menü">
      <h3>Pause</h3>
      <div class="menu-list">
        <button type="button" class="mbtn primary" onClick={onResume}>
          <Icon name="play" /> Weiterfliegen <kbd>Esc</kbd>
        </button>
        <button type="button" class="mbtn" onClick={onRestart}>
          <Icon name="reset" /> {confirm === 'restart' ? 'Wirklich neu starten?' : 'Neustart'}
          {confirm === 'restart' && <small class="mbtn-note">Der Flug geht verloren</small>}
        </button>
        {!inChallenge && (
          <>
            <button type="button" class="mbtn" onClick={onSave}>
              <Icon name="save" /> Spielstand speichern <kbd>F5</kbd>
            </button>
            <button
              type="button"
              class="mbtn"
              onClick={onLoad}
              disabled={!saved}
              title={saved ? `Gespeichert ${savedLabel(saved)}` : 'Noch kein Spielstand'}
            >
              <Icon name="folder" /> Spielstand laden
              {saved?.savedAt ? <small class="mbtn-note">{savedLabel(saved)}</small> : null}
              <kbd>F9</kbd>
            </button>
          </>
        )}
        {fileExport && (
          <button type="button" class="mbtn" onClick={onPhoto}>
            <Icon name="camera" /> Foto speichern <kbd>O</kbd>
          </button>
        )}
        <button type="button" class="mbtn" onClick={onHelp}>
          <Icon name="quiz" /> Steuerung <kbd>H</kbd>
        </button>
        <div class="menu-split">
          <button type="button" class="mbtn" onClick={onToggleMute} aria-pressed={muted}>
            <Icon name={muted ? 'mute' : 'sound'} /> {muted ? 'Ton einschalten' : 'Ton ausschalten'}
          </button>
          <button
            type="button"
            class="mbtn"
            onClick={onFullscreen}
            disabled={!document.fullscreenEnabled}
            title={
              document.fullscreenEnabled ? 'Vollbild an/aus' : 'Vollbild ist hier nicht erlaubt'
            }
          >
            <Icon name="expand" /> Vollbild
          </button>
        </div>
        <button type="button" class={`mbtn ${confirm === 'exit' ? 'warn' : ''}`} onClick={onExit}>
          <Icon name="wrench" />{' '}
          {confirm === 'exit' ? 'Wirklich verlassen?' : inChallenge ? 'Zur Übersicht' : 'Zur Werft'}
          {confirm === 'exit' && (
            <small class="mbtn-note">
              {inChallenge ? 'Der Versuch endet' : 'Nicht gespeicherter Flug geht verloren'}
            </small>
          )}
        </button>
      </div>
    </Dialog>
  );
}

export function HelpDialog({
  touch,
  onGuide,
  onClose,
}: {
  touch: boolean;
  onGuide: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog class="help" label="Hilfe">
      <h3>Steuerung</h3>
      {touch && (
        <table class="table">
          <tbody>
            {TOUCH_ROWS.map(([what, how]) => (
              <tr key={what}>
                <th scope="row">{what}</th>
                <td>{how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {touch ? (
        <details class="help-keys">
          <summary>Mit Tastatur</summary>
          <KeyTable />
        </details>
      ) : (
        <KeyTable />
      )}
      <div class="guide-actions">
        <button type="button" class="btn" onClick={onGuide}>
          Einführung ansehen
        </button>
        <button type="button" class="btn primary" onClick={onClose}>
          Verstanden
        </button>
      </div>
    </Dialog>
  );
}

export function GuideDialog({
  step,
  touch,
  onStep,
  onClose,
}: {
  step: number;
  touch: boolean;
  onStep: (step: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog class="guide" label="Einführung: dein erster Flug">
      <span class="guide-step">
        Erster Flug · {step + 1} von {GUIDE.length}
      </span>
      <h3>{GUIDE[step]!.title}</h3>
      <p>{GUIDE[step]!.text(touch)}</p>
      <div class="guide-dots" aria-hidden="true">
        {GUIDE.map((_, i) => (
          <span key={i} class={i === step ? 'on' : ''} />
        ))}
      </div>
      <div class="guide-actions">
        <button type="button" class="btn ghost" onClick={onClose}>
          Überspringen
        </button>
        <button
          type="button"
          class="btn primary"
          onClick={() => (step + 1 < GUIDE.length ? onStep(step + 1) : onClose())}
        >
          {step + 1 < GUIDE.length ? 'Weiter' : 'Los geht’s!'}
        </button>
      </div>
    </Dialog>
  );
}

export function CrashDialog({
  f,
  canLoad,
  onRestart,
  onLoad,
  onExit,
}: {
  f: Flight;
  canLoad: boolean;
  onRestart: () => void;
  onLoad: () => void;
  onExit: () => void;
}) {
  return (
    <Dialog label="Absturz">
      <h3>
        {f.crashReason.includes('verglüht')
          ? 'Verglüht!'
          : f.crashReason.includes('Gashülle')
            ? 'Verschluckt!'
            : 'Bumm! Die Rakete ist zerschellt.'}
      </h3>
      <p>{f.crashReason}</p>
      <details class="report-more">
        <summary>Flugdaten</summary>
        <FlightStatsTable f={f} />
      </details>
      <div class="btn-row">
        <button type="button" class="btn primary" onClick={onRestart}>
          <Icon name="reset" /> Nochmal starten
        </button>
        {canLoad && (
          <button type="button" class="btn" onClick={onLoad}>
            Spielstand laden
          </button>
        )}
        <button type="button" class="btn" onClick={onExit}>
          Zurück zur Werft
        </button>
      </div>
    </Dialog>
  );
}
