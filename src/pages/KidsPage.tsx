import { LunaGame } from '../kids/LunaGame';
import { PageHead } from '../ui/content';

export function KidsPage() {
  return (
    <div class="stack" style={{ gap: '16px', maxWidth: '920px' }}>
      <PageHead eyebrow="Spielen · auch für Jüngere" title="Lunas Sternenreise">
        Hilf dem kleinen Mond Luna, alle Sterne um die Erde einzusammeln! Die Bahnen berechnet das
        Spiel mit echter Schwerkraft – genau wie der große Simulator.
      </PageHead>
      <LunaGame />
    </div>
  );
}
