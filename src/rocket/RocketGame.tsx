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

  const change = (d: Design): void => {
    setDesign(d);
    progressStore.update((p) => ({ ...p, rocketDesign: d }));
  };

  const reachGoal = (id: GoalId): void => {
    if (goals.includes(id)) return;
    const next = [...goals, id];
    setGoals(next);
    progressStore.update((p) => ({
      ...p,
      rocketGoals: Array.from(new Set([...p.rocketGoals, id])),
    }));
  };

  return flying ? (
    <FlightScreen
      design={design}
      knownGoals={goals}
      onGoal={reachGoal}
      onExit={() => setFlying(false)}
    />
  ) : (
    <Builder design={design} onChange={change} onLaunch={() => setFlying(true)} />
  );
}
