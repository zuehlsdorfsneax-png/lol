import { RocketGame } from '../rocket/RocketGame';
import {
  EARTH,
  MARS,
  MOON,
  MOON_DISTANCE,
  MOON_HILL,
  MOON_PERIOD,
  SCALE,
  circularSpeed,
  orbitalPeriod,
} from '../rocket/world';
import { Callout, PageHead } from '../ui/content';

const fmt = (x: number, d = 0): string =>
  x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

const CONTROLS: [string, string][] = [
  ['W / ↑ und S / ↓', 'Schub stufenlos hoch und runter'],
  ['Z / X', 'Vollgas / Triebwerk aus'],
  ['A / ← und D / →', 'Rakete drehen'],
  ['Leertaste', 'Nächste Stufe zünden (unterste Stufe abwerfen)'],
  ['P', 'Fallschirm scharf machen'],
  ['R, dann W / S / Q / E', 'RCS-Düsen: sanft verschieben (zum Andocken)'],
  ['M', 'Karte mit Bahnvorhersage (ziehen, zoomen, Doppelklick)'],
  [', und .', 'Zeitraffer langsamer / schneller'],
  ['+ / − oder Mausrad', 'Zoomen'],
  ['T', 'Hilfe-Pilot bis in die Umlaufbahn'],
  ['F5 / F9', 'Spielstand speichern / laden'],
  ['Esc / H', 'Pause / Hilfe'],
];

