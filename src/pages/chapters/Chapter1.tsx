import { useMemo, useState } from 'preact/hooks';
import {
  MATERIALS,
  MOON,
  STRENGTHS,
  gravityInsideShell,
  momentOfInertiaFactor,
  rollingAcceleration,
  shellDensity,
  shellStress,
  STANDARD_GRAVITY,
} from '../../physics';
import { CanvasBox } from '../../ui/CanvasBox';
import { LineChart } from '../../ui/charts/LineChart';
import { Callout, Equation, Figure, SectionTitle, StatusChip, Tex } from '../../ui/content';
import { Slider } from '../../ui/controls';
import { fmt, sig } from '../../ui/format';
import { Icon } from '../../ui/Icon';

const R = MOON.radius;

export function Chapter1() {
  return (
    <>
      <div class="prose">
        <SectionTitle n="1.1">Woher die Idee stammt</SectionTitle>
        <p>
          1970 veröffentlichten die sowjetischen Autoren Michail Wassin und Alexander Schtscherbakow
          in der Zeitschrift <em>Sputnik</em> den Artikel „Ist der Mond eine Schöpfung
          außerirdischer Intelligenz?“. Ihre These: Der Mond sei ein ausgehöhlter Himmelskörper,
          vielleicht sogar ein Raumschiff. Als Belege dienten zwei Beobachtungen:
        </p>
        <ul>
          <li>
            Die mittlere Dichte des Mondes (3,34 g/cm³) ist deutlich kleiner als die der Erde (5,51
            g/cm³).
          </li>
          <li>
            Als die Mission Apollo 12 im November 1969 die ausgediente Aufstiegsstufe ihrer
            Mondfähre gezielt auf den Mond stürzen ließ, registrierten die Seismometer
            Erschütterungen, die fast eine Stunde anhielten – der Mond „läutete wie eine Glocke“.
          </li>
        </ul>
        <p>
          Die Frage ist physikalisch gut prüfbar. Wir müssen nur herausfinden, welche Messgrößen
          etwas über das <strong>Innere</strong> eines Himmelskörpers verraten – und genau das ist
          der lehrreiche Teil.
        </p>

        <SectionTitle n="1.2">Was Bahnen verraten – und was nicht</SectionTitle>
        <p>
          Die Masse des Mondes kennen wir sehr genau aus Bahnbewegungen: aus dem dritten Keplerschen
          Gesetz für das System Erde–Mond, aus der Taumelbewegung der Erde um den gemeinsamen
          Schwerpunkt und aus den Bahnen von Raumsonden. Sie beträgt
        </p>
        <Equation
          tex={String.raw`M_{\text{Mond}} = 7{,}342\cdot10^{22}\,\text{kg},\qquad R_{\text{Mond}} = 1737{,}4\,\text{km}\;\Rightarrow\;\bar\rho = \frac{M}{\tfrac43\pi R^3} = 3{,}34\,\tfrac{\text{g}}{\text{cm}^3}.`}
          n="1.1"
        />
        <p>
          Über das Innere sagt die Bahn aber nichts. Newtons <strong>Schalentheorem</strong> besagt:
          Außerhalb einer kugelsymmetrischen Masse wirkt die Gravitation genau so, als säße die
          gesamte Masse im Mittelpunkt – egal, ob die Kugel voll oder hohl ist. Innerhalb einer
          Hohlkugel heben sich die Anziehungen aller Schalenteile exakt auf (Abb. 1.1).
        </p>
      </div>

      <Figure
        n="1.1"
        caption="Schwerebeschleunigung eines vollen und eines hohlen Mondes (Hohlraum 80 % des Radius) mit gleicher Masse. Außerhalb der Oberfläche (r > R) sind beide Kurven identisch – für die Mondbahn macht das Innere keinen Unterschied."
      >
        <ShellGravityChart />
      </Figure>

      <Callout kind="merke">
        Aus der Bahn eines Mondes lässt sich nur seine Gesamtmasse bestimmen. Um die Hohlmond-These
        zu prüfen, braucht man Messgrößen, die von der <em>Verteilung</em> der Masse abhängen:
        Dichte der Schale, Trägheitsmoment und Ausbreitung von Erdbebenwellen.
      </Callout>

      <div class="prose">
        <SectionTitle n="1.3">Argument 1: Die Schale müsste unmöglich dicht sein</SectionTitle>
        <p>
          Ist der Mond hohl, muss eine Kugelschale der Dicke <Tex>{'d'}</Tex> die gesamte gemessene
          Masse tragen. Ihre Dichte wäre
        </p>
        <Equation
          tex={String.raw`\rho_{\text{Schale}} = \frac{M_\text{Mond}}{\tfrac43\pi\left(R^3-(R-d)^3\right)}.`}
          n="1.2"
        />
        <p>
          Für dünne Schalen ergeben sich Werte, die kein bekanntes Material erreicht – selbst
          Osmium, das dichteste Element, hat nur 22,6 g/cm³. Erst wenn die „Schale“ so dick ist,
          dass kaum noch Hohlraum übrig bleibt, landet man bei normalem Gestein.
        </p>
      </div>

      <Figure
        n="1.2"
        caption="Hohlmond-Rechner: Welche Dichte, welches Trägheitsmoment und welche Druckspannung hätte eine Mondschale der gewählten Dicke? Die Masse ist durch Messungen festgelegt."
      >
        <ShellCalculator />
      </Figure>

      <div class="prose">
        <SectionTitle n="1.4">Argument 2: Das Trägheitsmoment</SectionTitle>
        <p>
          Das Trägheitsmoment beschreibt, wie schwer sich ein Körper in Drehung versetzen lässt. Es
          hängt davon ab, wie weit die Masse von der Drehachse entfernt ist. Man schreibt es als
        </p>
        <Equation
          tex={String.raw`I = k\cdot M R^2,\qquad k_{\text{Vollkugel}} = \tfrac25 = 0{,}4,\qquad k_{\text{dünne Hohlkugel}} = \tfrac23 \approx 0{,}667.`}
          n="1.3"
        />
        <p>
          Jede Hohlkugel hat <Tex>{'k > 0{,}4'}</Tex>, weil ihre Masse nach außen verlagert ist. Ein
          Körper mit dichtem Kern hat dagegen <Tex>{'k < 0{,}4'}</Tex>. Für den Mond lässt sich
          <Tex>{'k'}</Tex> messen: Die Erde übt ein Drehmoment auf den leicht abgeplatteten Mond
          aus, und wie stark er darauf mit Schwankungen seiner Drehung (physische Libration)
          reagiert, hängt vom Trägheitsmoment ab. Die Laser-Reflektoren, die Apollo 11, 14 und 15
          sowie die sowjetischen Lunochod-Rover auf dem Mond hinterlassen haben, erlauben es, diese
          Bewegung auf Zentimeter genau zu verfolgen. Zusammen mit den Schwerefeld-Messungen der
          Sonden Lunar Prospector und GRAIL ergibt sich
        </p>
        <Equation tex={String.raw`k_\text{Mond} = 0{,}3929 \pm 0{,}0009 \;<\; 0{,}4.`} n="1.4" />
        <p>
          Der Mond ist also nicht nur voll, sondern hat sogar einen etwas dichteren Kern – das
          genaue Gegenteil eines Hohlkörpers. Wie groß der Unterschied im Verhalten ist, zeigt ein
          einfacher Versuch: Eine Hohlkugel rollt eine schiefe Ebene langsamer hinab als eine
          Vollkugel gleicher Masse, weil mehr Energie in ihre Drehung fließt:
          <Tex>{String.raw`\;a = \dfrac{g\sin\alpha}{1+k}`}</Tex>.
        </p>
      </div>

      <Figure
        n="1.3"
        caption="Rollversuch auf einer 2 m langen Rampe mit 10° Neigung. Die Kugel mit dem Trägheitsmoment des Mondes verhält sich wie eine Vollkugel – nicht wie eine Hohlkugel."
      >
        <RollingRace />
      </Figure>

      <div class="prose">
        <SectionTitle n="1.5">Argument 3: Mondbeben</SectionTitle>
        <p>
          Zwischen 1969 und 1977 zeichneten die Apollo-Seismometer rund 12 000 Mondbeben und
          Einschläge auf. Dass die Signale so lange nachklingen, hat eine gut verstandene Ursache:
          Die obersten Kilometer der Mondkruste sind durch Milliarden Jahre Einschläge zerrüttet und
          vollkommen trocken. Die Wellen werden an unzähligen Rissen gestreut, aber kaum gedämpft –
          auf der Erde schluckt das Wasser in den Gesteinsporen diese Energie. Ein Hohlraum wäre
          dagegen im Laufzeitverhalten der Wellen deutlich zu erkennen.
        </p>
        <p>
          Eine Neuauswertung der Apollo-Daten (Weber et al., 2011) fand stattdessen einen festen
          inneren Eisenkern mit etwa 240 km Radius und einen flüssigen äußeren Kern. Der kleine Kern
          erklärt auch die geringere mittlere Dichte: Nach der heute anerkannten Kollisionstheorie
          entstand der Mond vor 4,5 Milliarden Jahren vor allem aus Mantelgestein der jungen Erde
          und des Protoplaneten Theia – eisenarmem Material.
        </p>

        <SectionTitle n="1.6">Argument 4: Die Schale würde zerbrechen</SectionTitle>
        <p>
          Eine dünne Kugelschale muss ihr eigenes Gewicht tragen. In der Näherung einer dünnen
          Schale (Membranspannung) ergibt sich die Druckspannung
        </p>
        <Equation
          tex={String.raw`\sigma \approx \frac{w\,R}{2d},\qquad w = \frac{M}{4\pi R^2}\cdot\frac{g}{2}.`}
          n="1.5"
        />
        <p>
          Für eine 50 km dicke Schale sind das rund 27 GPa – über hundertmal mehr, als Granit (≈ 0,2
          GPa) aushält. Die Schale würde unter ihrem eigenen Gewicht zusammenbrechen. Der Rechner in
          Abb. 1.2 zeigt den Wert für jede Schalendicke.
        </p>

        <SectionTitle n="1.7">Fazit</SectionTitle>
        <p>
          Vier voneinander unabhängige Argumente – Dichte, Trägheitsmoment, Seismik und Festigkeit –
          führen zum selben Ergebnis: Der Mond ist ein fester, in Kruste, Mantel und kleinen Kern
          gegliederter Gesteinskörper. Die Hohlmond-Theorie ist widerlegt. Für die weitere Arbeit
          bedeutet das auch: Wir dürfen den Mond in der Bahnrechnung als <strong>Punktmasse</strong>
          behandeln, denn nach dem Schalentheorem spielt sein Aufbau für die Bahn keine Rolle.
        </p>
      </div>

      <Callout kind="seminar">
        Die Argumentationskette „Hypothese → überprüfbare Vorhersage → Messung“ eignet sich gut als
        Einstieg. Besonders anschaulich und selbst nachrechenbar ist Formel (1.2): Man kann eine
        Tabelle „Schalendicke → nötige Dichte“ anlegen und mit Materialien vergleichen.
      </Callout>
    </>
  );
}

