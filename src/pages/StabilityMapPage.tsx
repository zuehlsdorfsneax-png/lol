import { StabilityMap } from '../stability/StabilityMap';
import { Callout, PageHead } from '../ui/content';

export function StabilityMapPage({ preset }: { preset: string | null }) {
  return (
    <div class="stack" style={{ gap: '18px', maxWidth: '1100px' }}>
      <PageHead eyebrow="Werkzeug · Eigenanteil" title="Stabilitätskarte">
        Jedes Feld der Karte ist eine eigene Simulation über viele Jahre. Die Farbe zeigt, was mit
        dem Mond passiert. So wird sichtbar, wo genau die Grenzen der Stabilität liegen – und wie
        gut die Theorie (Linien) sie vorhersagt.
      </PageHead>
      <section class="panel panel-pad">
        <StabilityMap preset={preset} />
      </section>
      <Callout kind="seminar">
        Die Karte beantwortet die Problemfrage direkt: Sie zeigt für jede Kombination zweier
        Parameter, ob der Mond stabil bleibt, abstürzt oder entkommt. Für die Arbeit eignen sich
        besonders die Karten „Abstand × Geschwindigkeit“ (prograd und retrograd) und „Erdabstand ×
        Sonnenmasse“. Mit „Bild“ und „CSV“ lassen sich Grafik und Rohdaten exportieren. Die
        Simulationsdauer je Feld sollte dabei angegeben werden.
      </Callout>
    </div>
  );
}
