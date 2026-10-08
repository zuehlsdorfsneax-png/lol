import { useMemo, useState } from 'preact/hooks';
import {
  DAY,
  EARTH,
  G,
  JUPITER_MOONS,
  KM,
  MOON,
  PLANETS,
  STANDARD_GRAVITY,
  centralMass,
  positionAtPhase,
  simulateForceLaw,
  theoreticalApsidalAngle,
  AU,
  YEAR,
  SUN,
} from '../../physics';
import { CanvasBox } from '../../ui/CanvasBox';
import { Segmented, Slider } from '../../ui/controls';
import { fmt, sci, sig } from '../../ui/format';

export function MoonTest() {
  const [n, setN] = useState(2);
  const r = MOON.semiMajorAxis;
  const T = MOON.siderealPeriod;
  const measured = (4 * Math.PI ** 2 * r) / (T * T);
  const ratio = r / EARTH.radius;
  const predicted = STANDARD_GRAVITY / ratio ** n;
  const factor = predicted / measured;
  const barMax = Math.max(measured, predicted) * 1.1;
  return (
    <div class="stack" style={{ gap: 'var(--sp-4)' }}>
      <div class="grid-2">
        <div class="stack">
          <Slider
            id="force-exponent"
            label="Exponent n im Ansatz a ∝ 1/rⁿ"
            value={n}
            min={1}
            max={3}
            step={0.05}
            format={(v) => sig(v, 3)}
            onChange={setN}
          />
          <dl class="kv">
            <dt>Mondabstand r</dt>
            <dd>
              {fmt(r / KM)} km = {sig(ratio, 4)} R⊕
            </dd>
            <dt>Siderische Umlaufzeit T</dt>
            <dd>{sig(T / DAY, 6)} Tage</dd>
            <dt>Gemessen: a = 4π²r / T²</dt>
            <dd>{sig(measured * 1000, 4)} mm/s²</dd>
            <dt>Vorhergesagt: g · (R⊕/r)ⁿ</dt>
            <dd>{sig(predicted * 1000, 4)} mm/s²</dd>
            <dt>Verhältnis</dt>
            <dd>{sig(factor, 3)}</dd>
          </dl>
        </div>
        <div class="stack" aria-label="Vergleich der Beschleunigungen">
          {[
            { label: 'gemessen (Bahn)', v: measured, slot: 0 },
            { label: `vorhergesagt (n = ${sig(n, 3)})`, v: predicted, slot: 1 },
          ].map((b) => (
            <div key={b.label} class="stack" style={{ gap: 'var(--sp-1)' }}>
              <div class="small muted">{b.label}</div>
              <div class="bar-row">
                <div
                  class="bar"
                  style={{
                    width: `${Math.max(0.5, (b.v / barMax) * 100)}%`,
                    background: `var(--series-${b.slot + 1})`,
                  }}
                />
                <span class="num small bar-value">{sig(b.v * 1000, 3)} mm/s²</span>
              </div>
            </div>
          ))}
          <p class="small muted">
            {Math.abs(factor - 1) < 0.03
              ? 'Übereinstimmung auf etwa 1 % – der Rest stammt u. a. von der Mondmasse und der Erdrotation in g.'
              : factor > 1
                ? `Die Vorhersage ist ${sig(factor, 2)}-mal zu groß.`
                : `Die Vorhersage ist ${sig(1 / factor, 2)}-mal zu klein.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function KeplerLab() {
  const [e, setE] = useState(0.5);
  const sectors = 12;
  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    c: {
      ink: string;
      ink2: string;
      ink3: string;
      axis: string;
      series: string[];
      accent: string;
      fontUi: string;
      surface2: string;
    },
    time: number,
  ) => {
    ctx.clearRect(0, 0, w, h);
    const a = 1;
    const b = Math.sqrt(1 - e * e);
    const scale = Math.min((w - 40) / (2 * a), (h - 30) / (2 * b));
    const cx = w / 2 + a * e * scale; // Brennpunkt (Sonne) im Ursprung der Bahnformel
    const cy = h / 2;
    const P = (phase: number): [number, number] => {
      const p = positionAtPhase(a, e, phase);
      return [cx + p.x * scale, cy - p.y * scale];
    };
    // Sektoren gleicher Zeit.
    for (let k = 0; k < sectors; k++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s <= 40; s++) {
        const [x, y] = P((k + s / 40) / sectors);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = k % 2 === 0 ? c.series[0]! : c.series[2]!;
      ctx.globalAlpha = 0.16;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Bahn.
    ctx.strokeStyle = c.ink3;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let s = 0; s <= 200; s++) {
      const [x, y] = P(s / 200);
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Sonne im Brennpunkt.
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    // Planet.
    const [px, py] = P((time / 8) % 1);
    ctx.fillStyle = c.series[0]!;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.ink2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = c.ink2;
    ctx.font = `12px ${c.fontUi}`;
    ctx.textAlign = 'left';
    ctx.fillText('Sonne (Brennpunkt)', cx + 10, cy - 10);
  };

  const planetMass = useMemo(() => {
    const planets = PLANETS.map((p) => ({ ...p, M: centralMass(p.a * AU, p.T * YEAR, G) }));
    const moons = JUPITER_MOONS.map((m) => ({ ...m, M: centralMass(m.a * KM, m.T * DAY, G) }));
    return { planets, moons };
  }, []);

  return (
    <div class="stack" style={{ gap: 'var(--sp-4)' }}>
      <Slider
        id="kepler-e"
        label="Exzentrizität der Bahn"
        value={e}
        min={0}
        max={0.9}
        step={0.01}
        format={(v) => fmt(v, 2)}
        onChange={setE}
      />
      <CanvasBox
        draw={draw}
        deps={[e]}
        animate
        aspect="2 / 1"
        label="Ellipsenbahn mit Sektoren gleicher Fläche"
      />
      <p class="small muted">
        Jeder Sektor hat die Fläche πab/{sectors} ={' '}
        {sig((Math.PI * Math.sqrt(1 - e * e)) / sectors, 3)} (für a = 1).
      </p>
      <div class="grid-2">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Planet</th>
                <th class="num">a (AE)</th>
                <th class="num">T (Jahre)</th>
                <th class="num">T²/a³</th>
                <th class="num">M (Sonne)</th>
              </tr>
            </thead>
            <tbody>
              {planetMass.planets.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td class="num">{sig(p.a, 4)}</td>
                  <td class="num">{sig(p.T, 4)}</td>
                  <td class="num">{fmt(p.T ** 2 / p.a ** 3, 3)}</td>
                  <td class="num">{sci(p.M, 3)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Jupitermond</th>
                <th class="num">a (km)</th>
                <th class="num">T (Tage)</th>
                <th class="num">M (Jupiter)</th>
              </tr>
            </thead>
            <tbody>
              {planetMass.moons.map((m) => (
                <tr key={m.name}>
                  <td>{m.name}</td>
                  <td class="num">{fmt(m.a)}</td>
                  <td class="num">{sig(m.T, 4)}</td>
                  <td class="num">{sci(m.M, 3)} kg</td>
                </tr>
              ))}
              <tr>
                <td>Mond (Erde)</td>
                <td class="num">{fmt(MOON.semiMajorAxis / KM)}</td>
                <td class="num">{sig(MOON.siderealPeriod / DAY, 4)}</td>
                <td class="num">
                  {sci(centralMass(MOON.semiMajorAxis, MOON.siderealPeriod, G), 3)} kg
                </td>
              </tr>
            </tbody>
          </table>
          <p class="small muted" style={{ marginTop: 'var(--sp-2)' }}>
            Aus M = 4π²a³/(G T²). Letzte Zeile: Erde + Mond ({sci(EARTH.mass + MOON.mass, 3)} kg).
            Sonne: {sci(SUN.mass, 3)} kg.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ForceLawLab() {
  const [n, setN] = useState(2);
  const [f, setF] = useState(0.85);
  const orbit = useMemo(() => simulateForceLaw(n, f, 80), [n, f]);
  const draw = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    c: {
      ink2: string;
      ink3: string;
      series: string[];
      accent: string;
      fontUi: string;
      grid: string;
    },
  ) => {
    ctx.clearRect(0, 0, w, h);
    let maxR = 1;
    for (const p of orbit.points) maxR = Math.max(maxR, Math.hypot(p.x, p.y));
    maxR = Math.min(maxR, 3.5);
    const scale = (Math.min(w, h) / 2 - 12) / maxR;
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = c.series[0]!;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    orbit.points.forEach((p, i) => {
      const x = cx + p.x * scale;
      const y = cy - p.y * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    const last = orbit.points[orbit.points.length - 1]!;
    ctx.fillStyle = c.series[0]!;
    ctx.beginPath();
    ctx.arc(cx + last.x * scale, cy - last.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.ink3;
    ctx.font = `11px ${c.fontUi}`;
    ctx.fillText('Startradius', cx + scale * 0.72, cy - scale * 0.72);
  };
  const theory = theoreticalApsidalAngle(n);
  const outcome =
    orbit.outcome === 'crash'
      ? 'Absturz ins Zentrum'
      : orbit.outcome === 'escape'
        ? 'Flucht'
        : 'gebunden';
  return (
    <div class="grid-2">
      <div class="stack">
        <Segmented
          label="Kraftgesetz"
          value={String(n)}
          options={[
            { value: '1.5', label: 'n = 1,5' },
            { value: '2', label: 'n = 2 (Newton)' },
            { value: '2.5', label: 'n = 2,5' },
            { value: '3.2', label: 'n = 3,2' },
          ]}
          onChange={(v) => setN(Number(v))}
        />
        <Slider
          id="force-n"
          label="Exponent n"
          value={n}
          min={1}
          max={3.5}
          step={0.05}
          format={(v) => sig(v, 3)}
          onChange={setN}
        />
        <Slider
          id="force-f"
          label="Startgeschwindigkeit (× Kreisbahn)"
          value={f}
          min={0.6}
          max={1.3}
          step={0.01}
          format={(v) => fmt(v, 2)}
          onChange={setF}
        />
        <dl class="kv">
          <dt>Ergebnis</dt>
          <dd>{outcome}</dd>
          <dt>Winkel von Periapsis zu Periapsis</dt>
          <dd>{Number.isFinite(orbit.apsidalAngle) ? `${sig(orbit.apsidalAngle, 4)}°` : '–'}</dd>
          <dt>Theorie (fast kreisförmig): 360°/√(3 − n)</dt>
          <dd>{Number.isFinite(theory) ? `${sig(2 * theory, 4)}°` : 'keine stabile Bahn'}</dd>
        </dl>
        <p class="small muted">
          Bei 360° schließt sich die Bahn nach einem Umlauf. Weicht der Winkel ab, dreht sich die
          Ellipse bei jedem Umlauf weiter – es entsteht eine Rosette.
        </p>
      </div>
      <CanvasBox
        draw={draw}
        deps={[orbit]}
        aspect="1 / 1"
        label={`Bahn im Kraftfeld mit Exponent ${n}`}
      />
    </div>
  );
}
