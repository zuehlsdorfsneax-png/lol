import { useMemo, useState } from 'preact/hooks';
import {
  AU,
  EARTH,
  G,
  MOON,
  REAL_PARAMS,
  SUN,
  YEAR,
  DAY,
  linearRegression,
  unwrap,
  pullRatio,
  tidalRatio,
} from '../../physics';
import { Simulation } from '../../sim/Simulation';
import { CanvasBox } from '../../ui/CanvasBox';
import { LineChart } from '../../ui/charts/LineChart';
import { Callout, Equation, Figure, LinkButton, SectionTitle, Tex } from '../../ui/content';
import { Slider } from '../../ui/controls';
import { fmt, sci, sig } from '../../ui/format';

export function Chapter3() {
  const pull = pullRatio(SUN.mass, AU, EARTH.mass, MOON.semiMajorAxis);
  const tide = tidalRatio(SUN.mass, AU, EARTH.mass, MOON.semiMajorAxis);
  return (
    <>
      <div class="prose">
        <SectionTitle n="3.1">Die Sonne als Störkörper</SectionTitle>
        <p>Vergleicht man die Kräfte, mit denen Sonne und Erde am Mond ziehen, ergibt sich</p>
        <Equation
          tex={String.raw`\frac{F_\odot}{F_\oplus} = \frac{M_\odot}{M_\oplus}\cdot\left(\frac{r_{\oplus\text{Mond}}}{r_{\odot\text{Mond}}}\right)^2 \approx 333\,000\cdot\left(\frac{384\,400\ \text{km}}{149{,}6\ \text{Mio. km}}\right)^2 \approx ${fmt(pull, 1)}.`}
          n="3.1"
        />
        <p>
          Die Sonne zieht den Mond also mehr als <strong>doppelt so stark</strong> an wie die Erde.
          Warum bleibt er trotzdem bei uns? Weil die Sonne die Erde fast genauso stark anzieht. Erde
          und Mond „fallen“ gemeinsam um die Sonne. Für die Bewegung des Mondes <em>relativ</em> zur
          Erde zählt nur der <strong>Unterschied</strong> der Sonnenanziehung an beiden Orten – die
          Gezeitenbeschleunigung:
        </p>
        <Equation
          tex={String.raw`\vec a_\text{Gez} = \vec a_\odot(\text{Mond}) - \vec a_\odot(\text{Erde}) \approx \frac{G M_\odot\, r}{d^3}\,\bigl(2\cos\varphi\;\hat e_\parallel - \sin\varphi\;\hat e_\perp\bigr).`}
          n="3.2"
        />
        <p>
          Hier ist <Tex>r</Tex> der Abstand Erde–Mond, <Tex>d</Tex> der Abstand zur Sonne und{' '}
          <Tex>\varphi</Tex> der Winkel zwischen Mond und Sonnenrichtung. Die Gezeitenbeschleunigung
          zieht den Mond entlang der Linie Sonne–Erde von der Erde weg und drückt ihn senkrecht dazu
          zur Erde hin. Im Verhältnis zur Anziehung der Erde ist sie klein:
        </p>
        <Equation
          tex={String.raw`\frac{a_\text{Gez,max}}{a_\oplus} = 2\,\frac{M_\odot}{M_\oplus}\left(\frac{r}{d}\right)^3 \approx ${fmt(tide * 100, 1)}\ \%.`}
          n="3.3"
        />
        <p>
          Eine Störung von etwa einem Prozent – klein genug, dass die Erde den Mond festhält, aber
          groß genug, um seine Bahn messbar zu verformen.
        </p>
      </div>

      <Figure
        n="3.1"
        caption="Das Gezeitenfeld der Sonne um die Erde (Sonne links). Die kleinen Pfeile zeigen die Gezeitenbeschleunigung auf der Mondbahn. Am Mond sind die Anziehung der Sonne auf Mond und Erde eingezeichnet; ihr Unterschied ist die Gezeitenkraft (100-fach vergrößert)."
      >
        <TidalField />
      </Figure>

      <div class="prose">
        <SectionTitle n="3.2">Veränderung der Mondbahn durch gravitative Störungen</SectionTitle>
        <p>
          Die Gezeitenwirkung der Sonne verändert die Mondbahn periodisch und langfristig. Die
          wichtigsten Effekte kannte man zum Teil schon in der Antike:
        </p>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Effekt</th>
                <th>Periode</th>
                <th>Wirkung</th>
                <th>Entdeckt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Evektion</td>
                <td class="num">31,8 Tage</td>
                <td>Exzentrizität schwankt, Mondort bis ±1,27°</td>
                <td>Ptolemäus (2. Jh.)</td>
              </tr>
              <tr>
                <td>Variation</td>
                <td class="num">14,8 Tage</td>
                <td>Mond eilt zwischen Neu- und Vollmond voraus/nach, ±0,66°</td>
                <td>Tycho Brahe (1590)</td>
              </tr>
              <tr>
                <td>Jährliche Gleichung</td>
                <td class="num">1 Jahr</td>
                <td>Umlauf langsamer, wenn die Erde sonnennah ist, ±0,19°</td>
                <td>Tycho Brahe, Kepler</td>
              </tr>
              <tr>
                <td>Apsidendrehung</td>
                <td class="num">8,85 Jahre</td>
                <td>Die Ellipse dreht sich rechtläufig</td>
                <td>Antike (Hipparch)</td>
              </tr>
              <tr>
                <td>Knotendrehung</td>
                <td class="num">18,6 Jahre</td>
                <td>
                  Die geneigte Bahnebene dreht sich rückläufig (bestimmt die Finsterniszyklen)
                </td>
                <td>Antike (Babylonier)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Die Apsidendrehung hat Geschichte geschrieben: Newton konnte sie mit seiner Theorie nur
          etwa zur Hälfte erklären. Alexis Clairaut erhielt 1747 ebenfalls nur 18 statt 9 Jahre und
          schlug schon vor, das Gravitationsgesetz zu ändern – bis er 1749 bemerkte, dass die
          vernachlässigten Terme zweiter Ordnung den Rest liefern. Das Drei-Körper-Problem ist also
          selbst bei kleinen Störungen tückisch.
        </p>

        <SectionTitle n="3.3">Langfristige Auswirkungen auf die Stabilität</SectionTitle>
        <p>
          Eine numerische Simulation braucht keine Störungsreihen: Sie enthält alle Effekte
          automatisch. Abb. 3.2 vergleicht zwei Rechnungen über 20 Jahre – einmal mit, einmal ohne
          Sonne. Ohne Sonne bleibt die Ellipse ortsfest und ihre Exzentrizität konstant. Mit Sonne
          schwankt die Exzentrizität im Rhythmus der Evektion, und die Richtung des Perigäums dreht
          sich gleichmäßig weiter.
        </p>
        <p>
          Diese Störungen sind periodisch: Sie verformen die Bahn, verändern aber ihre mittlere
          Größe nicht dauerhaft – die Simulation zeigt über Jahrhunderte keinen Drift. Langfristig
          wirksam ist vor allem die Gezeitenreibung: Messungen zeigen eine langsame Zunahme des
          Erde-Mond-Abstands um etwa 3,8 cm pro Jahr (Kapitel 6).
        </p>
      </div>

      <Figure
        n="3.2"
        caption="Simulation des realen Systems über 20 Jahre (Velocity-Verlet, adaptive Schrittweite). Aus der Steigung der Ausgleichsgeraden ergibt sich die Umlaufzeit der Apsidenlinie."
      >
        <PrecessionExperiment />
      </Figure>

      <div class="prose">
        <SectionTitle n="3.4">Die Mondbahn um die Sonne</SectionTitle>
        <p>
          Aus der Sicht der Sonne beschreibt der Mond keine Schleifen, wie man es von einem Bild
          „Mond kreist um die Erde, Erde kreist um die Sonne“ erwarten könnte. Weil die Sonne den
          Mond stärker anzieht als die Erde, ist seine Bahn überall zur Sonne hin gekrümmt – eine
          leicht gewellte, nirgends rückläufige Kurve. Man kann den Mond deshalb mit gutem Recht
          auch als Doppelplaneten-Partner der Erde betrachten, der von der Erde nur „gestört“ wird.
        </p>
      </div>
      <div class="btn-row">
        <LinkButton to="sim-mondbahn-sonne" primary>
          Mondbahn um die Sonne ansehen
        </LinkButton>
        <LinkButton to="sim-zwei-koerper">Ohne Sonne simulieren</LinkButton>
        <LinkButton to="sim-real">Reales System</LinkButton>
      </div>

      <Callout kind="merke">
        Für die Stabilität zählt nicht, wie stark die Sonne am Mond zieht, sondern wie
        unterschiedlich sie an Mond und Erde zieht. Diese Gezeitenbeschleunigung wächst mit{' '}
        <Tex>{'r^3'}</Tex>: Je weiter außen ein Mond kreist, desto stärker stört ihn die Sonne im
        Verhältnis zur Anziehung seines Planeten. Das führt direkt zur Hill-Sphäre in Kapitel 5.
      </Callout>
    </>
  );
}

