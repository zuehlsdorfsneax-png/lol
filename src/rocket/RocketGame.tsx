import { useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { Builder } from './Builder';
import { CHALLENGES, type Challenge, type ChallengeResult } from './challenges';
import { FlightScreen } from './FlightScreen';
import { MAX_SATELLITES, type GoalId, type Satellite } from './flight';
import { TEMPLATES, isPart, type Design } from './parts';

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
  return raw.filter((s): s is Satellite => {
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
}

export type Tab = 'werft' | 'herausforderungen';

export function RocketGame() {
  const [design, setDesign] = useState<Design>(loadDesign);
  const [flying, setFlying] = useState(false);
  const [tab, setTab] = useState<Tab>('werft');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [goals, setGoals] = useState<string[]>(() => progressStore.load().rocketGoals);
  const [paint, setPaintId] = useState<string>(() => progressStore.load().rocketPaint);
  const [stars, setStars] = useState<Record<string, number>>(loadStars);
  const [sats, setSats] = useState<Satellite[]>(loadSats);
  const [sandbox, setSandbox] = useState(false);
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

  const saveSats = (list: Satellite[]): void => {
    const next = list.slice(-MAX_SATELLITES);
    setSats(next);
    progressStore.update((p) => ({ ...p, rocketSats: next }));
  };

  const finishChallenge = (id: string, r: ChallengeResult): void => {
    if (!r.success) return;
    setStars((old) => ({ ...old, [id]: Math.max(old[id] ?? 0, r.stars) }));
    progressStore.update((p) => {
      const old = p.rocketChallenges?.[id];
      if (old && old.stars >= r.stars) return p;
      return {
        ...p,
        rocketChallenges: { ...p.rocketChallenges, [id]: { stars: r.stars, text: r.text } },
      };
    });
  };

  const startChallenge = (c: Challenge): void => {
    setChallenge(c);
    setFlightId((n) => n + 1);
    setFlying(true);
  };

  const next = challenge ? CHALLENGES[CHALLENGES.indexOf(challenge) + 1] : undefined;

  return flying ? (
    <FlightScreen
      key={flightId}
      design={design}
      paint={paint}
      sandbox={sandbox}
      knownGoals={goals}
      stars={stars}
      satellites={sats}
      challenge={challenge}
      bestStars={challenge ? (stars[challenge.id] ?? 0) : 0}
      onGoal={reachGoal}
      onSatellites={saveSats}
      onChallenge={finishChallenge}
      onNextChallenge={next ? () => startChallenge(next) : null}
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
      paint={paint}
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
    />
  );
}