function ShellGravityChart() {
  const data = useMemo(() => {
    const n = 301;
    const x = new Float64Array(n);
    const solid = new Float64Array(n);
    const hollow = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const r = (i / (n - 1)) * 3;
      x[i] = r;
      solid[i] = gravityInsideShell(r * R, MOON.mass, R, 0);
      hollow[i] = gravityInsideShell(r * R, MOON.mass, R, 0.8 * R);
    }
    return { x, solid, hollow };
  }, []);
  return (
    <LineChart
      series={[
        { id: 'solid', label: 'Vollkugel', x: data.x, y: data.solid },
        { id: 'hollow', label: 'Hohlkugel (Hohlraum 80 % des Radius)', x: data.x, y: data.hollow },
      ]}
      xLabel="Abstand vom Mittelpunkt r / R"
      yLabel="Schwerebeschleunigung g (m/s²)"
      xFormat={(v) => sig(v, 2)}
      yFormat={(v) => sig(v, 2)}
      refLines={[{ y: MOON.surfaceGravity, label: 'Oberfläche: 1,62 m/s²' }]}
      yMin={0}
      height={240}
    />
  );
}

function ShellCalculator() {
  const [thickness, setThickness] = useState(50);
  const d = thickness * 1000;
  const rho = shellDensity(MOON.mass, R, d);
  const k = momentOfInertiaFactor((R - d) / R);
  const stress = shellStress(MOON.mass, R, d);
  const osmium = MATERIALS[MATERIALS.length - 1]!.density;
  const granite = STRENGTHS[0]!.strength;

  const curve = useMemo(() => {
    const n = 200;
    const x = new Float64Array(n);
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = 1 + ((R / 1000 - 1) * i) / (n - 1);
      x[i] = t;
      y[i] = momentOfInertiaFactor((R - t * 1000) / R);
    }
    return { x, y };
  }, []);

  return (
    <div class="stack" style={{ gap: '18px' }}>
      <Slider
        id="shell-thickness"
        label="Dicke der Mondschale"
        value={thickness}
        min={1}
        max={R / 1000}
        log
        format={(v) => `${fmt(v)} km`}
        hint="Ganz rechts: Vollkugel (1737 km)"
        onChange={setThickness}
      />
      <div class="grid-3">
        <ResultCard
          title="Nötige Dichte"
          value={`${sig(rho / 1000, 3)} g/cm³`}
          status={rho > osmium ? 'fail' : rho > 5000 ? 'warn' : 'ok'}
          verdict={
            rho > osmium
              ? `${sig(rho / osmium, 2)}-mal dichter als Osmium`
              : rho > 5000
                ? 'dichter als jedes Gestein'
                : 'gesteinsartig'
          }
        />
        <ResultCard
          title="Trägheitsmoment k"
          value={fmt(k, 3)}
          status={k > 0.4 + 0.001 ? 'fail' : 'ok'}
          verdict={`gemessen: ${fmt(MOON.momentOfInertia, 4)} ± ${fmt(MOON.momentOfInertiaError, 4)}`}
        />
        <ResultCard
          title="Druck in der Schale"
          value={`${sig(stress / 1e9, 3)} GPa`}
          status={stress > 10 * granite ? 'fail' : stress > granite ? 'warn' : 'ok'}
          verdict={`${sig(stress / granite, 2)} × Druckfestigkeit von Granit`}
        />
      </div>
      <DensityScale needed={rho} />
      <LineChart
        title="Trägheitsmoment in Abhängigkeit von der Schalendicke"
        series={[{ id: 'k', label: 'Hohlkugel', x: curve.x, y: curve.y }]}
        xLabel="Schalendicke (km)"
        yLabel="k = I / (M R²)"
        xFormat={(v) => fmt(v)}
        yFormat={(v) => fmt(v, 2)}
        refLines={[
          { y: 0.4, label: 'Vollkugel 0,400' },
          { y: MOON.momentOfInertia, label: 'Mond gemessen 0,393' },
        ]}
        yMin={0.38}
        yMax={0.68}
        height={200}
      />
    </div>
  );
}

