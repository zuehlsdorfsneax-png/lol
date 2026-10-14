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
import { Callout, Equation, Figure, SectionTitle, StatusChip, Tex } from '../../ui/content';
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
          Neben den bisher behandelten faktischen Themen kursieren in der Öffentlichkeit bis heute
          auch pseudowissenschaftliche Vorstellungen über Himmelskörper, die im direkten Widerspruch
          zu den Naturgesetzen stehen. Eine der bekanntesten ist die Behauptung, der Mond sei hohl
          beziehungsweise kein massiver Himmelskörper, sondern eine Attrappe. Dieses Kapitel
          untersucht diese These und widerlegt sie auch mit Hilfe unseres Programms anhand
          mathematischer Berechnungen.
        </p>

        <SectionTitle n="7.1">Ursprung und Grundidee der Theorie</SectionTitle>
        <p>
          Die Hohle-Mond-These geht noch weiter: Nach dieser Vorstellung soll der Mond nicht
          natürlich entstanden sein, sondern von einer unbekannten, technisch sehr fortgeschrittenen
          Zivilisation gebaut und anschließend in eine Umlaufbahn um die Erde gebracht worden sein.
        </p>
        <p>
          Den Ursprung dieser These findet man in dem im Juli 1970 veröffentlichten Artikel „Ist der
          Mond die Schöpfung einer außerirdischen Intelligenz?“. Ihn veröffentlichten die beiden
          sowjetischen Wissenschaftler Michail Wassin und Alexander Schtscherbakow in der
          Zeitschrift
          <em> Sputnik</em> – obwohl beide Mitglieder der Sowjetischen Akademie der Wissenschaften
          waren, unterlag der Artikel keinem wissenschaftlichen Begutachtungsverfahren. Die beiden
          stellten die These auf, dass riesige Maschinen einer außerirdischen Zivilisation im Mond
          Hohlräume geschmolzen hätten und die äußere Gesteinsschicht des Mondes aus dem
          abgetragenen Gestein bestehe.
        </p>
        <p>
          Den Anstoß lieferte wahrscheinlich die NASA selbst: Am 20. November 1969 ließ sie im
          Rahmen der Mission Apollo 12 die ausgediente Aufstiegsstufe der Mondlandefähre auf den
          Mond stürzen. Die zurückgelassenen Seismometer maßen Erschütterungen, die noch fast eine
          Stunde nach dem Aufprall nachklangen. Im März 1970 verglich ein Artikel im Magazin{' '}
          <em>Popular Science</em> dieses Nachklingen mit einer Glocke – das Bild des hohlen Mondes
          war geboren.
        </p>
        <p>
          Neu war die Idee zu diesem Zeitpunkt nicht. Bereits 1901 beschrieb der britische
          Schriftsteller H. G. Wells den Mond als hohl – allerdings ausdrücklich in seinem
          Science-Fiction-Roman „The First Men in the Moon“ und nicht als ernst gemeinte
          wissenschaftliche These. Etwa anderthalb Jahre vor dem Artikel von Wassin und
          Schtscherbakow lief eine Folge der US-Serie <em>Star Trek</em>, in der sich ein
          Himmelskörper als künstliches Raumschiff entpuppte. Ein direkter Zusammenhang lässt sich
          nicht belegen, wird von einzelnen Autoren aber als möglicher kultureller Einfluss
          diskutiert. In den folgenden Jahrzehnten verbreiteten vor allem wenige US-amerikanische
          Autoren wie Don Wilson und George Leonard die Idee in populärwissenschaftlichen Büchern
          weiter – ohne jede wissenschaftliche Begutachtung.
        </p>
        <p>
          Die Grundidee stützt sich damit weder auf Messdaten noch auf nachvollziehbare
          physikalische Modelle, sondern nur auf die Fehlinterpretation eines einzelnen
          Messergebnisses und auf Ideen aus der Science-Fiction-Literatur.
        </p>

        <SectionTitle n="7.2">Physikalische Argumente gegen einen hohlen Mond</SectionTitle>
        <p>
          Gegen einen hohlen Mond sprechen zwei unabhängige Überlegungen: eine mechanische, welche
          die Stabilität einer so großen hohlen Struktur betrifft, und eine gravitative – damit eine
          ausreichend starke Gravitation entsteht, braucht es eine sehr große Masse.
        </p>
        <p>
          Für jeden Himmelskörper gibt es eine Grenze, ab der seine eigene Gravitation stärker ist
          als das Material, aus dem er besteht. Nach den Berechnungen von Charles Lineweaver und
          Marc Norman muss ein Gesteinskörper mindestens einen Radius von etwa 300&nbsp;km besitzen,
          damit seine Gravitation ihn zu einer Kugel formt. Oberhalb dieser Grenze können große
          Abweichungen von der massiven Kugelform nicht dauerhaft bestehen. Der Mond liegt mit einem
          Radius von etwa 1.737&nbsp;km weit darüber. Ein Hohlraum von mehreren hundert oder tausend
          Kilometern müsste unter dem Gewicht der außenliegenden Gesteinsschicht zusammenstürzen.
          Aus natürlichem Gestein könnte ein solcher Mond also nicht bestehen; es bräuchte ein
          unbekanntes, extrem belastbares Material, für das es keinerlei Belege gibt (siehe auch die
          Druckspannung in Abb. 7.3).
        </p>
        <p>
          Die zweite Überlegung betrifft die Masse. Nach dem Newtonschen Kugelschalentheorem wirkt
          die Anziehung einer kugelsymmetrischen Masse auf einen äußeren Körper genauso, als wäre
          die gesamte Masse im Mittelpunkt vereint. Die Masse des Mondes lässt sich deshalb
          unabhängig von seinem inneren Aufbau allein aus seiner Gravitationswirkung bestimmen. Ein
          Weg führt über das Erde-Mond-Baryzentrum, das etwa 4.670&nbsp;km vom Erdmittelpunkt
          entfernt noch im Erdinneren liegt. Ein zweiter Weg führt über die Umlaufzeit von
          Raumfahrzeugen, die den Mond umkreisen – etwa die Apollo-Kommandokapseln, die ihn in etwa
          110&nbsp;km Höhe in rund zwei Stunden umrundeten. Mit dem dritten Keplerschen Gesetz
          folgt:
        </p>
        <Equation
          tex={String.raw`M_\text{Mond} = \frac{4\pi^2\,r^3}{G\,T^2},\qquad r = 1\,737\ \text{km} + 110\ \text{km},\quad T \approx 2\ \text{h}.`}
          n="7.1"
        />
        <p>
          Beide Wege führen übereinstimmend zu einer Mondmasse von etwa{' '}
          <Tex>{String.raw`7{,}35\cdot10^{22}\ \text{kg}`}</Tex>.
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
          Das Kugelschalentheorem besagt aber auch, dass eine Hohlkugel und eine Vollkugel gleicher
          Masse von außen die gleiche Gravitation haben. Die Masse allein reicht also nicht als
          Beweis. Die Apollo-Missionen brachten jedoch Gesteinsproben zur Erde, aus denen sich die
          Dichte des Mondgesteins bestimmen lässt: Für die Mondbasalte ergibt sich eine Dichte
          zwischen 3,27 und 3,46&nbsp;g/cm³, für das Hochlandgestein 2,2 bis 2,6&nbsp;g/cm³.
          Bestünde der Mond aus einer hohlen Schale dieser Dichte, hätte er eine deutlich geringere
          Masse. Genau diesen Zusammenhang haben wir mit unserem eigenen Programm überprüft.
        </p>
        <p>
          Zunächst haben wir das reale Erde-Mond-System simuliert: Erdmasse{' '}
          <Tex>{String.raw`5{,}97\cdot10^{24}\ \text{kg}`}</Tex>, Mondmasse{' '}
          <Tex>{String.raw`7{,}35\cdot10^{22}\ \text{kg}`}</Tex>, Abstand 384 400 km. Es ergaben
          sich ein Baryzentrum bei etwa 4.670&nbsp;km vom Erdmittelpunkt und eine Umlaufzeit von
          27,3 Tagen – beides stimmt mit den tatsächlichen Werten überein und zeigt, dass unser
          Programm richtig rechnet.
        </p>
        <p>Anschließend haben wir die Masse eines angeblich hohlen Mondes mit</p>
        <Equation
          tex={String.raw`M_\text{Schale} = \tfrac43\pi\left(R^3 - r_\text{innen}^3\right)\cdot\rho`}
          n="7.2"
        />
        <p>
          berechnet. Um der These entgegenzukommen, sind wir ausschließlich vom dichtesten
          Mondgestein ausgegangen (3,46&nbsp;g/cm³). Ist die Schale 10&nbsp;% des Mondradius dick –
          90&nbsp;% des Radius wären hohl –, hätte der Mond eine Masse von etwa{' '}
          <Tex>{String.raw`2{,}06\cdot10^{22}\ \text{kg}`}</Tex>, also nur 28 % der tatsächlichen
          Masse. Bei 20&nbsp;% Schalenstärke wären es{' '}
          <Tex>{String.raw`3{,}71\cdot10^{22}\ \text{kg}`}</Tex>, ungefähr die Hälfte.
        </p>
        <p>
          Diese Massen haben wir in unser Programm eingesetzt. Da der Mond nun leichter ist, rückt
          das Baryzentrum näher an den Erdmittelpunkt: bei 10&nbsp;% Schalenstärke auf etwa
          1.320&nbsp;km, bei 20&nbsp;% auf etwa 2.370&nbsp;km. Gemessen sind aber 4.670&nbsp;km –
          ein hohler Mond passt also nicht zu den Beobachtungen. Die simulierte Umlaufzeit
          veränderte sich dagegen kaum: Bei 10&nbsp;% Schalenstärke verlängerte sie sich nur um etwa
          3&nbsp;Stunden auf rund 27,4&nbsp;Tage. Das liegt daran, dass die Erde etwa 81-mal so
          schwer ist wie der Mond und die Umlaufzeit fast nur von ihr abhängt. Deshalb ist das
          Baryzentrum der deutlich bessere Test.
        </p>
      </div>

      <Figure
        n="7.2"
        steps={[
          'Ziehe die Schalendicke von 100 % (massiver Mond) nach unten: Masse und Baryzentrum sinken. Bei 10 % liegt das Baryzentrum nur noch bei etwa 1.320 km, weit unter den gemessenen 4.670 km, und die Anzeige springt auf „passt nicht zu den Messungen“.',
          'Stelle 20 % ein: etwa 2.370 km, immer noch viel zu wenig. Die Umlaufzeit ändert sich dabei nur um wenige Stunden, deshalb ist das Baryzentrum der bessere Test.',
          'Mit „Im Simulator ansehen“ läuft dieselbe Rechnung als Simulation.',
        ]}
        caption="Unser Experiment zum Nachvollziehen: Masse, Baryzentrum und Umlaufzeit eines hohlen Mondes aus Mondgestein. Nur ein fast massiver Mond liegt mit dem Baryzentrum innerhalb von 5&nbsp;% beim gemessenen Wert von 4.670&nbsp;km."
      >
        <HollowBarycenter />
      </Figure>

      <div class="prose">
        <p>
          Die berechneten und simulierten Werte eines hohlen Mondes passen also nicht zu unserem
          Sonnensystem. Der Mond muss massiv sein, damit das System so funktioniert, wie wir es
          beobachten.
        </p>

        <SectionTitle n="7.3">Dichte, Trägheitsmoment und innere Struktur des Mondes</SectionTitle>
        <p>
          Laut NASA hat der Mond eine durchschnittliche Dichte von 3,344&nbsp;g/cm³, die Erde
          dagegen von 5,514&nbsp;g/cm³. Vertreter der Hohle-Mond-These führen das gern als Beweis
          an, es lässt sich aber durch den Aufbau der Körper leicht erklären: Im Inneren der Erde
          befindet sich ein Eisenkern mit einem Radius von etwa 3.485&nbsp;km, während der Mond nur
          einen sehr kleinen Eisenkern mit etwa 250&nbsp;km Radius besitzt. Nach der heute
          anerkannten Kollisionstheorie entstand der Mond vor 4,5&nbsp;Milliarden Jahren vor allem
          aus eisenarmem Mantelgestein. Die Dichte des Mondgesteins liegt zwischen 3,27 und
          3,46&nbsp;g/cm³ – sie passt also genau zur mittleren Dichte eines massiven Mondes. Wäre
          der Mond trotzdem hohl, müsste die Schale aus einem Material bestehen, das dichter ist als
          Eisen (7,9&nbsp;g/cm³): Schon bei einer Schalendicke von 10&nbsp;% des Radius wären es{' '}
          <Tex>{String.raw`\rho = 3{,}344/(1-0{,}9^3) \approx 12{,}3`}</Tex>&nbsp;g/cm³, bei
          50&nbsp;km Schalendicke fast 40&nbsp;g/cm³, das 1,8-Fache des dichtesten Elements Osmium
          (Abb. 7.3).
        </p>
        <p>
          Das Trägheitsmoment <Tex>{String.raw`I = k\cdot MR^2`}</Tex> beschreibt, wie die Masse um
          die Drehachse verteilt ist. Eine Vollkugel hat <Tex>{'k = 0{,}4'}</Tex>, jede Hohlkugel
          mehr (bis 2/3). Für den Mond wurde über die Laserreflektoren von Apollo 11, 14 und 15
          sowie mit den Sonden Lunar Prospector und GRAIL <Tex>{String.raw`k = 0{,}393`}</Tex>{' '}
          gemessen – kleiner als 0,4. Die Erde mit ihrem massiven Kern kommt auf 0,3307. Bei einem
          Hohlraum mit halbem Mondradius ergäbe die Formel
          <Tex>{String.raw`k = 0{,}4\cdot\frac{R^5-r^5}{R^3-r^3} \approx 0{,}44`}</Tex>, bei
          dünnerer Schale noch mehr. Gemessen ist <Tex>{String.raw`k = 0{,}3931\pm0{,}0002`}</Tex>:
          Die Masse ist leicht zur Mitte hin konzentriert, das genaue Gegenteil eines Hohlkörpers.
        </p>
      </div>

      <Figure
        n="7.3"
        steps={[
          'Ziehe die Dicke von rechts (Vollkugel, 1.737 km) nach links: Die nötige Dichte steigt. Ab etwa 5 g/cm³ liegt sie über jedem Gestein, bei sehr dünner Schale sogar über der von Osmium, dem dichtesten Element.',
          'Achte auf das Trägheitsmoment: Jede Hohlkugel liegt über 0,4, der gemessene Wert des Mondes liegt mit 0,3931 darunter.',
          'Die Druckspannung in der Schale wird mit der Druckfestigkeit von Granit verglichen: Eine dünne, große Schale würde unter ihrem Gewicht zerdrückt.',
        ]}
        caption="Hohlmond-Rechner: Dichte, Trägheitsmoment und Druckspannung einer Mondschale der gewählten Dicke bei der gemessenen Mondmasse."
      >
        <ShellCalculator />
      </Figure>

      <Figure
        n="7.4"
        steps={[
          'Starte das Rennen: Drei Kugeln rollen dieselbe schiefe Ebene hinab. Die Kugel mit dem Trägheitsmoment des Mondes kommt fast zeitgleich mit der Vollkugel an, die Hohlkugel bleibt deutlich zurück.',
          'Je mehr Masse in der Mitte sitzt, desto schneller rollt eine Kugel. So lässt sich die Massenverteilung auch ohne Mondflug unterscheiden.',
        ]}
        caption="Rollversuch: Eine Kugel mit dem Trägheitsmoment des Mondes rollt wie eine Vollkugel – nicht wie eine Hohlkugel."
      >
        <RollingRace />
      </Figure>

      <div class="prose">
        <SectionTitle n="7.4">Warum die Theorie mit den Beobachtungen unvereinbar ist</SectionTitle>
        <p>
          Auch das angebliche „Läuten“ des Mondes ist erklärt. Beim Absturz der
          Apollo-12-Aufstiegsstufe registrierte ein Seismometer laut NASA etwa 55&nbsp;Minuten lang
          Beben. Auf der Erde dämpft Wasser im Gestein solche Erschütterungen. Der Mond ist dagegen
          trocken und starr, was ein langes Nachschwingen erklärt; außerdem werden die Wellen in der
          porösen Mondkruste immer weiter gestreut.
        </p>
        <p>
          Auch die Mondbeben selbst sprechen gegen einen Hohlraum. Bis 1977 zeichneten die
          Apollo-Seismometer rund 12.000 Mondbeben auf, die meisten in 700 bis 1.200&nbsp;km Tiefe.
          Ihre Wellen laufen also durch festes Gestein vom Inneren zur Oberfläche. Die
          zurückgelassenen Laserreflektoren zeigen außerdem, dass die Drehung des Mondes zusätzlich
          gebremst wird. Das lässt sich mit einem flüssigen Kern erklären, der am Mantel reibt – nur
          in einem gefüllten Mond möglich.
        </p>
        <p>
          Das heutige Modell passt dazu: Laut der GRAIL-Mission hat der Mond eine 34 bis 43&nbsp;km
          dicke Kruste. Eine Neuauswertung der Apollo-Daten (Weber et al., 2011) fand einen festen
          inneren Kern mit etwa 240&nbsp;km Radius, umgeben von einem flüssigen äußeren Kern mit
          rund 330&nbsp;km Radius. 2023 bestätigten Briaud et al. den festen inneren Kern, dessen
          Dichte der von Eisen ähnelt.
        </p>
        <p>Alle unabhängigen Messungen führen zum selben Ergebnis:</p>
        <ul>
          <li>
            <strong>Mechanik:</strong> Eine Gesteinsschale dieser Größe würde unter ihrem Gewicht
            zusammenbrechen.
          </li>
          <li>
            <strong>Baryzentrum:</strong> Ein hohler Mond aus Mondgestein wäre zu leicht; das
            Baryzentrum läge viel zu nah an der Erdmitte.
          </li>
          <li>
            <strong>Dichte:</strong> Eine tragfähige Schale müsste dichter sein als jedes bekannte
            Material.
          </li>
          <li>
            <strong>Trägheitsmoment:</strong> k = 0,393 &lt; 0,4 zeigt eine Massenkonzentration zur
            Mitte.
          </li>
          <li>
            <strong>Seismik:</strong> Mondbeben zeigen Kruste, Mantel und Kern – keinen Hohlraum.
          </li>
        </ul>
        <p>
          Die Hohle-Mond-Theorie ist widerlegt. Für die Bahnrechnung bedeutet das: Der Mond darf als
          Punktmasse behandelt werden, denn nach dem Kugelschalentheorem spielt sein Aufbau für die
          Bahn keine Rolle.
        </p>
      </div>
      {SHOW_SIMULATOR && (
        <Callout kind="seminar">
          Die Rechnung aus Abb. 7.2 lässt sich direkt mit dem Simulator bestätigen: Mit dem Knopf
          „Im Simulator ansehen“ wird ein Erde-Mond-System mit der Masse des hohlen Mondes
          gestartet.
        </Callout>
      )}
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
