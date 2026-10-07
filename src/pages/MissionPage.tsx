import { findMission } from '../missions/missions';
import { L1Game } from '../missions/L1Game';
import { SimMissionPlay } from '../missions/SimMissionPlay';
import { TrojanMission } from '../missions/TrojanMission';
import { LinkButton, PageHead } from '../ui/content';

export function MissionPage({ id }: { id: string }) {
  const m = findMission(id);
  if (!m) {
    return (
      <div class="stack">
        <PageHead eyebrow="Mission" title="Mission nicht gefunden" />
        <LinkButton to="missionen">Zur Übersicht</LinkButton>
      </div>
    );
  }
  return (
    <div class="stack" style={{ gap: 'var(--sp-4)' }}>
      <PageHead eyebrow={`Mission · Kapitel ${m.chapter}`} title={m.title}>
        {m.briefing}
      </PageHead>
      {m.kind === 'sim' ? (
        <SimMissionPlay key={m.id} mission={m} />
      ) : m.kind === 'l1' ? (
        <L1Game mission={m} />
      ) : (
        <TrojanMission mission={m} />
      )}
    </div>
  );
}