function ResultCard({
  title,
  value,
  status,
  verdict,
}: {
  title: string;
  value: string;
  status: 'ok' | 'warn' | 'fail';
  verdict: string;
}) {
  return (
    <div class="panel panel-pad" style={{ gap: '6px' }}>
      <div class="small muted">{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 500 }}>{value}</div>
      <StatusChip status={status}>{verdict}</StatusChip>
    </div>
  );
}

/** Logarithmische Dichteskala mit Materialien und dem benötigten Wert. */
function DensityScale({ needed }: { needed: number }) {
  const min = 0.5;
  const max = 2000;
  const pos = (rho: number): number =>
    ((Math.log10(rho / 1000) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * 100;
  const items = [...MATERIALS];
  return (
    <div>
      <div class="small muted" style={{ marginBottom: '8px' }}>
        Dichte im Vergleich (logarithmische Skala, g/cm³)
      </div>
      <div style={{ position: 'relative', height: '96px' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '48px',
            height: '2px',
            background: 'var(--axis)',
          }}
        />
        {[1, 10, 100, 1000].map((t) => (
          <div
            key={t}
            class="num small"
            style={{
              position: 'absolute',
              left: `${pos(t * 1000)}%`,
              top: '56px',
              transform: 'translateX(-50%)',
              color: 'var(--ink-3)',
            }}
          >
            {t}
          </div>
        ))}
        {items.map((m, i) => (
          <div
            key={m.name}
            title={`${m.name}: ${sig(m.density / 1000, 3)} g/cm³`}
            style={{
              position: 'absolute',
              left: `${pos(m.density)}%`,
              top: i % 2 === 0 ? '6px' : '24px',
              transform: 'translateX(-50%)',
              display: 'grid',
              justifyItems: 'center',
            }}
          >
            <span
              class="small"
              style={{ whiteSpace: 'nowrap', color: 'var(--ink-2)', fontSize: '0.72rem' }}
            >
              {m.name.split(' ')[0]}
            </span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--ink-3)',
                marginTop: i % 2 === 0 ? '22px' : '4px',
              }}
            />
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(pos(needed), 100)}%`,
            top: '40px',
            transform: 'translateX(-50%)',
            display: 'grid',
            justifyItems: 'center',
          }}
        >
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'var(--series-2)',
              border: '2px solid var(--surface)',
            }}
          />
          <span class="small" style={{ fontWeight: 600, whiteSpace: 'nowrap', marginTop: '20px' }}>
            benötigt: {sig(needed / 1000, 3)}
          </span>
        </div>
      </div>
    </div>
  );
}

const RAMP_LENGTH = 2;
const RAMP_ANGLE = (10 * Math.PI) / 180;
/** Kugeln im Rennen; `slot` = Kategorienfarbe. */
const BALLS = [
  { name: 'Vollkugel', k: 0.4, slot: 0 },
  { name: 'Mond (k = 0,393)', k: MOON.momentOfInertia, slot: 2 },
  { name: 'Hohlkugel', k: 2 / 3, slot: 1 },
];

function RollingRace() {
  const [start, setStart] = useState<number | null>(null);
  const times = BALLS.map((b) =>
    Math.sqrt((2 * RAMP_LENGTH) / rollingAcceleration(STANDARD_GRAVITY, RAMP_ANGLE, b.k)),
  );
  const [done, setDone] = useState(false);

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    c: { ink3: string; axis: string; ink2: string; series: string[]; fontUi: string },
  ) => {
    ctx.clearRect(0, 0, w, h);
    const elapsed = start === null ? 0 : (performance.now() - start) / 1000;
    const lane = h / BALLS.length;
    const x0 = 20;
    const x1 = w - 30;
    BALLS.forEach((b, i) => {
      const yTop = lane * i + 30;
      const yBottom = lane * (i + 1) - 8;
      // Rampe
      ctx.strokeStyle = c.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, yTop);
      ctx.lineTo(x1, yBottom);
      ctx.stroke();
      // Ziellinie
      ctx.strokeStyle = c.ink3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, yBottom - 26);
      ctx.lineTo(x1, yBottom + 4);
      ctx.stroke();
      const a = rollingAcceleration(STANDARD_GRAVITY, RAMP_ANGLE, b.k);
      const t = Math.min(elapsed, times[i]!);
      const s = Math.min(0.5 * a * t * t, RAMP_LENGTH) / RAMP_LENGTH;
      const r = 9;
      const px = x0 + (x1 - x0) * s;
      const py = yTop + (yBottom - yTop) * s;
      const nx = (yBottom - yTop) / Math.hypot(x1 - x0, yBottom - yTop);
      const ny = -(x1 - x0) / Math.hypot(x1 - x0, yBottom - yTop);
      const cx = px + nx * r;
      const cy = py + ny * r;
      ctx.fillStyle = c.series[b.slot]!;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Markierung zeigt die Drehung.
      const rot = (s * RAMP_LENGTH) / 0.05;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
      ctx.stroke();
      ctx.fillStyle = c.ink2;
      ctx.font = `12px ${c.fontUi}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.name, x0 + 28, yTop - 6);
      if (elapsed >= times[i]!) {
        ctx.textAlign = 'right';
        ctx.fillText(`${times[i]!.toFixed(3).replace('.', ',')} s`, x1 - 6, yBottom - 22);
      }
    });
    if (start !== null && elapsed > Math.max(...times) && !done) setDone(true);
  };

  return (
    <div class="stack">
      <div class="btn-row">
        <button
          type="button"
          class="btn primary"
          onClick={() => {
            setDone(false);
            setStart(performance.now());
          }}
        >
          <Icon name="play" filled />
          {start === null ? 'Rennen starten' : 'Noch einmal'}
        </button>
        {done && (
          <span class="small muted">
            Die Hohlkugel braucht {sig(((times[2]! - times[0]!) / times[0]!) * 100, 2)} % länger als
            die Vollkugel.
          </span>
        )}
      </div>
      <CanvasBox
        draw={draw}
        deps={[start]}
        animate={start !== null && !done}
        height={240}
        label="Drei Kugeln rollen eine schiefe Ebene hinab"
      />
    </div>
  );
}