function TidalField() {
  const [angle, setAngle] = useState(40);
  const phi = (angle * Math.PI) / 180;
  const r = MOON.semiMajorAxis;
  const d = AU;
  // Beschleunigungen in SI.
  const aSunEarth = (G * SUN.mass) / d ** 2;
  const mx = r * Math.cos(phi);
  const my = r * Math.sin(phi);
  const dx = -d - mx;
  const dy = -my;
  const dm = Math.hypot(dx, dy);
  const aSunMoon: [number, number] = [
    ((G * SUN.mass) / dm ** 2) * (dx / dm),
    ((G * SUN.mass) / dm ** 2) * (dy / dm),
  ];
  const tidal: [number, number] = [aSunMoon[0] + aSunEarth, aSunMoon[1]];
  const aEarth = (G * EARTH.mass) / r ** 2;
  const tidalMag = Math.hypot(...tidal);

  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    c: {
      ink2: string;
      ink3: string;
      grid: string;
      series: string[];
      accent: string;
      fontUi: string;
    },
  ) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.56;
    const cy = h / 2;
    const R = Math.min(w * 0.3, h * 0.38);
    const k = (G * SUN.mass) / d ** 3;
    const tScale = (R * 0.33) / (2 * k * r);
    // Richtung zur Sonne.
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(14, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ink2;
    ctx.font = `12px ${c.fontUi}`;
    ctx.textAlign = 'left';
    ctx.fillText('zur Sonne', 28, cy - 12);
    ctx.strokeStyle = c.grid;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(28, cy);
    ctx.lineTo(w - 10, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    // Mondbahn.
    ctx.strokeStyle = c.ink3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    // Gezeitenfeld auf der Bahn (Hill-Näherung): a = k·r·(2cosφ, −sinφ) in Sonnenkoordinaten.
    for (let i = 0; i < 24; i++) {
      const p = (i / 24) * Math.PI * 2;
      const ax = 2 * k * r * Math.cos(p);
      const ay = -k * r * Math.sin(p);
      // Sonne liegt links (−x): Richtung "weg von der Sonne" = +x.
      drawArrow(
        ctx,
        cx + R * Math.cos(p),
        cy - R * Math.sin(p),
        ax * tScale,
        -ay * tScale,
        c.series[4]!,
        1.5,
      );
    }
    // Erde.
    ctx.fillStyle = c.series[0]!;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    // Mond mit Kraftpfeilen.
    const px = cx + R * Math.cos(phi);
    const py = cy - R * Math.sin(phi);
    const fScale = (R * 0.55) / aSunEarth;
    drawArrow(ctx, cx, cy, -aSunEarth * fScale, 0, c.accent, 2);
    drawArrow(ctx, px, py, aSunMoon[0] * fScale, -aSunMoon[1] * fScale, c.accent, 2);
    drawArrow(ctx, px, py, tidal[0] * fScale * 100, -tidal[1] * fScale * 100, c.series[1]!, 2.5);
    ctx.fillStyle = c.ink3;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ink2;
    ctx.font = `12px ${c.fontUi}`;
    ctx.fillText('Erde', cx + 14, cy + 22);
    ctx.fillText('Mond', px + 10, py + 18);
  };

  return (
    <div class="grid-2">
      <CanvasBox
        draw={draw}
        deps={[angle]}
        aspect="4 / 3"
        label="Gezeitenfeld der Sonne um die Erde"
      />
      <div class="stack">
        <Slider
          id="tidal-angle"
          label="Position des Mondes"
          value={angle}
          min={0}
          max={360}
          step={1}
          format={(v) => `${fmt(v)}°`}
          hint="0° = Vollmond (von der Sonne weg), 180° = Neumond"
          onChange={setAngle}
        />
        <div class="legend">
          <span class="legend-item">
            <span class="legend-key" style={{ background: 'var(--accent)' }} />
            Anziehung der Sonne
          </span>
          <span class="legend-item">
            <span class="legend-key" style={{ background: 'var(--series-2)' }} />
            Gezeitenkraft ×100
          </span>
          <span class="legend-item">
            <span class="legend-key" style={{ background: 'var(--series-5)' }} />
            Gezeitenfeld
          </span>
        </div>
        <dl class="kv">
          <dt>Sonne → Mond</dt>
          <dd>{sig(Math.hypot(...aSunMoon) * 1000, 4)} mm/s²</dd>
          <dt>Sonne → Erde</dt>
          <dd>{sig(aSunEarth * 1000, 4)} mm/s²</dd>
          <dt>Erde → Mond</dt>
          <dd>{sig(aEarth * 1000, 4)} mm/s²</dd>
          <dt>Gezeitenbeschleunigung</dt>
          <dd>{sci(tidalMag, 2)} m/s²</dd>
          <dt>Gezeiten / Erdanziehung</dt>
          <dd>{fmt((tidalMag / aEarth) * 100, 2)} %</dd>
        </dl>
        <p class="small muted">
          Die gelben Pfeile sind fast gleich lang – die Sonne zieht Erde und Mond ähnlich stark. Nur
          ihr kleiner Unterschied (orange) verformt die Mondbahn.
        </p>
      </div>
    </div>
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
  dy: number,
  color: string,
  width: number,
): void {
  const len = Math.hypot(dx, dy);
  if (len < 1.5) return;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(7, len * 0.45);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx - ux * head * 0.6, y + dy - uy * head * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * head - uy * head * 0.5, y + dy - uy * head + ux * head * 0.5);
  ctx.lineTo(x + dx - ux * head + uy * head * 0.5, y + dy - uy * head - ux * head * 0.5);
  ctx.closePath();
  ctx.fill();
}

