import { RocketGame } from '../rocket/RocketGame';
import { EARTH, MOON, MOON_DISTANCE, MOON_HILL, MOON_PERIOD, circularSpeed } from '../rocket/world';
import { Callout, PageHead } from '../ui/content';

const fmt = (x: number, d = 0): string =>
  x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

const CONTROLS: [string, string][] = [
  ['W / ↑ und S / ↓', 'Schub stufenlos hoch und runter'],
  ['Z / X', 'Vollgas / Triebwerk aus'],
  ['A / ← und D / →', 'Rakete drehen'],
  ['Leertaste', 'Nächste Stufe zünden (unterste Stufe abwerfen)'],
  ['P', 'Fallschirm scharf machen'],
  ['M', 'Karte mit Bahnvorhersage ein/aus'],
  [', und .', 'Zeitraffer langsamer / schneller'],
  ['+ / − oder Mausrad', 'Zoomen'],
  ['T', 'Hilfe-Pilot bis in die Umlaufbahn'],
];

export function RocketPage() {
  return (
    <div class="stack rocket-page" style={{ gap: '18px' }}>
      <PageHead eyebrow="Spielen · Raumfahrt" title="Raketenwerft">
        Baue deine eigene Rakete, starte sie von der Erde, bring sie in eine Umlaufbahn und lande
        auf dem Mond. Schwerkraft von Erde und Mond, Treibstoff und Luftwiderstand werden echt
        berechnet – wie im Simulator, nur in einer kleineren Welt.
      </PageHead>

      <RocketGame />

      <section class="grid-2 rocket-help">
        <div class="panel panel-pad">
          <h3>So kommst du zum Mond</h3>
          <ol class="steps">
            <li>
              <strong>Bauen:</strong> Nimm die Vorlage <em>Luna 1</em> oder baue selbst. Ganz unten
              gehört ein kräftiges Triebwerk hin, oben die Kapsel mit Fallschirm.
            </li>
            <li>
              <strong>Starten:</strong> Vollgas, senkrecht hoch. Ab etwa 3 km langsam nach rechts
              neigen, bis die Rakete in 40 km Höhe fast waagerecht fliegt.
            </li>
            <li>
              <strong>Umlaufbahn:</strong> Liegt der höchste Punkt (Ap) über 70 km, Schub aus. Am
              höchsten Punkt waagerecht Gas geben, bis auch der tiefste Punkt (Pe) über 40 km liegt.
            </li>
            <li>
              <strong>Zum Mond:</strong> Wenn die Anzeige „Mondfenster: jetzt“ zeigt, in
              Flugrichtung Gas geben, bis auf der Karte „Mond bei Ankunft“ erscheint.
            </li>
            <li>
              <strong>Landen:</strong> Im Einflussbereich des Mondes gegen die Flugrichtung bremsen,
              dann langsam aufsetzen – höchstens 8 m/s, mit Landebeinen 14 m/s.
            </li>
            <li>
              <strong>Heimkehr:</strong> Zurückfliegen, den tiefsten Punkt auf 15–30 km legen,
              Fallschirm scharf machen und die Luft bremsen lassen.
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
            Auf dem Handy oder Tablet gibt es dafür Knöpfe unter dem Spielfeld.
          </p>
        </div>
      </section>

      <section class="stack" style={{ gap: '12px' }}>
        <h2>Die Physik hinter dem Spiel</h2>
        <div class="grid-2">
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
            Damit ein Mondflug Minuten statt Tage dauert, ist die Welt verkleinert. Schwerkraft an
            der Oberfläche, das Massenverhältnis Mond/Erde und der Abstand in Erdradien stimmen.
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
