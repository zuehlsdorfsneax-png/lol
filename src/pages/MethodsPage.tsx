import { useEffect, useMemo, useState } from 'preact/hooks';
import { DAY, INTEGRATORS } from '../physics';
import { LineChart } from '../ui/charts/LineChart';
import { Callout, Equation, Figure, PageHead, SectionTitle, StatusChip, Tex } from '../ui/content';
import { Segmented } from '../ui/controls';
import { fmt, pow10, sci, sig } from '../ui/format';
import { compareIntegrators, validate, type ValidationRow } from '../validation/validation';

const STEPS = [
  { value: '3600', label: '1 Stunde' },
  { value: '21600', label: '6 Stunden' },
  { value: '86400', label: '1 Tag' },
] as const;

export function MethodsPage() {
  return (
    <article class="chapter">
      <PageHead eyebrow="Anhang" title="Methodik & Validierung">
        Wie der Simulator rechnet, welche Näherungen er macht und wie gut er die Wirklichkeit
        trifft. Dieser Teil dokumentiert den Eigenanteil der Seminararbeit.
      </PageHead>

      <div class="prose">
        <SectionTitle n="A.1">Modell</SectionTitle>
        <ul>
          <li>
            Körper als Punktmassen (nach dem Schalentheorem für Kugeln exakt, siehe Kapitel 1).
          </li>
          <li>Newtonsche Gravitation zwischen allen Körpern mit Masse, Gleichung (2.4).</li>
          <li>
            Bewegung in einer Ebene (2D): Die Neigung der Mondbahn (5,1°) wird vernachlässigt.
          </li>
          <li>Keine weiteren Planeten, keine Gezeitenreibung, keine Relativitätstheorie.</li>
          <li>
            Anfangswerte aus gemessenen Bahnelementen (NASA Fact Sheets); SI-Einheiten,
            64-Bit-Gleitkommazahlen.
          </li>
          <li>
            Einziger angepasster Wert: die Startphase des Mondes (35°). Weil die Sonne die Bahn
            periodisch verformt, hängt die mittlere Bahn davon ab; die Phase ist so gewählt, dass
            der siderische Monat stimmt. Alle anderen Vergleichswerte in A.3 sind davon unabhängige
            Vorhersagen.
          </li>
          <li>
            Ereignisse: Absturz (Abstand kleiner als die Summe der Radien), Roche-Grenze (flüssiger
            Körper), Flucht (weiter als zwei Hill-Radien).
          </li>
        </ul>

        <SectionTitle n="A.2">Numerische Integration</SectionTitle>
        <p>
          Gleichung (2.4) wird in kleinen Zeitschritten <Tex>{'\\Delta t'}</Tex> gelöst. Das
          einfachste Verfahren (Euler) schreibt Ort und Geschwindigkeit mit den Werten vom
          Schrittanfang fort. Der Standard in der Himmelsmechanik ist das{' '}
          <strong>Velocity-Verlet-Verfahren</strong>:
        </p>
        <Equation
          tex={String.raw`\vec v_{n+\frac12} = \vec v_n + \tfrac{\Delta t}{2}\,\vec a(\vec r_n),\quad \vec r_{n+1} = \vec r_n + \Delta t\,\vec v_{n+\frac12},\quad \vec v_{n+1} = \vec v_{n+\frac12} + \tfrac{\Delta t}{2}\,\vec a(\vec r_{n+1}).`}
          n="A.1"
        />
        <p>
          Es ist <em>symplektisch</em>: Es erhält die geometrische Struktur der Bewegung. Die
          Energie schwankt deshalb nur geringfügig, statt über lange Zeit wegzudriften –
          entscheidend, wenn man Stabilität über Jahrhunderte untersuchen will.
        </p>
        <p>
          Die Schrittweite passt sich an: In jedem Schritt wird die kürzeste Zeitskala aller Paare
          bestimmt und ein Bruchteil <Tex>\eta</Tex> davon verwendet:
        </p>
        <Equation
          tex={String.raw`\Delta t = \eta\cdot\min_{i,j}\left(\sqrt{\frac{r_{ij}^3}{G(m_i+m_j)}},\ \frac{r_{ij}}{v_{ij}}\right),\qquad \eta = 0{,}01.`}
          n="A.2"
        />
        <p>
          Für die heutige Mondbahn ergibt das etwa eine Stunde, bei einem nahen Vorbeiflug an der
          Erde automatisch Sekunden. Für die Stabilitätskarte wird <Tex>{'\\eta = 0{,}03'}</Tex>{' '}
          verwendet.
        </p>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Verfahren</th>
              <th class="num">Ordnung</th>
              <th>Symplektisch</th>
              <th class="num">Kraftauswertungen je Schritt</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(INTEGRATORS).map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td class="num">{i.order}</td>
                <td>{i.symplectic ? 'ja' : 'nein'}</td>
                <td class="num">{i.forceEvaluations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Figure
        n="A.1"
        caption="Relativer Energiefehler |ΔE/E₀| für das reale Erde–Mond–Sonne-System über 10 Jahre mit fester Schrittweite. Das Euler-Verfahren driftet systematisch (die Mondbahn wird immer größer); symplektische Verfahren bleiben beschränkt."
      >
        <IntegratorComparison />
      </Figure>

      <div class="prose">
        <SectionTitle n="A.3">Validierung</SectionTitle>
        <p>
          Ein Simulator ist nur so viel wert wie seine Überprüfung. Die folgende Tabelle vergleicht
          Größen, die aus einer 30-jährigen Simulation des realen Systems gemessen werden, mit
          Beobachtungswerten. Bis auf den siderischen Monat (über die Startphase angepasst) wurde
          keiner dieser Werte vorgegeben – sie ergeben sich allein aus den Anfangsbedingungen und
          dem Gravitationsgesetz.
        </p>
      </div>

      <Figure
        n="A.2"
        caption="Simulation (Velocity-Verlet, adaptive Schrittweite, 30 Jahre) im Vergleich mit Messwerten."
      >
        <ValidationTable />
      </Figure>

      <div class="prose">
        <p>
          Zusätzlich prüfen automatische Tests bei jeder Änderung: Energie- und Drehimpulserhaltung,
          die Konvergenzordnung der Verfahren, die Lage aller Lagrange-Punkte (Gradient null), das
          Routh-Kriterium, die Stabilitätsgrenzen und die Erreichbarkeit aller Missionsziele (
          <code>npm test</code>).
        </p>

        <SectionTitle n="A.4">Grenzen des Modells</SectionTitle>
        <ul>
          <li>
            Die <strong>Knotendrehung</strong> (18,6 Jahre) lässt sich in 2D nicht darstellen; dafür
            bräuchte es eine dreidimensionale Rechnung.
          </li>
          <li>
            <strong>Gezeitenreibung</strong> (Mond entfernt sich um 3,8 cm/Jahr) wirkt über
            Milliarden Jahre, ist für Simulationen über Jahrhunderte aber vernachlässigbar.
          </li>
          <li>
            Andere <strong>Planeten</strong> (vor allem Venus und Jupiter) und die Bahnneigung
            beeinflussen die Apsidendrehung geringfügig; das erklärt einen Teil der Abweichung von
            etwa 1 %.
          </li>
          <li>
            Die <strong>Stabilitätsgrenzen</strong> hängen leicht von der Simulationsdauer ab:
            Manche Bahnen nahe der Grenze werden erst nach Jahrhunderten instabil.
          </li>
          <li>
            Die Roche-Grenze gilt für einen flüssigen Körper ohne Eigenfestigkeit; ein fester Mond
            hielte bis etwa 9.500 km durch.
          </li>
        </ul>
      </div>

      <Callout kind="seminar">
        <p>Vorschlag für den Aufbau des Eigenanteils in der Arbeit:</p>
        <ol style={{ margin: '6px 0 0', paddingLeft: '1.2em' }}>
          <li>Modell und Annahmen (A.1) – was wird simuliert, was nicht?</li>
          <li>Numerisches Verfahren (A.2) mit Begründung der Wahl über Abb. A.1.</li>
          <li>
            Validierung (A.3): Tabelle A.2 zeigt, dass die Simulation reale Effekte reproduziert.
          </li>
          <li>
            Ergebnisse: Stabilitätskarten und Grenzwerte (Kapitel 8), jeweils mit Simulationsdauer.
          </li>
          <li>
            Diskussion: Vergleich mit Theorie (Hill, Jacobi, Domingos et al.) und Grenzen (A.4).
          </li>
        </ol>
        <p style={{ marginTop: '8px' }}>
          Alle Diagramme lassen sich als Bild und als CSV-Datei exportieren. Die Grenzwerte in
          Kapitel 8 reproduziert das Skript <code>npm run calibrate</code>.
        </p>
      </Callout>
    </article>
  );
}

function IntegratorComparison() {
  const [dt, setDt] = useState<string>('21600');
  const runs = useMemo(() => compareIntegrators(Number(dt), 10), [dt]);
  return (
    <div class="stack" style={{ gap: '14px' }}>
      <div class="row">
        <span class="small muted">Feste Schrittweite</span>
        <Segmented label="Schrittweite" value={dt} options={STEPS} onChange={setDt} />
      </div>
      <LineChart
        series={runs.map((r) => ({ id: r.id, label: r.name, x: r.t, y: r.error }))}
        xLabel="Zeit (Jahre)"
        yLabel="|ΔE/E₀|"
        xFormat={(v) => fmt(v)}
        yFormat={pow10}
        valueFormat={(v) => sci(v, 2)}
        yLog
        height={260}
      />
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Verfahren</th>
              <th class="num">Energiefehler nach 10 Jahren</th>
              <th class="num">Kraftauswertungen</th>
              <th class="num">Rechenzeit</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td class="num">{sci(r.finalError, 2)}</td>
                <td class="num">{fmt(r.forceEvaluations)}</td>
                <td class="num">{fmt(r.ms)} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small muted">Schritte: {fmt((10 * 365.25 * DAY) / Number(dt))} je Verfahren.</p>
    </div>
  );
}

export function ValidationTable() {
  const [data, setData] = useState<{
    rows: ValidationRow[];
    energyError: number;
    steps: number;
  } | null>(null);
  useEffect(() => {
    // Erst nach dem ersten Zeichnen rechnen, damit die Seite sofort erscheint.
    const id = setTimeout(() => setData(validate(30)), 50);
    return () => clearTimeout(id);
  }, []);
  if (!data) return <p class="small muted">Simulation läuft …</p>;
  return (
    <div class="stack" style={{ gap: '10px' }}>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Größe</th>
              <th class="num">Simulation</th>
              <th class="num">Messwert</th>
              <th class="num">Abweichung</th>
              <th>Quelle</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const dev = (r.simulation - r.reference) / r.reference;
              return (
                <tr key={r.quantity}>
                  <td>{r.quantity}</td>
                  <td class="num">
                    {fmt(r.simulation, r.digits)} {r.unit}
                  </td>
                  <td class="num">
                    {fmt(r.reference, r.digits)} {r.unit}
                  </td>
                  <td class="num">
                    <StatusChip
                      status={Math.abs(dev) < 0.01 ? 'ok' : Math.abs(dev) < 0.05 ? 'warn' : 'fail'}
                    >
                      {dev >= 0 ? '+' : '−'}
                      {sig(Math.abs(dev) * 100, 2)} %
                    </StatusChip>
                  </td>
                  <td class="small muted">{r.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="small muted">
        Energiefehler nach 30 Jahren: {sci(data.energyError, 2)} · {fmt(data.steps)}{' '}
        Integrationsschritte.
      </p>
    </div>
  );
}