export function RocketPage() {
  return (
    <div class="stack rocket-page" style={{ gap: '18px' }}>
      <PageHead eyebrow="Spielen · Raumfahrt" title="Raketenwerft">
        Baue deine eigene Rakete, starte von der Erde, docke an der Raumstation an, lande auf dem
        Mond oder fliege zum Mars. Schwerkraft von Sonne, Planeten und Monden, Treibstoff,
        Luftwiderstand und Hitze werden echt berechnet – wie im Simulator, nur in einem
        verkleinerten Sonnensystem.
      </PageHead>

      <RocketGame />

      <section class="grid-2 rocket-help">
        <div class="panel panel-pad">
          <h3>So kommst du ans Ziel</h3>
          <ol class="steps">
            <li>
              <strong>Bauen:</strong> Nimm eine Vorlage oder baue selbst. Ganz unten gehört ein
              kräftiges Triebwerk hin, oben die Kapsel mit Fallschirm. Die Werft zeigt, ob das Δv
              reicht.
            </li>
            <li>
              <strong>Umlaufbahn:</strong> Vollgas, senkrecht hoch, ab 3 km langsam nach rechts
              neigen. Liegt der höchste Punkt (Ap) über 70 km, Schub aus und am Ap waagerecht Gas
              geben, bis auch der tiefste Punkt (Pe) über 40 km liegt.
            </li>
            <li>
              <strong>Raumstation:</strong> Ziel „Raumstation Kepler“ wählen, Ap auf 150 km heben
              und die nächste Annäherung auf der Karte verkleinern. Mit RCS (R) langsamer als 2 m/s
              andocken – dort gibt es kostenlos Treibstoff.
            </li>
            <li>
              <strong>Mond:</strong> Wenn links „Mondfenster: jetzt!“ steht, in Flugrichtung Gas
              geben, bis „Mond bei Ankunft“ erscheint. Dort am Pe bremsen und mit höchstens 8 m/s
              (mit Beinen 14 m/s) aufsetzen.
            </li>
            <li>
              <strong>Mars:</strong> Ziel „Mars“ wählen und auf das Startfenster warten. Auf der
              sonnenabgewandten Seite der Erde Gas geben, bis die Karte „Mars bei Ankunft“ zeigt.
              Die Reise dauert im Spiel etwa 80 Tage – Zeitraffer hoch!
            </li>
            <li>
              <strong>Heimkehr:</strong> Pe der Erde auf 15–30 km legen, Fallschirm scharf machen.
              Zu steil und zu schnell? Dann wird es heiß – auf die Hitzeanzeige achten.
            </li>
          </ol>
        </div>
        <div class="panel panel-pad">
          <h3>Steuerung</h3>
          <table class="table">
            <tbody>
              {CONTROLS.map(([k, v]) => (
                <tr key={k}>
                  <td>
                    <kbd>{k}</kbd>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="small muted">
            Auf dem Handy oder Tablet gibt es dafür Knöpfe auf dem Spielfeld; die Karte verschiebt
            und zoomt man mit den Fingern.
          </p>
        </div>
      </section>

      <section class="stack" style={{ gap: '12px' }}>
        <h2>Die Physik hinter dem Spiel</h2>
        <div class="grid-2 even">
          <Callout kind="fakt" title="Eine Umlaufbahn ist ein endloser Fall">
            Die Rakete fällt in der Umlaufbahn ständig zur Erde – sie ist aber so schnell zur Seite
            unterwegs, dass die Erdoberfläche unter ihr „wegkrümmt“. Im Spiel braucht das in 50 km
            Höhe {fmt(circularSpeed(EARTH, 50_000))} m/s. Genau so hält die Schwerkraft auch den
            Mond auf seiner Bahn (Kapitel 2).
          </Callout>
          <Callout kind="seminar" title="Hill-Sphäre: wo der Mond das Sagen hat">
            Im Umkreis von {fmt(MOON_HILL / 1000)} km um den Spiel-Mond zieht der Mond stärker an
            der Rakete als die Erde. Die Karte zeigt diese Grenze gestrichelt – es ist dieselbe
            Hill-Sphäre, die in Kapitel 5 über die Stabilität unseres Mondes entscheidet.
          </Callout>
          <Callout kind="merke" title="Drei Körper, keine perfekte Ellipse">
            Die Bahnvorhersage auf der Karte rechnet Erde, Mond und Rakete gemeinsam – ein
            eingeschränktes Drei-Körper-Problem wie in Kapitel 4 und 8. Deshalb biegt der Mond die
            vorhergesagte Bahn, sobald sie in seine Nähe kommt.
          </Callout>
          <Callout kind="fakt" title="Warum der Mond immer dieselbe Seite zeigt">
            Im Spiel dreht sich der Mond einmal pro Umlauf um sich selbst – wie in Wirklichkeit. Das
            ist die gebundene Rotation durch Gezeitenreibung aus Kapitel 6. Ein Landeplatz auf der
            erdzugewandten Seite bleibt deshalb immer der Erde zugewandt.
          </Callout>
        </div>
        <div class="panel panel-pad">
          <h3>Spielwelt und Wirklichkeit</h3>
          <p class="small muted">
            Damit ein Flug Minuten statt Tage dauert, ist das ganze Sonnensystem gleichmäßig
            verkleinert (Maßstab 1 : {fmt(1 / SCALE, 1)}). Schwerkraft an der Oberfläche,
            Massenverhältnisse und alle Abstände im Verhältnis stimmen – deshalb kreist der Mond
            auch im Spiel bei einem Viertel des Hill-Radius der Erde.
          </p>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th />
                  <th>Spiel</th>
                  <th>Wirklichkeit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Erdradius</td>
                  <td>{fmt(EARTH.radius / 1000)} km</td>
                  <td>6.371 km</td>
                </tr>
                <tr>
                  <td>Mondradius</td>
                  <td>{fmt(MOON.radius / 1000)} km</td>
                  <td>1.737 km</td>
                </tr>
                <tr>
                  <td>Abstand Erde–Mond</td>
                  <td>{fmt(MOON_DISTANCE / 1000)} km (60 Erdradien)</td>
                  <td>384.400 km (60 Erdradien)</td>
                </tr>
                <tr>
                  <td>Umlaufzeit des Mondes</td>
                  <td>{fmt(MOON_PERIOD / 86_400, 1)} Tage</td>
                  <td>27,3 Tage</td>
                </tr>
                <tr>
                  <td>Schwerkraft Erde / Mond</td>
                  <td>9,81 / 1,62 m/s²</td>
                  <td>9,81 / 1,62 m/s²</td>
                </tr>
                <tr>
                  <td>Marsradius</td>
                  <td>{fmt(MARS.radius / 1000)} km</td>
                  <td>3.390 km</td>
                </tr>
                <tr>
                  <td>Abstand Erde–Sonne</td>
                  <td>{fmt(EARTH.distance / 1e9, 1)} Mio. km</td>
                  <td>149,6 Mio. km</td>
                </tr>
                <tr>
                  <td>Ein Erdjahr</td>
                  <td>{fmt(orbitalPeriod(EARTH) / 86_400)} Tage</td>
                  <td>365 Tage</td>
                </tr>
                <tr>
                  <td>Kreisbahn in niedriger Höhe</td>
                  <td>≈ {fmt(circularSpeed(EARTH, 50_000) / 1000, 1)} km/s</td>
                  <td>≈ 7,8 km/s</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
