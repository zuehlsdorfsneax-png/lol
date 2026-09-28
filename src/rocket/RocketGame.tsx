import './game.css';
import { useEffect, useRef, useState } from 'preact/hooks';
import { progressStore, resetRocketCareer } from '../missions/progress';
import { Builder } from './Builder';
import { CHALLENGES, type Challenge, type ChallengeResult } from './challenges';
import { FlightScreen } from './FlightScreen';
import { PAINTS } from './draw';
import { MAX_SATELLITES, type GoalId, type Satellite } from './flight';
import { careerPoints } from './goals';
import { TEMPLATES, isPart, type Design } from './parts';
import { readSandbox, type SandboxSettings } from './sandbox';

function loadDesign(): Design {
  const saved = progressStore.load().rocketDesign;
  if (Array.isArray(saved) && saved.length > 0 && saved.every((id) => isPart(id))) return saved;
  return [...TEMPLATES[0]!.parts];
}

function loadStars(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, r] of Object.entries(progressStore.load().rocketChallenges ?? {}))
    out[id] = r.stars;
  return out;
}

/** Gespeicherte Satelliten prüfen (alte oder kaputte Einträge werden verworfen). */
function loadSats(): Satellite[] {
  const raw = progressStore.load().rocketSats;
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((s): s is Satellite => {
    const q = s as Partial<Satellite>;
    return (
      typeof q?.name === 'string' &&
      typeof q.body === 'string' &&
      typeof q.el === 'object' &&
      q.el !== null &&
      Number.isFinite(q.el.a) &&
      Number.isFinite(q.el.n)
    );
  });
  // Ältere Versionen haben Nummern doppelt vergeben: doppelte bekommen eine neue.
  const seen = new Set<number>();
  let next = Math.max(0, ...valid.map((s) => (Number.isFinite(s.id) ? s.id : 0))) + 1;
  return valid.map((s) => {
    if (Number.isFinite(s.id) && !seen.has(s.id)) {
      seen.add(s.id);
      return s;
    }
    const id = next++;
    seen.add(id);
    return { ...s, id };
  });
}

export type Tab = 'werft' | 'herausforderungen' | 'karriere';

/**
 * Setzt alle Geschwister von `el` und seinen Vorfahren auf `inert`: Nur `el` bleibt bedienbar.
 * Gibt eine Funktion zurück, die das wieder aufhebt.
 */
function isolate(el: HTMLElement): () => void {
  const changed: HTMLElement[] = [];
  for (let node: HTMLElement | null = el; node?.parentElement; node = node.parentElement) {
    for (const sib of Array.from(node.parentElement.children)) {
      if (sib !== node && sib instanceof HTMLElement && !sib.inert) {
        sib.inert = true;
        changed.push(sib);
      }
    }
    if (node.parentElement === document.body) break;
  }
  return () => changed.forEach((s) => (s.inert = false));
}

/** Welche Stern-Bedingungen einer Herausforderung schon einmal erfüllt wurden. */
function bestMet(id: string): boolean[] {
  const r = progressStore.load().rocketChallenges?.[id];
  if (!r) return [false, false, false];
  // Ältere Spielstände kennen nur die Anzahl der Sterne.
  return r.met ?? [0, 1, 2].map((i) => i < r.stars);
}

/**
 * Das Spiel läuft als eigener Bildschirm über der ganzen App – wie ein richtiges Spiel.
 * Schließen führt zurück auf die Seite der Raketenwerft.
 */
