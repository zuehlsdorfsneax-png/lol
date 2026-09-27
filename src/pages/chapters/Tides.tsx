import { useMemo, useState } from 'preact/hooks';
import {
  DAY,
  EARTH_HILL_RADIUS,
  KM,
  MOON,
  dayLength,
  monthLength,
  synchronousDistance,
} from '../../physics';
import { LineChart } from '../../ui/charts/LineChart';
import { Callout, Equation, Figure, SectionTitle, Tex } from '../../ui/content';
import { Slider } from '../../ui/controls';
import { fmt } from '../../ui/format';

/** Abstand, bei dem der Erdtag die Länge `hours` hat (Bisektion im Modell). */
function distanceForDay(hours: number): number {
  let lo = 2e8;
  let hi: number = MOON.semiMajorAxis;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (dayLength(mid) / 3600 < hours) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function Tides() {
  const sync = synchronousDistance();
  const past = distanceForDay(21.9);
  return (
    <>
      <div class="prose">
        <SectionTitle n="6.1">Wie Gezeiten entstehen</SectionTitle>
        <p>
          Die Anziehung des Mondes ist auf der ihm zugewandten Seite der Erde etwas stärker als im
          Erdmittelpunkt und auf der abgewandten Seite etwas schwächer. Dieser Unterschied – die
          <strong> differenzielle Gravitation</strong> oder Gezeitenkraft – zieht die Ozeane zu zwei
          Flutbergen auseinander: einem zum Mond hin und einem auf der Gegenseite. Da sich die Erde
          unter diesen Flutbergen hinwegdreht, gibt es an den meisten Küsten zweimal täglich
          Hochwasser.
        </p>
        <Equation
          tex={String.raw`a_\text{Gez} \approx \frac{2\,G M_\text{Mond}\,R_\oplus}{r^3}`}
          n="6.1"
        />
        <p>
          Die Gezeitenkraft fällt mit <Tex>{'1/r^3'}</Tex> ab. Deshalb ist der Mond für die Gezeiten
          etwa doppelt so wichtig wie die viel schwerere, aber 390-mal weiter entfernte Sonne.
          Stehen beide in einer Linie (Neu- und Vollmond), addieren sich ihre Wirkungen zur
          Springflut.
        </p>

        <SectionTitle n="6.2">Drehimpulsübertragung zwischen Erde und Mond</SectionTitle>
        <p>
          Die Erde dreht sich in einem Tag, der Mond umläuft sie in 27 Tagen. Durch Reibung in den
          Ozeanen werden die Flutberge von der Erdrotation etwas mitgenommen und eilen dem Mond
          voraus. Der vorauseilende Flutberg zieht den Mond nach vorne und beschleunigt ihn;
          umgekehrt bremst der Mond die Erdrotation. Dabei geht Drehimpuls von der Erdrotation auf
          die Mondbahn über. Der Gesamtdrehimpuls bleibt erhalten:
        </p>
        <Equation
          tex={String.raw`L = \underbrace{I_\oplus\,\omega_\oplus}_{\text{Erdrotation}} + \underbrace{\mu\,\sqrt{G(M_\oplus+M_\text{Mond})\,a}}_{\text{Mondbahn}} = \text{konst.}`}
          n="6.2"
        />
        <p>
          Mit mehr Bahndrehimpuls wandert der Mond nach außen. Gemessen wird das mit Laserstrahlen,
          die an den von den Apollo-Astronauten aufgestellten Reflektoren zurückgeworfen werden: Der
          Mond entfernt sich um <strong>3,8 cm pro Jahr</strong>, und der Tag wird um etwa 2
          Millisekunden pro Jahrhundert länger.
        </p>
      </div>

      <Figure
        n="6.1"
        caption="Modell nach Gleichung (6.2): Länge von Erdtag und Mondmonat in Abhängigkeit vom Mondabstand. Wo sich die Kurven treffen, dreht sich die Erde so langsam, wie der Mond sie umläuft – die Entwicklung endet."
      >
        <TideExplorer />
      </Figure>

      <div class="prose">
        <SectionTitle n="6.3">Langfristige Entwicklung des Systems</SectionTitle>
        <p>
          Rechnet man mit (6.2) rückwärts, war der Mond früher näher und der Tag kürzer.
          Versteinerte Gezeitenablagerungen aus der Zeit vor etwa 620 Millionen Jahren zeigen rund
          400 Tage pro Jahr – ein Tag dauerte nur etwa 21,9 Stunden. Nach dem Modell stand der Mond
          damals bei etwa {fmt(past / KM / 1000, 0)} 000 km.
        </p>
        <p>
          In die Zukunft gerechnet endet die Entwicklung erst, wenn ein Erdtag so lang ist wie ein
          Monat: bei etwa <strong>{fmt(sync / KM / 1000, 0)} 000 km</strong> und{' '}
          <strong>{fmt(monthLength(sync) / DAY, 0)} Tagen</strong>. Dann zeigen sich Erde und Mond
          immer dieselbe Seite. Dieser Zustand wird erst in vielen Milliarden Jahren erreicht –
          lange nachdem sich die Sonne zum Roten Riesen aufgebläht hat.
        </p>
        <p>
          Für die Bahnstabilität ist wichtig: Selbst dieser Endabstand liegt bei nur{' '}
          <strong>{fmt(sync / EARTH_HILL_RADIUS, 2)} Hill-Radien</strong>, also deutlich innerhalb
          der Stabilitätsgrenze von etwa 0,48 r_H (Kapitel 5). Die Gezeitenreibung kann den Mond
          also nicht aus dem System treiben.
        </p>
      </div>

      <Callout kind="merke">
        Gezeitenreibung überträgt Drehimpuls von der Erdrotation auf die Mondbahn: Der Tag wird
        länger, der Mond entfernt sich um 3,8 cm pro Jahr. Die Entwicklung endet bei etwa 554 000 km
        – sicher innerhalb der Hill-Sphäre.
      </Callout>
    </>
  );
}

function TideExplorer() {
  const [distKm, setDistKm] = useState(384_400);
  const a = distKm * KM;
  const sync = synchronousDistance();
  const data = useMemo(() => {
    const n = 150;
    const x = new Float64Array(n);
    const day = new Float64Array(n);
    const month = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const d = 250_000 + ((sync / KM - 250_000) * i) / (n - 1);
      x[i] = d / 1000;
      day[i] = dayLength(d * KM) / DAY;
      month[i] = monthLength(d * KM) / DAY;
    }
    return { x, day, month };
  }, []);
  // Jahre bis dahin, falls die heutige Rate konstant bliebe (nur zur Einordnung).
  const years = ((distKm - 384_400) * 1000) / 0.038;
  return (
    <div class="stack" style={{ gap: '14px' }}>
      <LineChart
        series={[
          { id: 'day', label: 'Länge eines Erdtages', x: data.x, y: data.day },
          { id: 'month', label: 'Länge eines Mondmonats', x: data.x, y: data.month },
        ]}
        xLabel="Mondabstand (1000 km)"
        yLabel="Dauer (Tage)"
        xFormat={(v) => fmt(v)}
        yFormat={(v) => fmt(v)}
        valueFormat={(v) => fmt(v, 2)}
        height={240}
      />
      <Slider
        id="tide-distance"
        label="Mondabstand"
        value={distKm}
        min={250_000}
        max={Math.round(sync / KM)}
        step={1000}
        format={(v) => `${fmt(v)} km`}
        hint="heute: 384 400 km"
        onChange={setDistKm}
      />
      <dl class="kv">
        <dt>Länge eines Erdtages</dt>
        <dd>{fmt(dayLength(a) / 3600, 1)} Stunden</dd>
        <dt>Länge eines Mondmonats</dt>
        <dd>{fmt(monthLength(a) / DAY, 1)} Tage</dd>
        <dt>Anteil am Hill-Radius</dt>
        <dd>{fmt(a / EARTH_HILL_RADIUS, 3)} r_H</dd>
        <dt>{years >= 0 ? 'Bei heutiger Rate erreicht in' : 'Bei heutiger Rate vor'}</dt>
        <dd>{fmt(Math.abs(years) / 1e9, 1)} Mrd. Jahren (grobe Schätzung)</dd>
      </dl>
    </div>
  );
}
