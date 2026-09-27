import { useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { Builder } from './Builder';
import { FlightScreen } from './FlightScreen';
import type { GoalId } from './flight';
import { TEMPLATES, isPart, type Design } from './parts';

function loadDesign(): Design {
  const saved = progressStore.load().rocketDesign;
  if (Array.isArray(saved) && saved.length > 0 && saved.every((id) => isPart(id))) return saved;
  return [...TEMPLATES[0]!.parts];
}

export function RocketGame() {
  const [design, setDesign] = useState<Design>(loadDesign);
  const [flying, setFlying] = useState(false);
  const [goals, setGoals] = useState<string[]>(() => progressStore.load().rocketGoals);
  const [paint, setPaintId] = useState<string>(() => progressStore.load().rocketPaint);

  const change = (d: Design): void => {
    setDesign(d);
    progressStore.update((p) => ({ ...p, rocketDesign: d }));
  };

  const choosePaint = (id: string): void => {
    setPaintId(id);
    progressStore.update((p) => ({ ...p, rocketPaint: id }));
  };

  const reachGoal = (id: GoalId): void => {
    setGoals((old) => (old.includes(id) ? old : [...old, id]));
    progressStore.update((p) =>
      p.rocketGoals.includes(id) ? p : { ...p, rocketGoals: [...p.rocketGoals, id] },
    );
  };

  return flying ? (
    <FlightScreen
      design={design}
      paint={paint}
      knownGoals={goals}
      onGoal={reachGoal}
      onExit={() => setFlying(false)}
    />
  ) : (
    <Builder
      design={design}
      goals={goals}
      paint={paint}
      onPaint={choosePaint}
      onChange={change}
      onLaunch={() => setFlying(true)}
    />
  );
}
