import { useMemo, useState } from 'preact/hooks';
import {
  DAY,
  EARTH,
  G,
  KM,
  MOON,
  REAL_PARAMS,
  barycenterOffset,
  MOON_DISTANCE_KM,
} from '../../physics';
import { SHOW_SIMULATOR } from '../../app/content';
import { openInSimulator } from '../../app/store';
import { LineChart } from '../../ui/charts/LineChart';
import { Equation, Figure, SectionTitle, StatusChip, Tex } from '../../ui/content';
import { Slider } from '../../ui/controls';
import { fmt, sci } from '../../ui/format';
import { RollingRace, ShellCalculator, ShellGravityChart } from './HollowWidgets';

const R = MOON.radius;
const REAL_BARY = barycenterOffset(EARTH.mass, MOON.mass, MOON_DISTANCE_KM * KM);

/** Masse einer Gesteinsschale mit Dicke `frac` · R und Dichte `rho` (kg/m³). */
function shellMass(frac: number, rho: number): number {
  const inner = R * (1 - frac);
  return (4 / 3) * Math.PI * (R ** 3 - inner ** 3) * rho;
}

export function Hollow() {
  return (
    <>
      <div class="prose">
        <p>
          Neben den bisher behandelten faktischen Themen kursieren in der Öffentlichkeit auch, bis
          heute, pseudowissenschaftliche Vorstellungen über Himmelskörper, welche im direkten
          Widerspruch mit den Naturgesetzen stehen. Eine der bekanntesten Verschwörungen ist die
          Behauptung, dass der Mond hohl sei, beziehungsweise kein massiver Himmelskörper ist,
          sondern eine Attrappe. Dieses Kapitel untersucht diese These und wird sie auch mit Hilfe
          unseres Programmes anhand von mathematischen Berechnungen widerlegen.
        </p>

        <SectionTitle n="7.1">Ursprung und Grundidee der Theorie</SectionTitle>
        <p>
          Die Hohle-Mond-These geht allerdings noch weiter. Nach dieser Vorstellung soll der Mond
          nicht natürlich entstanden sein, sondern von einer unbekannten, technisch sehr
          fortgeschrittenen Zivilisation gebaut und anschließend in eine Umlaufbahn um die Erde
          gebracht worden sein.
        </p>
        <p>
          Den Ursprung dieser These findet man in dem im Juli 1970 veröffentlichten Artikel „Ist der
          Mond die Schöpfung einer außerirdischen Intelligenz?“. Dieser wurde von den beiden
          sowjetischen Wissenschaftlern Michail Wasin und Alexander Schtscherbakow in der
          sowjetischen Zeitschrift <em>Sputnik</em> veröffentlicht, obwohl die beiden Mitglieder der
          Sowjetischen Akademie der Wissenschaften waren. Der Sputnik unterliegt keinem
          wissenschaftlichen Begutachtungsverfahren. Die beiden haben in dem Artikel die These
          aufgestellt, dass im Mond riesige Maschinen einer außerirdischen Zivilisation Hohlräume
          schmelzen und die äußere Gesteinsschicht des Mondes das abgetragene Gestein entspricht.
        </p>
        <p>
          Der Anstoß für diese Überlegung lieferte wahrscheinlich die NASA selbst. Am 20. November
          1969 ließ die NASA, im Rahmen der Apollo-12-Mission, die nicht mehr benötigte
          Aufstiegsstufe der Mondlandefähre zurück auf den Mond stürzen. Die auf dem Mond gelassenen
          Seismometer haben dabei die Erschütterungen gemessen, welche noch fast eine Stunde nach
          Aufprall nachklangen. Im März 1970 erschien ein Artikel im Magazin{' '}
          <em>Popular Science</em>, welcher dieses Nachklingen mit einer Glocke verglich, was die
          Grundlage für das Bild des hohlen Mondes lieferte.
        </p>
        <p>
          Die Idee, dass der Mond kein solider, sondern ein hohler Himmelskörper sei, war zu diesem
          Zeitpunkt nichts Neues. Bereits 1901 beschrieb der britische Schriftsteller H. G. Wells
          den Mond als hohl. Dies aber ausdrücklich in seinem Science-Fiction-Roman „The First Men
          in the Moon“ und nicht als ernstgemeinte wissenschaftliche These. Ungefähr anderthalb
          Jahre vor der Veröffentlichung von Wasin und Schtscherbakow erschien eine Folge der
          US-Serie <em>Star Trek</em>, in welcher sich ein Planet als künstliches Raumschiff
          entpuppte. Ein direkter Zusammenhang lässt sich zwar nicht belegen, aber von einzelnen
          Autoren wird es als möglicher kultureller Einfluss diskutiert. In den folgenden
          Jahrzehnten wurde diese Verschwörung hauptsächlich von wenigen US-amerikanischen Autoren
          wie Don Wilson und George Leonard in populärwissenschaftlichen Büchern weiterverbreitet,
          ohne jegliche wissenschaftliche Begutachtung.
        </p>
        <p>
          Die Grundidee der Verschwörung stützt sich damit weder auf Messdaten noch auf
          nachvollziehbare physikalische Modelle, sondern nur auf die Fehlinterpretation eines
          einzelnen Messergebnisses sowie auf Ideen aus Science-Fiction-Literatur.
        </p>

        <SectionTitle n="7.2">Physikalische Argumente gegen einen hohlen Mond</SectionTitle>
        <p>
          Gegen den hohlen Mond sprechen zwei unabhängige Überlegungen. Einmal die mechanische,
          welche die Stabilität einer solch großen „hohlen“ Struktur betrifft, und einmal die der
          Gravitation: Damit eine stark genug Gravitationskraft entsteht, benötigt es eine sehr hohe
          Masse.
        </p>
        <p>
          Es gibt eine Grenze für jeden Himmelskörper, ab welcher seine eigene Gravitation stärker
          ist als das Material, aus welchem der Himmelskörper besteht. Nach den Berechnungen von
          Charles Lineweaver und Marc Norman muss ein Gesteinskörper mindestens einen Radius von
          300&nbsp;km besitzen, damit seine eigene Gravitationskraft stark genug ist, um ihn zu
          einer Kugel zu formen. Oberhalb dieser Grenze können große Abweichungen von der massiven
          Kugelform nicht dauerhaft bestehen. Der Mond liegt mit einem Radius von etwa 1737&nbsp;km
          weit über dieser Grenze. Dieser Hohlraum von mehreren hundert oder tausend Kilometern
          müsste also unter dem Gewicht der außenliegenden Gesteinsschicht zusammenstürzen. Aus
          natürlichem Gestein könnte ein solcher Mond folglich nicht bestehen. Für den hohlen Mond
          müsste es also ein uns unbekanntes belastbares Material geben, das diese Strukturen halten
          könnte, wofür es allerdings keine Beweise gibt.
        </p>
        <p>
          Die zweite Überlegung betrifft die Masse des Mondes. Nach dem Newtonschen
          Kugelschalentheorem wirkt die Anziehungskraft einer kugelsymmetrischen Masse auf einen
          äußeren Körper genauso, als wäre die gesamte Masse in ihrem Mittelpunkt vereint. Die Masse
          des Mondes lässt sich aufgrund dessen, also unabhängig von jeder Auffassung seines inneren
          Aufbaus, allein aus seiner Gravitationswirkung bestimmen. Eine Möglichkeit zur Bestimmung
          der Masse geht über das Erde-Mond-Baryzentrum, also den gemeinsamen Massenschwerpunkt der
          beiden Körper. Dieses Zentrum lässt sich mit
        </p>
        <Equation tex={String.raw`R_S = \frac{m_1\cdot r_1 + m_2\cdot r_2}{m_1 + m_2}`} n="7.1" />
        <p>
          berechnen und liegt etwa 4670&nbsp;km vom Erdmassenmittelpunkt entfernt, was immer noch im
          Erdinneren liegt. Kennt man die Lage des Baryzentrums und die Erdmasse, lässt sich die
          Formel nach der Mondmasse umstellen. Eine weitere Möglichkeit ist die Umlaufzeit von
          Raumfahrzeugen, welche den Mond umkreisen. Ein Beispiel wären die Apollo-Kommandokapseln,
          welche den Mond in einer Höhe von 110&nbsp;km in zwei Stunden umkreisten, was sich mit dem
          dritten Keplerschen Gesetz berechnen lässt. Beide Wege führen übereinstimmend zu einer
          Mondmasse von etwa <Tex>{String.raw`7{,}346\cdot10^{22}\ \text{kg}`}</Tex>.
        </p>
      </div>

      <Figure
        n="7.1"
        steps={[
          'Lies die beiden Linien rechts von r / R = 1 ab, also außerhalb des Mondes: Sie liegen genau übereinander. Von außen sind Voll- und Hohlkugel gleicher Masse nicht zu unterscheiden.',
          'Links davon, im Inneren, trennen sie sich: Im Hohlraum der Hohlkugel ist die Schwerkraft null.',
        ]}
        caption="Kugelschalentheorem: Außerhalb der Oberfläche (r > R) wirken Voll- und Hohlkugel gleicher Masse identisch. Die Masse allein beweist also noch nicht, dass der Mond voll ist."
      >
        <ShellGravityChart />
      </Figure>

      <div class="prose">
        <p>
          Das Kugelschalentheorem besagt aber auch, dass eine Hohlkugel und eine Vollkugel mit
          gleicher Masse von außen die gleiche Gravitationskraft haben. Das führt dazu, dass die
          Masse allein nicht ausreicht, um zu beweisen, dass der Mond nicht hohl ist. Die
          Apollo-Missionen brachten auch Gesteinsproben zurück zur Erde. Aus diesen Gesteinsproben
          lässt sich die Dichte des Mondgesteins bestimmen. Für die Dichte des Mondbasalts wurde
          eine Dichte zwischen 3,27 und 3,46&nbsp;g/cm³ und für das Gestein des Hochlandes eine
          Dichte von 2,2 bis 2,6&nbsp;g/cm³ ermittelt. Würde der Mond aus einer hohlen Schale mit
          dieser Dichte bestehen, hätte er eine deutlich geringere Masse. Genau diesen Zusammenhang
          lässt sich mit unserem eigenen Programm überprüfen:
        </p>
        <p>
          Für die Überprüfung haben wir mit unserem Simulationsprogramm zwei Szenarien simuliert.
          Zunächst haben wir das reguläre Erde-Mond-System mit den realen Werten simuliert, also
          eine Erdmasse von <Tex>{String.raw`5{,}97\cdot10^{24}\ \text{kg}`}</Tex>, einer Mondmasse
          von <Tex>{String.raw`7{,}35\cdot10^{22}\ \text{kg}`}</Tex> und einem Abstand von
          384.400&nbsp;km. Ein Baryzentrum ergab sich bei etwa 4.670&nbsp;km vom Erdmittelpunkt
          entfernt und eine Umlaufzeit von 27,3&nbsp;Tagen. Dies lässt sich mit den tatsächlichen
          Werten bestätigen, was zeigt, dass unser Programm alles richtig rechnet.
        </p>
        <p>Für die Widerlegung eines hohlen Mondes haben wir anschließend die Masse eines</p>
        <Equation
          tex={String.raw`m = \rho\cdot\tfrac43\cdot\pi\cdot\left(R^3 - r^3\right)`}
          n="7.2"
        />
        <p>
          angeblichen hohlen Mondes berechnet. Um der Hohlen-Mond-These noch entgegenzukommen, sind
          wir bei der Berechnung der Masse ausschließlich von dem dichtesten Mondgestein
          ausgegangen, also von 3,46&nbsp;g/cm³. Für den hohlen Mond sind wir davon ausgegangen,
          dass nur eine äußere Gesteinsschale vorhanden ist und das Innere leer bleibt, also ein
          Mond mit Hohlraum. Ist die Schale des Mondes 10&nbsp;% des Mondradius dick, also ein
          Hohlraum mit 90&nbsp;% des Mondradius, hätte der Mond eine Masse von etwa{' '}
          <Tex>{String.raw`2{,}06\cdot10^{22}\ \text{kg}`}</Tex>. Dies entspricht 28&nbsp;% der
          tatsächlichen Masse des Mondes. Bei einer dickeren Schale mit 20&nbsp;% Schalenstärke
          wären das <Tex>{String.raw`3{,}71\cdot10^{22}\ \text{kg}`}</Tex>, was ungefähr der Hälfte
          der echten Masse entspricht.
        </p>
        <p>
          Diese Werte der Masse haben wir dann in unser Programm eingefügt. Da der Mond nun leichter
          ist, verschiebt sich auch das Baryzentrum weiter ins Erdinnere. Bei 10&nbsp;%
          Schalenstärke liegt es noch etwa 1320&nbsp;km vom Erdmittelpunkt entfernt, bei 20&nbsp;%
          Schalenstärke etwa 2370&nbsp;km. Der tatsächliche Wert liegt aber bei 4670&nbsp;km, was
          zeigt, dass ein hohler Mond nicht zu den tatsächlich gemessenen Werten passt.
        </p>
      </div>

      <Figure
        n="7.2"
        steps={[
          'Ziehe die Schalendicke von 100 % (massiver Mond) nach unten: Masse und Baryzentrum sinken. Bei 10 % liegt das Baryzentrum nur noch bei etwa 1.320 km, weit unter den gemessenen 4.670 km, und die Anzeige springt auf „passt nicht zu den Messungen“.',
          'Stelle 20 % ein: etwa 2.370 km, immer noch viel zu wenig. Die Umlaufzeit ändert sich dabei nur um wenige Stunden, deshalb ist das Baryzentrum der bessere Test.',
          'Stelle die Dichte auf 2,2 g/cm³ (Hochlandgestein): Selbst ein massiver Mond wäre dann zu leicht und das Baryzentrum läge zu nah an der Erdmitte.',
          'Die Kurve darunter zeigt das Baryzentrum für jede Schalendicke, die waagerechte Linie den gemessenen Wert. Nur bei fast massivem Mond treffen sich beide.',
          'Mit „Im Simulator ansehen“ läuft dieselbe Rechnung als Simulation.',
        ]}
        caption="Unser Experiment zum Nachvollziehen: Masse, Baryzentrum und Umlaufzeit eines hohlen Mondes aus Mondgestein. Nur ein fast massiver Mond liegt mit dem Baryzentrum innerhalb von 5&nbsp;% beim gemessenen Wert von 4.670&nbsp;km."
      >
        <HollowBarycenter />
      </Figure>

      <div class="prose">
        <p>
          Die simulierte Umlaufzeit hat sich dagegen kaum verändert. Bei 10&nbsp;% Schalenstärke
          verlängerte sie sich nur um etwa 3&nbsp;Stunden auf rund 27,4&nbsp;Tage. Dies liegt daran,
          dass die Erde etwa 81-mal so schwer ist wie der Mond und somit die Umlaufzeit fast
          ausschließlich von ihr abhängt. Deswegen ist das Baryzentrum der deutlich bessere Test, um
          einen hohlen Mond zu erkennen.
        </p>
        <p>
          Die Simulation zeigt somit, dass die berechneten und simulierten Werte nicht in unserem
          Sonnensystem funktionieren würden. Dies bedeutet, dass der Mond massiv sein muss, damit
          unser Sonnensystem so, wie wir es kennen, weiterhin funktionieren kann.
        </p>

        <SectionTitle n="7.3">Dichte, Trägheitsmoment und innere Struktur des Mondes</SectionTitle>
        <p>
          Laut der NASA hat der Mond eine durchschnittliche Dichte von 3,344&nbsp;g/cm³, während die
          Erde hingegen eine durchschnittliche Dichte von 5,514&nbsp;g/cm³ besitzt. Vertreter der
          Hohlen-Mond-These führen dies gerne als Beweis auf, es lässt sich aber durch den Aufbau
          der Erde leicht widerlegen. Im Inneren der Erde befindet sich ein Eisenkern mit einem
          Radius von etwa 3485&nbsp;km, währenddessen der Mond einen sehr kleinen Kern mit einem
          Radius von nur etwa 250&nbsp;km hat. Die durchschnittliche Dichte des Mondgesteins liegt
          zwischen 3,27 und 3,46&nbsp;g/cm³. Wäre der Mond nun trotz allem hohl, müsste die Schale
          aus einem viel dichteren Material sein, was sich rechnerisch überprüfen lässt:
        </p>
        <Equation
          tex={String.raw`\rho = \frac{3{,}344\ \text{g/cm}^3}{1-0{,}9^3} \approx 12{,}3\ \text{g/cm}^3`}
          n="7.3"
        />
        <p>
          Das bedeutet, die Schale des hohlen Mondes müsste aus einem Material sein, das dichter ist
          als Eisen.
        </p>
      </div>

      <Figure
        n="7.3"
        steps={[
          'Ziehe die Dicke von rechts (Vollkugel, 1.737 km) nach links: Die nötige Dichte steigt. Ab etwa 5 g/cm³ liegt sie über jedem Gestein, bei sehr dünner Schale sogar über der von Osmium, dem dichtesten Element.',
          'Auf der Dichteskala zeigt der orange Punkt („benötigt“), wo das Schalenmaterial liegen müsste, im Vergleich zu Wasser, Gestein, Eisen und Osmium.',
          'Achte auf das Trägheitsmoment: Jede Hohlkugel liegt über 0,4, der gemessene Wert des Mondes liegt mit 0,3931 darunter.',
          'Die Druckspannung in der Schale wird mit der Druckfestigkeit von Granit verglichen: Eine dünne, große Schale würde unter ihrem Gewicht zerdrückt.',
        ]}
        caption="Hohlmond-Rechner: Dichte, Trägheitsmoment und Druckspannung einer Mondschale der gewählten Dicke bei der gemessenen Mondmasse."
      >
        <ShellCalculator />
      </Figure>

      <div class="prose">
        <p>
          Das entscheidende Argument stammt vom Trägheitsmoment. Es zeigt, wie die Masse im Inneren
          eines Objektes verteilt ist. Eine Kugel mit gleichmäßiger Dichte, also einer gleichmäßig
          verteilten Masse, besitzt einen Trägheitsmomentfaktor von 0,4. Je mehr Masse im Zentrum
          liegt, desto niedriger ist dieser Wert. Bei der Erde, mit ihrem massiven Kern, liegt der
          Wert bei 0,3307. Bei einer Hohlkugel steigt dieser Wert, da die Masse weiter außen
          verteilt ist. Nach der Formel
        </p>
        <Equation
          tex={String.raw`\frac{C}{M\cdot R^2} = 0{,}4\cdot\frac{R^5-r^5}{R^3-r^3}`}
          n="7.4"
        />
        <p>
          ergäbe sich ein Wert von 0,44 bei einem Hohlraum mit halbem Mondradius. Laut
          Laserentfernungsmessungen und Messungen von Raumsonden ergibt sich ein Wert von
          0,3931&nbsp;±&nbsp;0,0002. Dieser Wert erfordert eine leichte Zunahme der Dichte im
          Zentrum des Mondes, was eine Hohlkugel ausschließt.
        </p>
      </div>

      <Figure
        n="7.4"
        steps={[
          'Starte das Rennen: Drei Kugeln rollen dieselbe schiefe Ebene hinab, die weißen Striche zeigen ihre Drehung. Die Kugel mit dem Trägheitsmoment des Mondes kommt fast zeitgleich mit der Vollkugel an, die Hohlkugel bleibt deutlich zurück.',
          'Je mehr Masse in der Mitte sitzt, desto schneller rollt eine Kugel. So lässt sich die Massenverteilung auch ohne Mondflug unterscheiden.',
        ]}
        caption="Rollversuch: Eine Kugel mit dem Trägheitsmoment des Mondes rollt wie eine Vollkugel – nicht wie eine Hohlkugel."
      >
        <RollingRace />
      </Figure>

      <div class="prose">
        <p>
          Die Messwerte passen zu dem heutigen Modell des Mondes. Der Mond hat laut der
          GRAIL-Mission eine 34 bis 43&nbsp;km dicke Kruste. 2011 wies ein Team der NASA mithilfe
          der alten Apollo-Seismometerdaten einen Mondkern nach. Dieser Kern ist im Innersten fest
          mit einem Radius von etwa 240&nbsp;km und umgeben von einem äußeren Kern mit einem Radius
          von ungefähr 330&nbsp;km. Eine Fachzeitschrift bestätigte dies 2023 und sagte, der Kern
          habe eine ähnliche Dichte wie Eisen.
        </p>

        <SectionTitle n="7.4">Warum die Theorie mit den Beobachtungen unvereinbar ist</SectionTitle>
        <p>
          Neben Berechnungen widersprechen auch mehrere direkte Beobachtungen der
          Hohlen-Mond-Theorie.
        </p>
        <p>
          Zuerst lassen sich die ursprünglichen Beweise aus Kapitel 7.1 widerlegen. Bei dem Absturz
          der Apollo-12-Aufstiegsstufe registrierte ein Seismometer laut NASA etwa 55&nbsp;Minuten
          lang Beben. Dies lässt sich aber erklären: Im Mond fehlt Wasser, welches solche
          Erschütterungen bei uns auf der Erde dämpft. Der Mond ist aber trocken und starr, was für
          ein langes Nachschwingen sorgt. Außerdem werden die Wellen auch in der porösen Mondkruste
          immer weiter gestreut und geteilt.
        </p>
        <p>
          Auch Mondbeben selbst sprechen gegen einen Hohlraum. Bis 1977 haben die Apollo-Seismometer
          ungefähr 12.000 Mondbeben verzeichnet, wovon die meisten in einer Tiefe von 700 bis
          1200&nbsp;km stattfanden. Die Wellen müssen also durch festes Gestein vom Mondinneren bis
          an die Oberfläche kommen. Die von der Apollo-Mission zurückgelassenen Reflektoren zeigen
          außerdem, dass die Drehung des Mondes zusätzlich gebremst wird. Dies lässt sich mit einem
          flüssigen Kern, mit Grenze zum Mantel, erklären, welcher an dem Mantel reibt, was nur bei
          einem gefüllten Mondinneren möglich ist.
        </p>
        <p>
          Keine Beobachtung stützt in irgendeiner Art und Weise die Hohle-Mond-Theorie, was sie zu
          einer Verschwörung und keiner wissenschaftlichen These macht. Mondbeben,
          Laserentfernungsmessungen und Gesteinsproben zeigen Übereinstimmung mit einem festen Mond
          mit Kruste, Mantel und Kern.
        </p>
      </div>
    </>
  );
}

