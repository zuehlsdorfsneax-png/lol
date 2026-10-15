import { useState } from 'preact/hooks';
import { EARTH, KM, MOON, G, DAY, barycenterOffset } from '../../physics';
import { SHOW_SIMULATOR } from '../../app/content';
import { openInSimulator } from '../../app/store';
import { REAL_PARAMS } from '../../physics';
import { CanvasBox } from '../../ui/CanvasBox';
import { Equation, Figure, SectionTitle, StatusChip, Tex } from '../../ui/content';
import { Slider } from '../../ui/controls';
import { fmt, sig } from '../../ui/format';
import { ForceLawLab, KeplerLab, MoonTest } from './GravityWidgets';

export function Basics() {
  return (
    <>
      <div class="prose">
        <SectionTitle n="2.1">Newtonsche Gravitation</SectionTitle>
        <p>
          Um zu verstehen, wie und warum Himmelskörper sich stabil zueinander bewegen, muss man erst
          einmal einen Blick auf die Physik werfen.
        </p>
        <p>
          Als Isaac Newton 1687 sein Hauptwerk „Philosophiae Naturalis Principia Mathematica“
          veröffentlichte, revolutionierte es unter anderem auch die Himmelsmechanik. Nicht mehr
          waren Astronomen an beschreibende Modelle, wie die Keplerschen Gesetze, gebunden,
          stattdessen hatten sie von dort an ein kausales physikalisches Fundament.
        </p>
        <p>
          Mit der Veröffentlichung seiner Arbeit brachte Newton auch drei relevante Axiome zur
          Himmelsmechanik.
        </p>
        <p>
          Das erste Axiom besagt, dass ein Körper seinen Bewegungszustand beibehält, solange keine
          weitere äußere Kraft auf den Körper einwirkt. Im Sinne der Himmelsmechanik bedeutete dies,
          dass stellare Objekte wie Planeten und Monde ihre Bewegungsenergie verlustlos beibehalten,
          solange kein anderes Objekt Kraft auf sie ausübt.
        </p>
        <p>
          Laut dem zweiten Axiom ist Bewegung, beziehungsweise Beschleunigung, proportional zur
          bewegenden, einwirkenden Kraft und agiert gradlinig zum krafterzeugenden Körper. Für die
          Flugbahnen von Himmelskörpern bedeutet das primär eine Richtungsänderung als Ablenkung auf
          Umlaufbahnen.
        </p>
        <p>
          Das dritte und wichtigste Axiom beschreibt das Reaktionsprinzip. Wenn ein Körper A eine
          Kraft auf einen Körper B ausübt, so wirkt eine gleichgroße, jedoch entgegengesetzte Kraft
          ebenfalls auf Körper A von Körper B. Dieses Prinzip der Wechselwirkung verdeutlicht für
          die Bahnstabilität, dass ein Himmelskörper, welcher ein zentrales Objekt umkreist,
          ebenfalls dieses zentrale Objekt anzieht, was zu einer Verschiebung des gemeinsamen
          Systems führen kann.
        </p>
        <p>
          Durch diese Erkenntnisse war es Newton möglich, mathematisch zu beweisen, dass und wie es
          möglich ist, zwei isolierte Massen auf stabilen periodischen Kreis- und Ellipsenbahnen zu
          beschreiben.
        </p>
        <p>
          Dafür stellte er unter anderem seine bekannteste Formel auf, zur Beschreibung der Kraft,
          welche auf eine verlustlos beschleunigte Masse wirkt.
        </p>
        <Equation tex={String.raw`F = m\times a`} n="2.1" />
        <p>
          bildet den Grundstein der Newtonschen Gravitationsgesetze und unseres Verständnisses der
          Bahnstabilität von Himmelskörpern.
        </p>
        <p>Eines dieser Gesetze ist das Newtonsche Gravitationsgesetz.</p>
        <Equation tex={String.raw`F_G = G\cdot\frac{m_1\, m_2}{r^2}`} n="2.2" />
        <p>
          beschreibt die von Newton definierte Gravitationskraft zwischen zwei isolierten Körpern.{' '}
          <Tex>{'m_1'}</Tex> und <Tex>{'m_2'}</Tex> stehen dabei für die Masse der beiden Körper,
          deren Werte in Kilogramm angegeben werden. <Tex>r</Tex> ist hierbei der Abstand der beiden
          Massezentren und <Tex>G</Tex> ist die sogenannte Gravitationskonstante, welche in vielen
          Formeln der Himmelsmechanik vorkommt. Durch die Aussage des dritten Axioms ist die
          Gravitationskraft für beide Körper gleich groß.
        </p>
      </div>

      <Figure
        n="2.1"
        steps={[
          'Lass n = 2 stehen: Die aus der Fallbeschleunigung vorhergesagte Beschleunigung (etwa 2,7 mm/s²) stimmt mit der aus der Mondbahn gemessenen überein, das Verhältnis liegt bei 1.',
          'Schiebe n auf 1 oder auf 3: Die beiden Balken laufen weit auseinander. Nur mit n = 2 passen Erdanziehung und Mondbahn zusammen.',
        ]}
        caption="Newtons Mondrechnung: Nur mit dem Exponenten n = 2 passt die aus der Fallbeschleunigung g vorhergesagte Beschleunigung zur gemessenen Bahnbeschleunigung des Mondes."
      >
        <MoonTest />
      </Figure>

      <div class="prose">
        <SectionTitle n="2.2">Das Zweikörper-Problem</SectionTitle>
        <p>
          In der Himmelsmechanik gibt es das Zweikörpermodell, welches die Bahnbewegungen zweier
          Körper untersucht, welche nur von ihren eigenen Gravitationskräften beeinflusst werden,
          ohne weitere Einflüsse von außen. Die Voraussetzungen sind, dass beide Körper mit einer
          punktförmigen Masse betrachtet werden, außerdem werden keine äußeren Kräfte wie von
          anderen Körpern mit beachtet. Es ist auch als Kepler-Problem bekannt, weil Johannes Kepler
          diese Bahnbewegungen anhand der Beobachtungen von Tycho Brahe beschrieb und die
          Keplerschen Gesetze formulierte. 1687 lieferte Isaac Newton die physikalische Erklärung
          dieser Beobachtung, der Planetenbewegungen, mit der Ableitung der Gravitations- und
          Bewegungsgesetze. Damit erklärte er nicht nur, wie sich Planeten bewegen, sondern auch
          warum sie es auf diese Weise tun.
        </p>
        <p>
          Isaac Newton vereinfachte das Zweikörperproblem, indem er, anstatt beide Körper
          gleichzeitig zu betrachten, sie beide einzeln betrachtete. Außerdem betrachtete er den
          gemeinsamen Schwerpunkt der Körper und dessen Bewegung und wie die beiden Körper sich
          relativ zueinander bewegen und stehen. Diese relative Bewegung ließ sich so beschreiben,
          als würde sich nur einer der beiden Körper bewegen, unter dem Einfluss des anderen. Diese
          Vereinfachung ermöglicht es, das Zweikörperproblem leichter und komplett mathematisch zu
          lösen.
        </p>
        <p>
          Die Lösung des Zweikörperproblems zeigt, dass es verschiedene Bahnformen gibt, zum
          Beispiel Kreise, Ellipsen, Parabeln und Hyperbeln. Welche Form die Bahnen annehmen, hängt
          von der Gesamtenergie des Systems ab. Bei einer negativen Gesamtenergie entsteht eine
          geschlossene Bahn in Form einer Kreisbahn oder einer Ellipsenbahn. Dies stimmt mit dem
          ersten Keplerschen Gesetz überein.
        </p>
      </div>

      <Figure
        n="2.2"
        steps={[
          'Erhöhe die Exzentrizität: Die Ellipse wird länger, die zwölf Sektoren behalten aber alle dieselbe Fläche. Sie werden zur Sonne hin kurz und breit, weit weg lang und schmal – der Körper ist in Sonnennähe am schnellsten.',
          'Der blaue Punkt läuft die Bahn ab und braucht für jeden Sektor gleich lang. Achte darauf, wie er sich in Sonnennähe beschleunigt und weit draußen langsamer wird.',
          'In den Tabellen ist T²/a³ für alle Planeten gleich (3. Keplersches Gesetz). Daraus folgt die Masse des Zentralkörpers: M = 4π²a³/(G T²).',
        ]}
        caption="Kepler-Labor: Zwölf Abschnitte gleicher Dauer haben gleiche Fläche (2. Keplersches Gesetz). Die Tabellen bestätigen T²/a³ = konstant und liefern die Masse von Sonne und Jupiter."
      >
        <KeplerLab />
      </Figure>

      <div class="prose">
        <p>
          Das Erde-Mond-System ist ein konkretes Beispiel für ein Zweikörpersystem mit negativer
          Gesamtenergie. Laut dem dritten Newtonschen Gesetz ziehen sich beide Körper mit gleich
          großer Gravitationskraft an. Aufgrund dessen bewegt sich nicht nur der Mond um die Erde,
          sondern beide Körper bewegen sich um einen gemeinsamen Mittelpunkt, das Baryzentrum. Das
          Baryzentrum ist der gemeinsame Schwerpunkt des Systems. Da die Masse der Erde ungefähr
          81-mal so groß ist wie die des Mondes, liegt das Baryzentrum noch innerhalb des
          Erdkörpers. Da dies aber nicht in der Mitte der Erde liegt, bewegt sich die Erde genau wie
          der Mond um dieses Zentrum.
        </p>
      </div>

      <Figure
        n="2.3"
        steps={[
          'Schiebe die Mondmasse nach rechts: Das Baryzentrum wandert aus der Erde heraus. Bei etwa dem 1,4-Fachen der Mondmasse liegt es genau auf der Erdoberfläche.',
          'Mit dem Knopf „Mit dieser Mondmasse simulieren“ siehst du das Paar im Simulator.',
        ]}
        caption="Das Baryzentrum von Erde und Mond. Mit dem Regler lässt sich die Mondmasse verändern: Ab etwa 1,4-facher Masse läge der Schwerpunkt außerhalb der Erde – dann spräche man von einem Doppelplaneten."
      >
        <BarycenterDemo />
      </Figure>

      <div class="prose">
        <p>
          Das Zweikörperproblem ist von großer Bedeutung für die Himmelsmechanik, da sich nur mit
          Hilfe von Massen und Anfangsgegebenheiten sehr genau berechnen lässt, wie unter anderem
          die Umlaufbahnen, Geschwindigkeiten und Umlaufzeiten. Wird jedoch ein weiterer Körper
          hinzugezogen, wird dies zu einem Dreikörperproblem.
        </p>
      </div>

      <Figure
        n="2.4"
        steps={[
          'Wähle n = 2 (Newton): Die Bahn schließt sich, der Winkel von Periapsis zu Periapsis beträgt 360°.',
          'Wähle n = 1,5 oder n = 2,5: Die Ellipse dreht sich bei jedem Umlauf weiter, es entsteht eine Rosette. Der Winkel weicht von 360° ab, wie es die Theorie in der letzten Zeile vorhersagt.',
          'Wähle n = 3,2: Es gibt keine stabile Kreisbahn mehr. Bei der voreingestellten Startgeschwindigkeit stürzt der Körper ins Zentrum, bei 1,3 fliegt er davon.',
        ]}
        caption="Warum gerade 1/r²? Nur beim Newtonschen Gesetz schließen sich die Bahnen; ab 1/r³ gibt es keine stabilen Bahnen mehr (Satz von Bertrand)."
      >
        <ForceLawLab />
      </Figure>

      <div class="prose">
        <SectionTitle n="2.3">Relevanz des Erde-Mond-Sonne-Systems</SectionTitle>
        <p>
          Das Erde-Mond-Sonne-System ist ein Dreikörpersystem aus unserem direkten kosmischen
          Umfeld, welches auch Einfluss auf die Erde und deren Population hat. Anders als bei den
          abstrakten Zweikörpersystemen lassen sich in diesem Fall die direkten Auswirkungen
          nachvollziehen. In diesem Abschnitt werden die Sonne als Energiequelle, die Wirkung des
          Mondes auf die Erdachse, die verursachten Gezeiten und die Finsternisse betrachtet.
        </p>
        <p>
          Die Sonne dient als fast alleinige Energiequelle des Systems, somit entscheidet sie
          indirekt und direkt über Klima, Wetter und all das Leben auf der Erde und im Rest des
          Systems. Die Strahlungsenergie, welche die Sonne abgibt, erwärmt die Lufthülle, die
          Landmassen und die Ozeane der Erde. Die Erwärmung am Äquator ist am stärksten und wird in
          Richtung der Pole immer schwächer, dadurch entstehen die unterschiedlichen Klimazonen der
          Erde. Würde diese Energie nicht bestehen, wäre die Erde ein kalter unbelebbarer
          Himmelskörper. Die Sonne ist gleichzeitig auch der Mittelpunkt der Umlaufbahn der Erde.
          Durch die Masse der Sonne entsteht ein so starkes Gravitationsfeld, welches die Erde auf
          eine nahezu stabile Umlaufbahn hält. Diese Bahn liegt in der habitablen Zone, die Zone
          eines Sterns, in welcher Leben möglich ist. In dieser Zone hat es die Temperatur, bei
          welcher Wasser weder gefriert noch verdampft, was die Grundlage für die Entstehung von
          Leben ist.
        </p>
        <p>
          Der Mond hat trotz seiner geringeren Masse, im Vergleich zur Erde, einen signifikanten
          Einfluss auf die Erde. Die Erde hat, ausgehend von der Bahnebene, eine geneigte
          Rotationsachse, welche etwa 23,4 Grad geneigt ist. Diese Neigung erzeugt den Wechsel der
          Jahreszeiten. Dass der Mond diese Neigung stabilisiert, zeigten 1993 der französische
          Astronom Jacques Laskar gemeinsam mit Frédéric Joutel und Philippe Robutel. Mithilfe
          numerischer Berechnungen kamen sie zu dem Schluss, dass die Erde nur mithilfe des Mondes
          diese stabile Neigung hält, mit einer Abweichung von nur etwa 1,3 Grad. Außerdem kamen sie
          zu dem Schluss, dass ohne den Mond eine Neigung von etwa 0 bis 85 Grad möglich wäre, was
          laut den Autoren zu dramatischen Klimaschwankungen führen würde.
        </p>
        <p>
          Spätere Untersuchungen von Jack Lissauer, Jason Barnes und John Chambers zeigten, dass
          sich die Erdachse auch ohne Mond über hunderte Millionen Jahre typischerweise nur in einem
          Bereich von 20 bis 25 Grad Ausdehnung bewegen würde und nicht zwischen 0 und 85 Grad.
        </p>
        <p>
          Eine andere spürbare Folge des Erde-Mond-Sonne-Systems sind die Gezeiten. Durch das
          Zusammenspiel von Zentrifugalkraft und Gravitation entstehen Ebbe und Flut. Der Einfluss
          des leichteren Mondes ist größer als der Einfluss der massereicheren Sonne, da dieser
          wesentlich dichter an der Erde ist. Die Gezeiten haben aber auch Auswirkungen auf die Erde
          und den Mond. Durch die Gezeiten wird der Erde andauernd der Drehimpuls entzogen, was über
          einen langen Zeitraum die Erdrotation verlangsamt, und der Mond sich im Durchschnitt um
          4&nbsp;cm pro Jahr von der Erde entfernt.
        </p>
        <p>
          Das Zusammenspiel von Erde, Mond und Sonne wird besonders bei Sonnen- und
          Mondfinsternissen deutlich. Die Finsternisse können nur auftreten, wenn sich Sonne, Mond
          und Erde auf einer nahezu perfekten Linie befinden. Dies ist nur möglich, wenn der Mond
          Neu- oder Vollmond zeigt, während er sich im Schnittpunkt seiner Bahnebene mit der der
          Erdbahn befindet. Dass der Mond die Sonne, obwohl sie um ein Vielfaches größer ist,
          verdecken kann, liegt an der Perspektive und daran, dass er nur einen kleinen Teil der
          Erde abdunkelt.
        </p>
        <p>
          Da sich die Bewegungen der drei Himmelskörper mit den bekannten Gesetzen der
          Himmelsmechanik genauestens berechnen lassen, kann man die nächsten Finsternisse für die
          kommenden Jahrzehnte genauestens berechnen. Der Antikythera-Mechanismus, bestehend aus
          Zahnrädern, ermöglichte bereits in der Antike ungefähre Vorhersagen, lange bevor die
          heutigen mathematischen Himmelsmechaniken existierten.
        </p>
        <p>
          Es wird deutlich, dass das Erde-Mond-Sonne-System weit mehr als ein Rechenbeispiel in der
          Himmelsmechanik ist, es hat direkte Auswirkungen auf Klima, Jahreszeiten, Gezeiten und
          somit auf das Leben auf der Erde.
        </p>
      </div>
    </>
  );
}