export function RocketGame({
  startTab = 'werft',
  onClose,
}: {
  startTab?: Tab;
  onClose: () => void;
}) {
  const [design, setDesign] = useState<Design>(loadDesign);
  const [flying, setFlying] = useState(false);
  const [tab, setTab] = useState<Tab>(startTab);
  const root = useRef<HTMLDivElement>(null);
  const [backPressed, setBackPressed] = useState(0);
  const flyingRef = useRef(false);
  flyingRef.current = flying;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('game-open');
    root.current?.focus({ preventScroll: true });
    // Alles außer dem Spiel ist nicht erreichbar (Tab, Screenreader), solange es offen ist.
    const release = root.current ? isolate(root.current) : () => undefined;
    // Eigener Verlaufseintrag: Die Zurück-Taste schließt das Spiel statt die Seite zu wechseln.
    let own = false;
    try {
      history.pushState({ ...(history.state as object | null), orbitGame: true }, '');
      own = true;
    } catch {
      // Ohne Verlauf (z. B. in manchen eingebetteten Ansichten) bleibt nur der Schließen-Knopf.
    }
    const onPop = (): void => {
      if (flyingRef.current) {
        // Im Flug: Eintrag wiederherstellen und das Pausenmenü öffnen.
        try {
          history.pushState({ ...(history.state as object | null), orbitGame: true }, '');
        } catch {
          // egal
        }
        setBackPressed((n) => n + 1);
      } else {
        own = false;
        closeRef.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      release();
      html.classList.remove('game-open');
      window.removeEventListener('popstate', onPop);
      if (own && (history.state as { orbitGame?: boolean } | null)?.orbitGame) history.back();
    };
  }, []);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [goals, setGoals] = useState<string[]>(() => progressStore.load().rocketGoals);
  const [paint, setPaintId] = useState<string>(() => progressStore.load().rocketPaint);
  const [stars, setStars] = useState<Record<string, number>>(loadStars);
  const [sats, setSats] = useState<Satellite[]>(loadSats);
  const [sandbox, setSandbox] = useState(false);
  const [sandboxSettings, setSandboxSettings] = useState<SandboxSettings>(() =>
    readSandbox(progressStore.load().rocketSandbox),
  );
  const changeSandbox = (s: SandboxSettings): void => {
    setSandboxSettings(s);
    progressStore.update((p) => ({ ...p, rocketSandbox: s }));
  };
  const [flightId, setFlightId] = useState(0);

  const change = (d: Design): void => {
    setDesign(d);
    progressStore.update((p) => ({ ...p, rocketDesign: d }));
  };

  const choosePaint = (id: string): void => {
    setPaintId(id);
    progressStore.update((p) => ({ ...p, rocketPaint: id }));
  };

  const reachGoal = (id: GoalId): void => {
    if (sandbox) return;
    setGoals((old) => (old.includes(id) ? old : [...old, id]));
    progressStore.update((p) =>
      p.rocketGoals.includes(id) ? p : { ...p, rocketGoals: [...p.rocketGoals, id] },
    );
  };

  /** Liste aus der Missionskontrolle (Karriere und Sandkasten zusammen). */
  const saveSats = (list: Satellite[]): void => {
    setSats(list);
    progressStore.update((p) => ({ ...p, rocketSats: list }));
  };

  /** Liste aus einem Flug: ersetzt nur die Satelliten dieses Modus. */
  const saveFlightSats = (list: Satellite[]): void => {
    const byId = new Map<number, Satellite>();
    for (const s of sats.filter((q) => !!q.sandbox !== sandbox)) byId.set(s.id, s);
    for (const s of list.slice(-MAX_SATELLITES)) byId.set(s.id, s);
    saveSats([...byId.values()]);
  };

  const finishChallenge = (id: string, r: ChallengeResult): void => {
    if (!r.success) return;
    // Jede Stern-Bedingung zählt für sich – auch wenn sie in verschiedenen Flügen erfüllt wurde.
    const old = progressStore.load().rocketChallenges?.[id];
    const oldMet = bestMet(id);
    const met = [0, 1, 2].map((i) => !!(r.met?.[i] ?? i < r.stars) || !!oldMet[i]);
    const count = Math.max(old?.stars ?? 0, met.filter(Boolean).length);
    const text = !old || r.stars >= old.stars ? r.text : old.text;
    setStars((s) => ({ ...s, [id]: count }));
    progressStore.update((p) => ({
      ...p,
      rocketChallenges: { ...p.rocketChallenges, [id]: { stars: count, text, met } },
    }));
  };

  const startChallenge = (c: Challenge): void => {
    setChallenge(c);
    setFlightId((n) => n + 1);
    setFlying(true);
  };

  const next = challenge ? CHALLENGES[CHALLENGES.indexOf(challenge) + 1] : undefined;
  // Im Sandkasten gewählte, noch gesperrte Lackierungen gelten draußen nicht.
  const paintPoints = PAINTS.find((q) => q.id === paint)?.points ?? 0;
  const shownPaint = sandbox || paintPoints <= careerPoints(goals, stars) ? paint : 'klassisch';

  return (
    <div class="game" ref={root} tabIndex={-1} role="region" aria-label="Raketenwerft – Spiel">
      {flying ? (
        <FlightScreen
          key={flightId}
          design={design}
          paint={shownPaint}
          sandbox={sandbox}
          sandboxSettings={sandboxSettings}
          knownGoals={goals}
          stars={stars}
          satellites={sats}
          challenge={challenge}
          bestStars={challenge ? (stars[challenge.id] ?? 0) : 0}
          bestMet={challenge ? bestMet(challenge.id) : []}
          onGoal={reachGoal}
          onSatellites={saveFlightSats}
          onChallenge={finishChallenge}
          onNextChallenge={next ? () => startChallenge(next) : null}
          backPressed={backPressed}
          onExit={() => {
            setFlying(false);
            if (challenge) setTab('herausforderungen');
            setChallenge(null);
          }}
        />
      ) : (
        <Builder
          tab={tab}
          onTab={setTab}
          design={design}
          goals={goals}
          stars={stars}
          satellites={sats}
          onSatellites={saveSats}
          paint={shownPaint}
          onPaint={choosePaint}
          onChange={change}
          onLaunch={() => {
            setChallenge(null);
            setFlightId((n) => n + 1);
            setFlying(true);
          }}
          onChallenge={startChallenge}
          sandbox={sandbox}
          onSandbox={setSandbox}
          sandboxSettings={sandboxSettings}
          onSandboxSettings={changeSandbox}
          onClose={onClose}
          onResetCareer={() => {
            resetRocketCareer();
            setGoals([]);
            setStars({});
            setSats([]);
            setPaintId('klassisch');
          }}
        />
      )}
    </div>
  );
}