function HollowBarycenter() {
  const [frac, setFrac] = useState(0.1);
  const [rho, setRho] = useState(3.46);
  const m = shellMass(frac, rho * 1000);
  const r = MOON_DISTANCE_KM * KM;
  const bary = barycenterOffset(EARTH.mass, m, r);
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / (G * (EARTH.mass + m)));
  const realPeriod = 2 * Math.PI * Math.sqrt(r ** 3 / (G * (EARTH.mass + MOON.mass)));
  const curve = useMemo(() => {
    const n = 100;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const f = 0.02 + (0.98 * i) / (n - 1);
      x[i] = f * 100;
      y[i] = barycenterOffset(EARTH.mass, shellMass(f, rho * 1000), r) / KM;
    }
    return { x, y };
  }, [rho]);
  const ok = Math.abs(bary - REAL_BARY) / REAL_BARY < 0.05;
  return (
    <div class="stack" style={{ gap: 'var(--sp-4)' }}>
      <div class="grid-2">
        <div class="stack">
          <Slider
            id="hb-frac"
            label="Schalendicke (Anteil am Mondradius)"
            value={frac}
            min={0.02}
            max={1}
            step={0.01}
            format={(v) => `${fmt(v * 100)} %`}
            hint="100&nbsp;% = massiver Mond"
            onChange={setFrac}
          />
          <Slider
            id="hb-rho"
            label="Dichte des Gesteins"
            value={rho}
            min={2.2}
            max={3.46}
            step={0.01}
            format={(v) => `${fmt(v, 2)} g/cm³`}
            hint="Hochland 2,2–2,6 · Mondbasalt 3,27–3,46"
            onChange={setRho}
          />
        </div>
        <div class="stack">
          <dl class="kv">
            <dt>Masse des Mondes</dt>
            <dd>{sci(m, 2)} kg</dd>
            <dt>Anteil an der echten Masse</dt>
            <dd>{fmt((m / MOON.mass) * 100)} %</dd>
            <dt>Baryzentrum</dt>
            <dd>{fmt(bary / KM)}&nbsp;km</dd>
            <dt>gemessen</dt>
            <dd>{fmt(REAL_BARY / KM)}&nbsp;km</dd>
            <dt>Umlaufzeit</dt>
            <dd>
              {fmt(period / DAY, 2)}&nbsp;Tage ({period > realPeriod ? '+' : '−'}
              {fmt(Math.abs(period - realPeriod) / 3600, 1)} h)
            </dd>
          </dl>
          <StatusChip status={ok ? 'ok' : 'fail'}>
            {ok ? 'passt zu den Messungen' : 'passt nicht zu den Messungen'}
          </StatusChip>
          {SHOW_SIMULATOR && (
            <button
              type="button"
              class="btn small"
              onClick={() =>
                openInSimulator(
                  {
                    ...REAL_PARAMS,
                    sunMass: 0,
                    moonDistance: MOON_DISTANCE_KM,
                    moonSpeed: 1,
                    moonMass: m / MOON.mass,
                  },
                  'Hohler Mond',
                )
              }
            >
              Im Simulator ansehen
            </button>
          )}
        </div>
      </div>
      <LineChart
        series={[{ id: 'b', label: 'Baryzentrum', x: curve.x, y: curve.y }]}
        xLabel="Schalendicke (% des Mondradius)"
        yLabel="Abstand Baryzentrum – Erdmitte (km)"
        xFormat={(v) => fmt(v)}
        yFormat={(v) => fmt(v)}
        refLines={[{ y: REAL_BARY / KM, label: 'gemessen: 4.670\u00a0km' }]}
        yMin={0}
        height={210}
      />
    </div>
  );
}