function BarycenterDemo() {
  const [factor, setFactor] = useState(1);
  const r = MOON.semiMajorAxis;
  const m = MOON.mass * factor;
  const d = barycenterOffset(EARTH.mass, m, r);
  const inside = d < EARTH.radius;
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / (G * (EARTH.mass + m)));
  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    c: { ink2: string; ink3: string; accent: string; series: string[]; fontUi: string },
    t: number,
  ) => {
    ctx.clearRect(0, 0, w, h);
    const scale = (Math.min(w, h) * 0.42) / r;
    const cx = w / 2;
    const cy = h / 2;
    const ang = (t / 6) * Math.PI * 2;
    const zoom = Math.min(12, (w * 0.3) / (d * scale));
    const ex = cx - Math.cos(ang) * d * scale * zoom;
    const ey = cy - Math.sin(ang) * d * scale * zoom;
    const mx = cx + Math.cos(ang) * (r - d) * scale;
    const my = cy + Math.sin(ang) * (r - d) * scale;
    ctx.strokeStyle = c.ink3;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, (r - d) * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = c.series[0]!;
    ctx.beginPath();
    ctx.arc(ex, ey, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ink3;
    ctx.beginPath();
    ctx.arc(mx, my, 6 + Math.cbrt(factor) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ink2;
    ctx.font = `12px ${c.fontUi}`;
    ctx.fillText('Baryzentrum', cx + 8, cy - 8);
    ctx.fillText('Mond', mx + 10, my - 8);
    ctx.fillText(`Erde (Bewegung ${sig(zoom, 2)}-fach vergrößert)`, 8, h - 8);
  };
  return (
    <div class="grid-2">
      <CanvasBox
        draw={draw}
        deps={[factor]}
        animate
        aspect="4 / 3"
        label="Erde und Mond kreisen um ihr Baryzentrum"
      />
      <div class="stack">
        <Slider
          id="bary-mass"
          label="Mondmasse"
          value={factor}
          min={0.1}
          max={40}
          log
          format={(v) => `${sig(v, 2)} × M_Mond`}
          onChange={setFactor}
        />
        <dl class="kv">
          <dt>Abstand Baryzentrum – Erdmitte</dt>
          <dd>{fmt(d / KM)}&nbsp;km</dd>
          <dt>Erdradius</dt>
          <dd>{fmt(EARTH.radius / KM)}&nbsp;km</dd>
          <dt>Umlaufzeit (Kepler III)</dt>
          <dd>{fmt(period / DAY, 2)}&nbsp;Tage</dd>
        </dl>
        <StatusChip status={inside ? 'ok' : 'warn'}>
          {inside ? 'Baryzentrum im Erdinneren' : 'Baryzentrum außerhalb der Erde: Doppelplanet'}
        </StatusChip>
        {SHOW_SIMULATOR && (
          <button
            type="button"
            class="btn small"
            onClick={() => openInSimulator({ ...REAL_PARAMS, moonMass: factor }, 'Baryzentrum')}
          >
            Mit dieser Mondmasse simulieren
          </button>
        )}
      </div>
    </div>
  );
}