interface PrecessionData {
  t: Float64Array;
  omegaSun: Float64Array;
  omegaNoSun: Float64Array;
  tE: Float64Array;
  eSun: Float64Array;
  eNoSun: Float64Array;
  period: number;
  r2: number;
}

function measure(): PrecessionData {
  const run = (sunMass: number, years: number) => {
    const sim = new Simulation({ ...REAL_PARAMS, sunMass }, { trailCapacity: 2 });
    sim.advance(years * YEAR, 5_000_000);
    const s = sim.series;
    return {
      t: s.time.slice(0, s.length),
      omega: s.data.omega.slice(0, s.length),
      e: s.data.eccentricity.slice(0, s.length),
    };
  };
  const withSun = run(1, 20);
  const noSun = run(0, 20);
  const omSun = unwrap(withSun.omega).map((v) => (v * 180) / Math.PI);
  const omNo = unwrap(noSun.omega).map((v) => (v * 180) / Math.PI);
  const reg = linearRegression(withSun.t, omSun);
  const period = 360 / reg.slope / YEAR;
  const n = Math.min(withSun.t.length, noSun.t.length);
  const t = new Float64Array(n);
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    t[i] = withSun.t[i]! / YEAR;
    a[i] = omSun[i]! - omSun[0]!;
    b[i] = omNo[i]! - omNo[0]!;
  }
  // Exzentrizität im ersten Jahr.
  const m = withSun.t.findIndex((x) => x > YEAR);
  const tE = new Float64Array(m);
  const eS = new Float64Array(m);
  const eN = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    tE[i] = withSun.t[i]! / DAY;
    eS[i] = withSun.e[i]!;
    eN[i] = noSun.e[i]!;
  }
  return { t, omegaSun: a, omegaNoSun: b, tE, eSun: eS, eNoSun: eN, period, r2: reg.r2 };
}

