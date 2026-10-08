import { useRef, useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { CHALLENGES } from '../rocket/challenges';
import { careerPoints, rankFor } from '../rocket/goals';
import { ispAt, part } from '../rocket/parts';
import { RocketArt } from '../rocket/RocketArt';
import { RocketGame, type Tab } from '../rocket/RocketGame';
import {
  GAME_EARTH,
  EUROPA,
  MARS,
  GAME_MOON,
  MOON_DISTANCE,
  MOON_HILL,
  MOON_PERIOD,
  SCALE,
  angularRate,
  circularSpeed,
  VENUS,
  orbitalPeriod,
  type Body,
} from '../rocket/world';
import { PageHead } from '../ui/content';
import { fmt } from '../ui/format';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Icon } from '../ui/Icon';

/** Kleine Zahlen als Wort („zehn“), größere als Ziffern. */
function numberWord(n: number): string {
  const words = ['null', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
  return words[n] ?? ['zehn', 'elf', 'zwölf'][n - 10] ?? String(n);
}

/** Schwerkraft an der Oberfläche aus μ und Radius des Spielkörpers. */
const surfaceGravity = (b: Body): number => b.mu / b.radius ** 2;

/** Längste Wartezeit auf ein Marsfenster: eine synodische Periode von Erde und Mars. */
function transferWaitMax(): number {
  return (2 * Math.PI) / Math.abs(angularRate(GAME_EARTH) - angularRate(MARS));
}

const CONTROLS: [string, string][] = [
  ['W / ↑ und S / ↓', 'Schub stufenlos hoch und runter (Umschalt: hoch)'],
  ['Z / X', 'Vollgas / Triebwerk aus'],
  ['A / ← und D / →', 'Rakete drehen (F: Feinsteuerung)'],
  ['1 – 7', 'SAS-Lageregelung: aus, prograd, retrograd, radial außen, radial innen, Ziel, Manöver'],
  ['Gedrückt halten', 'In der Flugansicht: Die Rakete dreht sich in diese Richtung'],
  ['Leertaste', 'Nächste Stufe zünden (unterste Stufe abwerfen)'],
  ['P / N / U', 'Fallschirm scharf, entschärfen oder abwerfen / Satellit aussetzen / Luftbremsen'],
  ['R, dann W / S / Q / E', 'RCS-Düsen: sanft verschieben (zum Andocken)'],
  ['M', 'Karte: Klick auf die Bahn plant ein Manöver, Anfasser ziehen'],
  ['B', 'Bordcomputer: Manöver planen, automatisch fliegen, ganze Missionen (Reiter „Mission“)'],
  ['L / T / C', 'Lande-Autopilot / Hilfe-Pilot / Countdown mit Sprachausgabe'],
  [', und . oder ⏩', 'Zeitraffer / Zeitsprung (bremst von selbst am Ziel)'],
  ['+ / − oder Mausrad', 'Zoomen'],
  ['F5 / F9 / O', 'Spielstand speichern / laden / Foto'],
  ['Esc / H', 'Menü (Pause, Speichern, Foto, Ton, Vollbild) / Hilfe'],
  ['Gamepad', 'Stick drehen, Trigger Schub, A Stufe, B Fallschirm, X RCS, Y Karte'],
];

type DocTab = 'anleitung' | 'steuerung' | 'physik' | 'welt';

const DOC_TABS: { id: DocTab; label: string }[] = [
  { id: 'anleitung', label: 'So kommst du ans Ziel' },
  { id: 'steuerung', label: 'Steuerung' },
  { id: 'physik', label: 'Physik im Spiel' },
  { id: 'welt', label: 'Spielwelt und Wirklichkeit' },
];

function Launcher({ onPlay, playing }: { onPlay: (t: Tab) => void; playing: boolean }) {
  const p = progressStore.load();
  const stars = Object.values(p.rocketChallenges ?? {}).reduce((s, r) => s + r.stars, 0);
  const starMap = Object.fromEntries(
    Object.entries(p.rocketChallenges ?? {}).map(([k, v]) => [k, v.stars]),
  );
  const points = careerPoints(p.rocketGoals, starMap);
  const rank = rankFor(points);
  return (
    <section class="launcher" aria-label="Spiel starten">
      <div class="launcher-art">
        <RocketArt paused={playing} />
      </div>
      <div class="launcher-body">
        <dl class="launcher-stats">
          <div>
            <dt>Rang</dt>
            <dd>{rank.title}</dd>
          </div>
          <div>
            <dt>Punkte</dt>
            <dd>{points}</dd>
          </div>
          <div>
            <dt>Sterne</dt>
            <dd>
              {stars} / {CHALLENGES.length * 3}
            </dd>
          </div>
        </dl>
        <div class="launcher-actions">
          <button type="button" class="btn primary big" onClick={() => onPlay('werft')}>
            <Icon name="rocket" /> Spielen
          </button>
          <button type="button" class="btn big" onClick={() => onPlay('herausforderungen')}>
            <Icon name="trophy" /> Herausforderungen
          </button>
        </div>
        <p class="launcher-note">
          Das Spiel öffnet sich im ganzen Fenster. Mit ✕ oben links geht es zurück.
        </p>
      </div>
    </section>
  );
}

export function RocketPage() {
  const [game, setGame] = useState<Tab | null>(null);
  const [doc, setDoc] = useState<DocTab>('anleitung');
  const opener = useRef<HTMLElement | null>(null);
  const play = (t: Tab): void => {
    opener.current = document.activeElement as HTMLElement | null;
    setGame(t);
  };
  return (
    <div class="rocket-page">
      <PageHead eyebrow="Spielen" title="Raketenwerft">
        Bau deine Rakete und flieg durch ein verkleinertes Sonnensystem – mit echter Schwerkraft,
        Luftwiderstand und Hitze, einem Bordcomputer und {numberWord(CHALLENGES.length)}{' '}
        Herausforderungen.
      </PageHead>

      <Launcher onPlay={play} playing={game !== null} />

      <section class="doc-tabs" aria-label="Anleitung und Hintergrund">
        <div class="seg" role="tablist">
          {DOC_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={doc === t.id}
              class={doc === t.id ? 'on' : ''}
              onClick={() => setDoc(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {doc === 'anleitung' && <Guide />}
        {doc === 'steuerung' && <Controls />}
        {doc === 'physik' && <Physics />}
        {doc === 'welt' && <World />}
      </section>

      {game && (
        <ErrorBoundary
          where="Die Raketenwerft"
          onClose={() => {
            setGame(null);
            opener.current?.focus();
          }}
        >
          <RocketGame
            startTab={game}
            onClose={() => {
              setGame(null);
              opener.current?.focus();
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

function Guide() {
  return (
    <div class="doc-panel">
      <ol class="rule-list">
        <li>
          <p>
            <strong>Bauen:</strong> Nimm eine Vorlage oder baue selbst. Ganz unten gehört ein
            kräftiges Triebwerk hin, oben die Kapsel mit Fallschirm. Die Werft zeigt, ob das Δv
            reicht.
          </p>
        </li>
        <li>
          <p>
            <strong>Umlaufbahn:</strong> Countdown (C) oder Vollgas, senkrecht hoch, ab 3 km langsam
            nach rechts neigen. Liegt der höchste Punkt (Ap) über 70 km, Schub aus – der
            Bordcomputer (B) plant mit „Kreisbahn am Ap“ den Rest.
          </p>
        </li>
        <li>
          <p>
            <strong>Manöver:</strong> Auf der Karte (M) auf die Bahn klicken und die Anfasser
            ziehen: grün in oder gegen die Flugrichtung, türkis radial. Die rosa Linie zeigt die
            neue Bahn. „Automatisch ausführen“ zündet genau zur richtigen Zeit.
          </p>
        </li>
        <li>
          <p>
            <strong>Raumstation:</strong> Ziel „Raumstation Kepler“, Bordcomputer „Rendezvous“ und
            „Geschwindigkeit angleichen“. Die letzten Meter mit RCS (R) langsamer als 2 m/s –
            angedockt gibt es kostenlos Treibstoff.
          </p>
        </li>
        <li>
          <p>
            <strong>Mond und Planeten:</strong> Ziel wählen, „Transfer“ planen (bei Planeten erst
            per Zeitsprung ins Startfenster), unterwegs „Kurskorrektur“, dort „Einschwenken“ und
            „Automatisch landen“ – oder alles selbst fliegen.
          </p>
        </li>
        <li>
          <p>
            <strong>Missions-Autopilot:</strong> Im Bordcomputer den Reiter „Mission“ öffnen, Ziel
            wählen, „Landen“ oder „Danach zurück zur Erde“ ankreuzen und starten. Er fliegt alles
            allein und zeigt jeden Schritt – eine Steuertaste gibt dir die Kontrolle zurück.
          </p>
        </li>
        <li>
          <p>
            <strong>Satelliten:</strong> Mit N aussetzen – sie bleiben auf ihrer Bahn, auch in
            späteren Flügen. Drei um die Erde ergeben ein Satellitennetz.
          </p>
        </li>
        <li>
          <p>
            <strong>Heimkehr:</strong> Bordcomputer „Wiedereintritt“ legt den tiefsten Punkt auf 25
            km. Triebwerksstufe abwerfen, Hitzeschild voran (SAS retrograd), Fallschirm scharf.
          </p>
        </li>
      </ol>
    </div>
  );
}

function Controls() {
  return (
    <div class="doc-panel">
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
        Auf dem Handy oder Tablet gibt es dafür Knöpfe auf dem Spielfeld; die Karte verschiebt und
        zoomt man mit den Fingern. Die runde Lageanzeige zeigt, wohin die Nase zeigt: grün ist die
        Flugrichtung, türkis radial, violett das Ziel, blau das Manöver – antippen stellt das SAS
        darauf ein.
      </p>
    </div>
  );
}

function Physics() {
  const falke = part('falke');
  const nova = part('nova');
  const falkeSea = ispAt(falke, 1);
  return (
    <ol class="rule-list doc-panel">
      <li>
        <div>
          <h3>Triebwerke: weniger Schub in dichter Luft</h3>
          <p>
            Ein Triebwerk fördert in jeder Höhe gleich viel Treibstoff. Am Boden drückt aber die
            Luft gegen den Düsenaustritt: Der spezifische Impuls (Isp) des Falke-Triebwerks sinkt
            von {falke.isp} s im Vakuum auf {falkeSea} s, sein Schub um{' '}
            {fmt(100 * (1 - falkeSea / falke.isp))} %. Die große Vakuumdüse Nova behält am Boden nur{' '}
            {fmt((100 * ispAt(nova, 1)) / nova.isp)} %. Wie weit eine Stufe kommt, sagt die
            Raketengleichung: Δv = Isp · g₀ · ln(Startmasse / Leermasse).
          </p>
        </div>
      </li>
      <li>
        <div>
          <h3>Luftwiderstand und Max Q</h3>
          <p>
            Der Widerstand wächst mit Luftdichte, Tempo², Stirnfläche und Form: Ein Nasenkegel oder
            eine Verkleidung halbiert ihn, an der Schallmauer steigt er auf das 1,7-Fache. Am
            stärksten drückt der Fahrtwind kurz vor der dünnen Luft – dieser Moment heißt „Max Q“
            und steht im Flugbericht. Deshalb kostet der Aufstieg rund 3.800 m/s Δv, obwohl in 75 km
            Höhe {fmt(circularSpeed(GAME_EARTH, 75_000))} m/s für die Kreisbahn reichen.
          </p>
        </div>
      </li>
      <li>
        <div>
          <h3>Eine Umlaufbahn ist ein endloser Fall</h3>
          <p>
            Die Rakete fällt in der Umlaufbahn ständig zur Erde – sie ist aber so schnell zur Seite
            unterwegs, dass die Erdoberfläche unter ihr „wegkrümmt“. Im Spiel braucht das in 50 km
            Höhe {fmt(circularSpeed(GAME_EARTH, 50_000))} m/s. Genau so hält die Schwerkraft auch
            den Mond auf seiner Bahn (Kapitel 2).
          </p>
        </div>
      </li>
      <li>
        <div>
          <h3>Hill-Sphäre: wo der Mond das Sagen hat</h3>
          <p>
            Im Umkreis von {fmt(MOON_HILL / 1000)} km um den Spiel-Mond zieht der Mond stärker an
            der Rakete als die Erde. Die Karte zeigt diese Grenze gestrichelt – es ist dieselbe
            Hill-Sphäre, die in Kapitel 5 über die Stabilität unseres Mondes entscheidet.
          </p>
        </div>
      </li>
      <li>
        <div>
          <h3>Drei Körper, keine perfekte Ellipse</h3>
          <p>
            Die Bahnvorhersage auf der Karte rechnet die Anziehung aller Körper gleichzeitig: Sonne,
            Planeten und Monde ziehen an der Rakete, während sie selbst auf festen Bahnen laufen.
            Das ist ein eingeschränktes Mehrkörperproblem – die Verallgemeinerung des
            Drei-Körper-Problems aus Kapitel 4 und 8. Deshalb biegt der Mond die vorhergesagte Bahn,
            sobald sie in seine Nähe kommt.
          </p>
        </div>
      </li>
      <li>
        <div>
          <h3>Hohmann-Transfer: der sparsamste Weg</h3>
          <p>
            Der Bordcomputer plant Transfers wie echte Missionen: ein Schub in Flugrichtung macht
            die Bahn zur Ellipse, deren höchster Punkt das Ziel berührt. Damit das Ziel dann auch
            dort ist, muss man im richtigen Startfenster zünden – beim Mars wartet man im Spiel bis
            zu {fmt(transferWaitMax() / 86_400)} Tage darauf.
          </p>
        </div>
      </li>
      <li>
        <div>
          <h3>Warum der Mond immer dieselbe Seite zeigt</h3>
          <p>
            Im Spiel dreht sich der Mond einmal pro Umlauf um sich selbst – wie in Wirklichkeit. Das
            ist die gebundene Rotation durch Gezeitenreibung aus Kapitel 6. Ein Landeplatz auf der
            erdzugewandten Seite bleibt deshalb immer der Erde zugewandt.
          </p>
        </div>
      </li>
    </ol>
  );
}

function World() {
  return (
    <div class="doc-panel">
      <p class="small muted">
        Damit ein Flug Minuten statt Tage dauert, ist das ganze Sonnensystem gleichmäßig verkleinert
        (Maßstab 1 : {fmt(1 / SCALE, 1)}). Schwerkraft an der Oberfläche, Massenverhältnisse und
        alle Abstände im Verhältnis stimmen – deshalb kreist der Mond auch im Spiel bei einem
        Viertel des Hill-Radius der Erde.
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
              <td>{fmt(GAME_EARTH.radius / 1000)} km</td>
              <td>6.371 km</td>
            </tr>
            <tr>
              <td>Mondradius</td>
              <td>{fmt(GAME_MOON.radius / 1000)} km</td>
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
              <td>
                {fmt(surfaceGravity(GAME_EARTH), 2)} / {fmt(surfaceGravity(GAME_MOON), 2)} m/s²
              </td>
              <td>9,81 / 1,62 m/s²</td>
            </tr>
            <tr>
              <td>Schwerkraft Mars / Venus / Europa</td>
              <td>
                {fmt(surfaceGravity(MARS), 2)} / {fmt(surfaceGravity(VENUS), 2)} /{' '}
                {fmt(surfaceGravity(EUROPA), 2)} m/s²
              </td>
              <td>3,72 / 8,87 / 1,31 m/s²</td>
            </tr>
            <tr>
              <td>Marsradius</td>
              <td>{fmt(MARS.radius / 1000)} km</td>
              <td>3.390 km</td>
            </tr>
            <tr>
              <td>Abstand Erde–Sonne</td>
              <td>{fmt(GAME_EARTH.distance / 1e9, 1)} Mio. km</td>
              <td>149,6 Mio. km</td>
            </tr>
            <tr>
              <td>Ein Erdjahr</td>
              <td>{fmt(orbitalPeriod(GAME_EARTH) / 86_400)} Tage</td>
              <td>365 Tage</td>
            </tr>
            <tr>
              <td>Körper im Spiel</td>
              <td colSpan={2}>
                Sonne, Merkur, Venus, Erde mit Mond und Raumstation, Mars mit Phobos, der
                Zwergplanet Ceres im Asteroidengürtel, Jupiter mit Europa und Ganymed
              </td>
            </tr>
            <tr>
              <td>Kreisbahn in niedriger Höhe</td>
              <td>≈ {fmt(circularSpeed(GAME_EARTH, 50_000) / 1000, 1)} km/s</td>
              <td>≈ 7,8 km/s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
