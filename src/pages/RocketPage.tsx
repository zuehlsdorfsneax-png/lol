import { RocketGame } from '../rocket/RocketGame';
import {
  EARTH,
  MARS,
  MOON,
  MOON_DISTANCE,
  MOON_HILL,
  MOON_PERIOD,
  SCALE,
  angularRate,
  circularSpeed,
  orbitalPeriod,
} from '../rocket/world';
import { Callout, PageHead } from '../ui/content';

const fmt = (x: number, d = 0): string =>
  x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Längste Wartezeit auf ein Marsfenster: eine synodische Periode von Erde und Mars. */
function transferWaitMax(): number {
  return (2 * Math.PI) / Math.abs(angularRate(EARTH) - angularRate(MARS));
}

const CONTROLS: [string, string][] = [
  ['W / ↑ und S / ↓', 'Schub stufenlos hoch und runter (auch Umschalt / Strg)'],
  ['Z / X', 'Vollgas / Triebwerk aus'],
  ['A / ← und D / →', 'Rakete drehen (F: Feinsteuerung)'],
  ['1 – 7', 'SAS-Lageregelung: aus, prograd, retrograd, radial, Ziel, Manöver'],
  ['Antippen', 'In der Flugansicht: Die Rakete dreht sich in diese Richtung'],
  ['Leertaste', 'Nächste Stufe zünden (unterste Stufe abwerfen)'],
  ['P / N', 'Fallschirm scharf machen / Satellit aussetzen'],
  ['R, dann W / S / Q / E', 'RCS-Düsen: sanft verschieben (zum Andocken)'],
  ['M', 'Karte: Klick auf die Bahn plant ein Manöver, Anfasser ziehen'],
  ['B', 'Bordcomputer: Manöver planen und automatisch fliegen'],
  ['L / T / C', 'Lande-Autopilot / Hilfe-Pilot / Countdown mit Sprachausgabe'],
  [', und . oder ⏩', 'Zeitraffer / Zeitsprung (bremst von selbst am Ziel)'],
  ['+ / − oder Mausrad', 'Zoomen'],
  ['F5 / F9 / O', 'Spielstand speichern / laden / Foto'],
  ['Esc / H', 'Pause / Hilfe'],
  ['Gamepad', 'Stick drehen, Trigger Schub, A Stufe, B Fallschirm, X RCS, Y Karte'],
];

export function RocketPage() {
  return (
    <div class="stack rocket-page" style={{ gap: '18px' }}>
      <PageHead eyebrow="Spielen · Raumfahrt" title="Raketenwerft">
        Baue deine eigene Rakete, starte von der Erde, setze Satelliten aus, docke an der
        Raumstation an, lande auf dem Mond, dem Mars oder dem Eismond Europa. Schwerkraft von Sonne,
        Planeten und Monden, Treibstoff, Luftwiderstand und Hitze werden echt berechnet – wie im
        Simulator, nur in einem verkleinerten Sonnensystem. Ein Bordcomputer plant Manöver wie bei
        echten Raumflügen, neun Herausforderungen warten auf deine Sterne.
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
              <strong>Umlaufbahn:</strong> Countdown (C) oder Vollgas, senkrecht hoch, ab 3 km
              langsam nach rechts neigen. Liegt der höchste Punkt (Ap) über 70 km, Schub aus – der
              Bordcomputer (B) plant mit „Kreisbahn am Ap“ den Rest.
            </li>
            <li>
              <strong>Manöver:</strong> Auf der Karte (M) auf die Bahn klicken und die Anfasser
              ziehen: grün in oder gegen die Flugrichtung, türkis radial. Die rosa Linie zeigt die
              neue Bahn. „Automatisch ausführen“ zündet genau zur richtigen Zeit.
            </li>
            <li>
              <strong>Raumstation:</strong> Ziel „Raumstation Kepler“, Bordcomputer „Rendezvous“ und
              „Geschwindigkeit angleichen“. Die letzten Meter mit RCS (R) langsamer als 2 m/s –
              angedockt gibt es kostenlos Treibstoff.
            </li>
            <li>
              <strong>Mond und Planeten:</strong> Ziel wählen, „Transfer“ planen (bei Planeten erst
              per Zeitsprung ins Startfenster), unterwegs „Kurskorrektur“, dort „Einschwenken“ und
              „Automatisch landen“ – oder alles selbst fliegen.
            </li>
            <li>
              <strong>Satelliten:</strong> Mit N aussetzen – sie bleiben auf ihrer Bahn, auch in
              späteren Flügen. Drei um die Erde ergeben ein Satellitennetz.
            </li>
            <li>
              <strong>Heimkehr:</strong> Bordcomputer „Wiedereintritt“ legt den tiefsten Punkt auf
              25 km. Triebwerksstufe abwerfen, Hitzeschild voran (SAS retrograd), Fallschirm scharf.
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
            und zoomt man mit den Fingern. Die runde Lageanzeige zeigt, wohin die Nase zeigt: grün
            ist die Flugrichtung, türkis radial, violett das Ziel, blau das Manöver – antippen
            stellt das SAS darauf ein.
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
          <Callout kind="merke" title="Hohmann-Transfer: der sparsamste Weg">
            Der Bordcomputer plant Transfers wie echte Missionen: ein Schub in Flugrichtung macht
            die Bahn zur Ellipse, deren höchster Punkt das Ziel berührt. Damit das Ziel dann auch
            dort ist, muss man im richtigen Startfenster zünden – beim Mars wartet man im Spiel bis
            zu
            {` ${fmt(transferWaitMax() / 86_400)} `}Tage darauf.
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
                  <td>Körper im Spiel</td>
                  <td colSpan={2}>
                    Sonne, Merkur, Venus, Erde mit Mond und Raumstation, Mars mit Phobos, Jupiter
                    mit Europa
                  </td>
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
