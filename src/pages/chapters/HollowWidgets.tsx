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
import { StatusChip } from '../../ui/content';
import { Slider } from '../../ui/controls';
import { fmt, sig } from '../../ui/format';
import { Icon } from '../../ui/Icon';

const R = MOON.radius;

export function ShellGravityChart() {
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

export function ShellCalculator() {
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

export function RollingRace() {
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
