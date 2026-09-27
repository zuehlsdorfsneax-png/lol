import { useState } from 'preact/hooks';
import { EARTH, KM, MOON, G, DAY, barycenterOffset } from '../../physics';
import { openInSimulator } from '../../app/store';
import { REAL_PARAMS } from '../../physics';
import { CanvasBox } from '../../ui/CanvasBox';
import { Callout, Equation, Figure, SectionTitle, StatusChip, Tex } from '../../ui/content';
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
          veröffentlichte, revolutionierte es unter anderem auch die Himmelsmechanik. Astronomen
          waren nicht mehr an beschreibende Modelle wie die Keplerschen Gesetze gebunden,
          stattdessen hatten sie von da an ein kausales physikalisches Fundament.
        </p>
        <p>
          Mit der Veröffentlichung seiner Arbeit brachte Newton auch drei für die Himmelsmechanik
          relevante Axiome.
        </p>
        <p>
          Das <strong>erste Axiom</strong> besagt, dass ein Körper seinen Bewegungszustand
          beibehält, solange keine äußere Kraft auf ihn einwirkt. Im Sinne der Himmelsmechanik
          bedeutet dies, dass Objekte wie Planeten und Monde ihre Bewegung verlustlos beibehalten,
          solange kein anderes Objekt eine Kraft auf sie ausübt.
        </p>
        <p>
          Laut dem <strong>zweiten Axiom</strong> ist die Beschleunigung proportional zur
          einwirkenden Kraft und zeigt in deren Richtung. Für die Flugbahnen von Himmelskörpern
          bedeutet das vor allem eine Richtungsänderung – die Ablenkung auf eine Umlaufbahn.
        </p>
        <Equation tex={String.raw`\vec F = m\cdot\vec a`} n="2.1" />
        <p>
          Das <strong>dritte Axiom</strong> beschreibt das Reaktionsprinzip: Übt ein Körper A eine
          Kraft auf einen Körper B aus, so wirkt eine gleich große, entgegengesetzte Kraft von B auf
          A. Für die Bahnstabilität heißt das: Ein Himmelskörper, der ein zentrales Objekt umkreist,
          zieht dieses ebenfalls an – beide bewegen sich um einen gemeinsamen Schwerpunkt.
        </p>
        <p>
          Durch diese Erkenntnisse konnte Newton mathematisch beweisen, dass und wie zwei isolierte
          Massen sich auf stabilen, periodischen Kreis- und Ellipsenbahnen bewegen. Grundlage dafür
          ist das <strong>Newtonsche Gravitationsgesetz</strong>:
        </p>
        <Equation
          tex={String.raw`F_G = G\cdot\frac{m_1\, m_2}{r^2},\qquad G = 6{,}674\cdot10^{-11}\ \tfrac{\text{m}^3}{\text{kg}\,\text{s}^2}`}
          n="2.2"
        />
        <p>
          Dabei stehen <Tex>{'m_1'}</Tex> und <Tex>{'m_2'}</Tex> für die Massen der beiden Körper in
          Kilogramm, <Tex>r</Tex> ist der Abstand der beiden Massenmittelpunkte und <Tex>G</Tex> die
          Gravitationskonstante, die in vielen Formeln der Himmelsmechanik vorkommt. Nach dem
          dritten Axiom ist die Gravitationskraft für beide Körper gleich groß.
        </p>
      </div>

      <Figure
        n="2.1"
        caption="Newtons Mondrechnung: Nur mit dem Exponenten n = 2 passt die aus der Fallbeschleunigung g vorhergesagte Beschleunigung zur gemessenen Bahnbeschleunigung des Mondes."
      >
        <MoonTest />
      </Figure>

      <div class="prose">
        <SectionTitle n="2.2">Das Zweikörperproblem</SectionTitle>
        <p>
          In der Himmelsmechanik gibt es das Zweikörpermodell, das die Bahnbewegung zweier Körper
          untersucht, die nur von ihrer gegenseitigen Gravitation beeinflusst werden. Beide Körper
          werden als punktförmige Massen betrachtet, äußere Kräfte durch weitere Körper werden nicht
          berücksichtigt. Es ist auch als <strong>Kepler-Problem</strong> bekannt, da Johannes
          Kepler diese Bahnbewegungen als Erster beobachtete, beschrieb und die Keplerschen Gesetze
          formulierte. 1687 lieferte Isaac Newton mit den Gravitations- und Bewegungsgesetzen die
          physikalische Erklärung. Damit erklärte er nicht nur, wie sich Planeten bewegen, sondern
          auch, warum sie es auf diese Weise tun.
        </p>
        <p>
          Newton vereinfachte das Zweikörperproblem, indem er die Bewegung des gemeinsamen
          Schwerpunkts und die Bewegung der Körper relativ zueinander getrennt betrachtete. Die
          Relativbewegung lässt sich so beschreiben, als würde sich nur einer der beiden Körper
          unter dem Einfluss des anderen bewegen. Dadurch lässt sich das Zweikörperproblem
          vollständig mathematisch lösen.
        </p>
        <p>
          Die Lösung zeigt, dass es verschiedene Bahnformen gibt: Kreise, Ellipsen, Parabeln und
          Hyperbeln. Welche Form entsteht, hängt von der Gesamtenergie des Systems ab. Bei negativer
          Gesamtenergie entsteht eine geschlossene Kreis- oder Ellipsenbahn – das stimmt mit dem
          ersten Keplerschen Gesetz überein.
        </p>
        <Equation
          tex={String.raw`E = \frac{v^2}{2} - \frac{GM}{r}\;\begin{cases}<0 & \text{Ellipse oder Kreis (gebunden)}\\=0 & \text{Parabel}\\>0 & \text{Hyperbel (ungebunden)}\end{cases}`}
          n="2.3"
        />
      </div>

      <Figure
        n="2.2"
        caption="Kepler-Labor: Zwölf Abschnitte gleicher Dauer haben gleiche Fläche (2. Keplersches Gesetz). Die Tabellen bestätigen T²/a³ = konstant und liefern die Masse von Sonne und Jupiter."
      >
        <KeplerLab />
      </Figure>

      <div class="prose">
        <p>
          Das Erde-Mond-System ist ein konkretes Beispiel für ein Zweikörpersystem mit negativer
          Gesamtenergie. Nach dem dritten Newtonschen Axiom ziehen sich beide Körper mit gleich
          großer Kraft an. Deshalb bewegt sich nicht nur der Mond um die Erde, sondern beide Körper
          bewegen sich um einen gemeinsamen Mittelpunkt, das <strong>Baryzentrum</strong>. Da die
          Erde etwa 81-mal so schwer ist wie der Mond, liegt das Baryzentrum noch innerhalb der Erde
          – aber nicht in ihrer Mitte. Deshalb bewegt sich auch die Erde um diesen Punkt.
        </p>
        <p>
          Das Zweikörperproblem ist für die Himmelsmechanik von großer Bedeutung, da sich allein aus
          Massen und Anfangsbedingungen Umlaufbahnen, Geschwindigkeiten und Umlaufzeiten genau
          berechnen lassen. Kommt jedoch ein weiterer Körper hinzu, wird daraus ein
          Dreikörperproblem.
        </p>
      </div>

      <Figure
        n="2.3"
        caption="Warum gerade 1/r²? Nur beim Newtonschen Gesetz schließen sich die Bahnen; ab 1/r³ gibt es keine stabilen Bahnen mehr (Satz von Bertrand)."
      >
        <ForceLawLab />
      </Figure>

      <div class="prose">
        <SectionTitle n="2.3">Relevanz des Erde-Mond-Sonne-Systems</SectionTitle>
        <p>
          Das Erde-Mond-Sonne-System ist ein Dreikörpersystem aus unserem direkten kosmischen
          Umfeld, das auch Einfluss auf die Erde und ihre Bewohner hat. Anders als bei abstrakten
          Zweikörpersystemen lassen sich hier die Auswirkungen direkt nachvollziehen. Im Folgenden
          werden die Sonne als Energiequelle, die Wirkung des Mondes auf die Erdachse, die Gezeiten
          und die Finsternisse betrachtet.
        </p>
        <p>
          Die Sonne dient als fast alleinige Energiequelle des Systems und entscheidet damit direkt
          und indirekt über Klima, Wetter und das Leben auf der Erde. Ihre Strahlung erwärmt
          Lufthülle, Landmassen und Ozeane. Am Äquator ist die Erwärmung am stärksten und nimmt zu
          den Polen hin ab – so entstehen die Klimazonen. Ohne diese Energie wäre die Erde ein
          kalter, unbewohnbarer Himmelskörper. Gleichzeitig ist die Sonne der Mittelpunkt der
          Erdbahn: Ihr starkes Gravitationsfeld hält die Erde auf einer nahezu stabilen Umlaufbahn.
          Diese liegt in der habitablen Zone, in der Wasser weder gefriert noch verdampft – die
          Grundlage für Leben.
        </p>
        <p>
          Der Mond hat trotz seiner im Vergleich zur Erde geringen Masse einen deutlichen Einfluss.
          Die Rotationsachse der Erde ist gegenüber ihrer Bahnebene um etwa 23,4° geneigt; diese
          Neigung erzeugt die Jahreszeiten. Der französische Astronom Jacques Laskar zeigte 1993
          gemeinsam mit Frédéric Joutel und Philippe Robutel mit numerischen Berechnungen, dass der
          Mond diese Neigung stabilisiert, sodass sie nur um etwa 1,3° schwankt. Ohne Mond wären
          nach ihren Rechnungen Neigungen zwischen 0° und 85° möglich, was zu dramatischen
          Klimaschwankungen führen würde. Spätere Untersuchungen von Jason Barnes und seinem Team
          zeigten allerdings, dass sich die Erdachse auch ohne Mond über eine halbe Milliarde Jahre
          nur zwischen etwa 10° und 20° bewegen würde – vor allem wegen der Gravitation Jupiters.
        </p>
        <p>
          Eine weitere spürbare Folge sind die <strong>Gezeiten</strong>. Durch das Zusammenspiel
          von Zentrifugalkraft und Gravitation entstehen Ebbe und Flut. Der Einfluss des leichteren
          Mondes ist dabei größer als der der massereicheren Sonne, da er der Erde viel näher ist.
          Die Gezeiten wirken auch auf Erde und Mond zurück: Der Erde wird ständig Drehimpuls
          entzogen, ihre Rotation verlangsamt sich, und der Mond entfernt sich um etwa 4 cm pro Jahr
          (Kapitel 6).
        </p>
        <p>
          Besonders deutlich wird das Zusammenspiel bei{' '}
          <strong>Sonnen- und Mondfinsternissen</strong>. Sie können nur auftreten, wenn Sonne, Mond
          und Erde auf einer nahezu perfekten Linie stehen. Das ist nur bei Neu- oder Vollmond
          möglich, wenn sich der Mond zugleich nahe einem Schnittpunkt seiner Bahnebene mit der
          Erdbahn befindet. Dass der viel kleinere Mond die Sonne verdecken kann, liegt an der
          Perspektive: Die Sonne ist etwa 400-mal größer, aber auch etwa 400-mal weiter entfernt.
          Weil sich die Bewegungen der drei Körper mit den Gesetzen der Himmelsmechanik genau
          berechnen lassen, kann man Finsternisse für Jahrzehnte im Voraus vorhersagen. Schon der
          antike Antikythera-Mechanismus ermöglichte mit Zahnrädern ungefähre Vorhersagen.
        </p>
        <p>
          Das Erde-Mond-Sonne-System ist also weit mehr als ein Rechenbeispiel: Es wirkt direkt auf
          Klima, Jahreszeiten und Gezeiten und damit auf das Leben auf der Erde.
        </p>

        <SectionTitle n="2.4">Erweiterung auf N Körper und das Baryzentrum</SectionTitle>
        <p>
          Für jeden von <Tex>N</Tex> Körpern gilt nach (2.1) und (2.2) die Bewegungsgleichung
        </p>
        <Equation
          tex={String.raw`\ddot{\vec r}_i = \sum_{j\neq i} G\,m_j\,\frac{\vec r_j-\vec r_i}{\lvert\vec r_j-\vec r_i\rvert^3}.`}
          n="2.4"
        />
        <p>
          Für drei oder mehr Körper gibt es keine allgemeine Lösungsformel mehr (Poincaré, 1890) –
          die Gleichung muss numerisch gelöst werden. Genau das macht unsere Simulation (Kapitel 8).
          Das Baryzentrum zweier Körper liegt auf ihrer Verbindungslinie im Abstand
        </p>
        <Equation tex={String.raw`d_B = r\cdot\frac{m_2}{m_1+m_2}`} n="2.5" />
        <p>vom Mittelpunkt des schwereren Körpers. Für Erde und Mond sind das etwa 4 670 km.</p>
      </div>

      <Figure
        n="2.4"
        caption="Das Baryzentrum von Erde und Mond. Mit dem Regler lässt sich die Mondmasse verändern: Ab etwa 1,4-facher Masse läge der Schwerpunkt außerhalb der Erde – dann spräche man von einem Doppelplaneten."
      >
        <BarycenterDemo />
      </Figure>

      <Callout kind="merke">
        Zwei Körper bewegen sich immer um ihren gemeinsamen Schwerpunkt. Ihre Bahnen sind exakt
        berechenbar. Ab drei Körpern gibt es keine allgemeine Formel mehr – dann braucht man
        Näherungen oder eine Simulation.
      </Callout>
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
    const scale = (w * 0.42) / r;
    const cx = w / 2;
    const cy = h / 2;
    const ang = (t / 6) * Math.PI * 2;
    const ex = cx - Math.cos(ang) * d * scale * 12;
    const ey = cy - Math.sin(ang) * d * scale * 12;
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
    ctx.fillText('Erde (Bewegung 12-fach vergrößert)', 8, h - 8);
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
          <dd>{fmt(d / KM)} km</dd>
          <dt>Erdradius</dt>
          <dd>{fmt(EARTH.radius / KM)} km</dd>
          <dt>Umlaufzeit (Kepler III)</dt>
          <dd>{fmt(period / DAY, 2)} Tage</dd>
        </dl>
        <StatusChip status={inside ? 'ok' : 'warn'}>
          {inside ? 'Baryzentrum im Erdinneren' : 'Baryzentrum außerhalb der Erde: Doppelplanet'}
        </StatusChip>
        <button
          type="button"
          class="btn small"
          onClick={() => openInSimulator({ ...REAL_PARAMS, moonMass: factor }, 'Baryzentrum')}
        >
          Mit dieser Mondmasse simulieren
        </button>
      </div>
    </div>
  );
}