function PrecessionExperiment() {
  const data = useMemo(measure, []);
  return (
    <div class="stack" style={{ gap: '18px' }}>
      <div class="grid-3">
        <div class="panel panel-pad" style={{ gap: '4px' }}>
          <div class="small muted">Apsidendrehung (Simulation)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 500 }}>{fmt(data.period, 2)} Jahre</div>
        </div>
        <div class="panel panel-pad" style={{ gap: '4px' }}>
          <div class="small muted">Beobachtet</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 500 }}>8,85 Jahre</div>
        </div>
        <div class="panel panel-pad" style={{ gap: '4px' }}>
          <div class="small muted">Abweichung</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 500 }}>
            {fmt(((data.period - 8.85) / 8.85) * 100, 1)} %
          </div>
        </div>
      </div>
      <LineChart
        title="Richtung des Perigäums (seit Start)"
        series={[
          { id: 'sun', label: 'mit Sonne', x: data.t, y: data.omegaSun },
          { id: 'nosun', label: 'ohne Sonne', x: data.t, y: data.omegaNoSun },
        ]}
        xLabel="Zeit (Jahre)"
        yLabel="Drehung der Apsidenlinie (°)"
        xFormat={(v) => fmt(v)}
        yFormat={(v) => fmt(v)}
        height={230}
      />
      <LineChart
        title="Exzentrizität im ersten Jahr – die Schwankung mit etwa 32 Tagen Periode ist die Evektion"
        series={[
          { id: 'sun', label: 'mit Sonne', x: data.tE, y: data.eSun },
          { id: 'nosun', label: 'ohne Sonne', x: data.tE, y: data.eNoSun },
        ]}
        xLabel="Zeit (Tage)"
        yLabel="Exzentrizität"
        xFormat={(v) => fmt(v)}
        yFormat={(v) => fmt(v, 3)}
        height={210}
      />
      <p class="small muted">
        Die ebene Simulation vernachlässigt die Neigung der Mondbahn (5,1°) und andere Planeten; die
        Abweichung von rund einem Prozent zeigt, dass die Sonne den Effekt allein erklärt.
        Bestimmtheitsmaß der Ausgleichsgeraden: R² = {fmt(data.r2, 4)}.
      </p>
    </div>
  );
}
