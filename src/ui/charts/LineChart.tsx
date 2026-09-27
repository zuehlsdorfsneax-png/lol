import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { prepareCanvas, useElementSize, useThemeColors, type ThemeColors } from '../hooks';
import { logTicks, niceRange, niceTicks } from './ticks';

export interface ChartSeries {
  id: string;
  label: string;
  /** Farbe (CSS-Farbe); Standard: Kategorienfarben in fester Reihenfolge. */
  color?: string;
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  length?: number;
}

export interface RefLine {
  y: number;
  label: string;
}

interface Props {
  title?: ComponentChildren;
  series: ChartSeries[];
  xLabel: string;
  yLabel: string;
  xFormat: (v: number) => string;
  yFormat: (v: number) => string;
  yLog?: boolean;
  yMin?: number;
  yMax?: number;
  xMin?: number;
  xMax?: number;
  refLines?: RefLine[];
  height?: number;
  /** Ändert sich, wenn neu gezeichnet werden soll (z. B. bei Live-Daten). */
  version?: number;
  actions?: ComponentChildren;
}

const M = { left: 58, right: 16, top: 28, bottom: 34 };

interface Layout {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sx: (v: number) => number;
  sy: (v: number) => number;
  xMin: number;
  xMax: number;
}

function seriesColor(s: ChartSeries, i: number, c: ThemeColors): string {
  return s.color ?? c.series[i % c.series.length]!;
}

function len(s: ChartSeries): number {
  return s.length ?? Math.min(s.x.length, s.y.length);
}

/** Index des Punkts mit x ≤ target (x aufsteigend sortiert). */
function nearestIndex(xs: ArrayLike<number>, n: number, target: number): number {
  let lo = 0;
  let hi = n - 1;
  if (n === 0) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xs[mid]! <= target) lo = mid;
    else hi = mid - 1;
  }
  if (lo + 1 < n && Math.abs(xs[lo + 1]! - target) < Math.abs(xs[lo]! - target)) return lo + 1;
  return lo;
}

export function LineChart(props: Props) {
  const { series, height = 220 } = props;
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useThemeColors();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const layoutRef = useRef<Layout | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const ctx = prepareCanvas(canvas, size.width, height);
    if (!ctx) return;
    layoutRef.current = draw(ctx, size.width, height, props, colors, hover);
  });

  const onMove = (e: PointerEvent): void => {
    const l = layoutRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!l || !rect) return;
    const px = e.clientX - rect.left;
    if (px < l.x0 || px > l.x1) {
      setHover(null);
      return;
    }
    setHover(l.xMin + ((px - l.x0) / (l.x1 - l.x0)) * (l.xMax - l.xMin));
  };

  const l = layoutRef.current;
  const tooltip =
    hover !== null && l
      ? series
          .map((s, i) => {
            const n = len(s);
            const idx = nearestIndex(s.x, n, hover);
            return idx < 0 ? null : { s, i, x: s.x[idx]!, y: s.y[idx]! };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
      : [];
  const tipX = l && hover !== null ? l.sx(hover) : 0;

  return (
    <div class="chart">
      {(props.title || props.actions) && (
        <div class="chart-head">
          <div class="chart-title">{props.title}</div>
          <div class="btn-row">
            {props.actions}
            <button type="button" class="btn small ghost" onClick={() => setShowTable((v) => !v)}>
              {showTable ? 'Diagramm' : 'Tabelle'}
            </button>
          </div>
        </div>
      )}
      {series.length > 1 && (
        <div class="legend">
          {series.map((s, i) => (
            <span class="legend-item" key={s.id}>
              <span class="legend-key" style={{ background: seriesColor(s, i, colors) }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      {showTable ? (
        <DataTable {...props} />
      ) : (
        <div class="chart-canvas-wrap" ref={wrapRef}>
          <canvas
            ref={canvasRef}
            style={{ height: `${height}px` }}
            role="img"
            aria-label={`${props.yLabel} über ${props.xLabel}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
          {tooltip.length > 0 && (
            <div
              class="tooltip"
              style={{
                left: `${Math.min(Math.max(tipX + 12, 0), size.width - 170)}px`,
                top: `${M.top}px`,
              }}
            >
              <div class="tooltip-head">
                {props.xLabel}: {props.xFormat(tooltip[0]!.x)}
              </div>
              {tooltip.map(({ s, i, y }) => (
                <div class="tooltip-row" key={s.id}>
                  <span class="legend-key" style={{ background: seriesColor(s, i, colors) }} />
                  <strong>{Number.isFinite(y) ? props.yFormat(y) : '–'}</strong>
                  <span class="muted">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DataTable({ series, xLabel, xFormat, yFormat }: Props) {
  const base = series[0];
  if (!base) return null;
  const n = len(base);
  const step = Math.max(1, Math.ceil(n / 60));
  const rows: number[] = [];
  for (let i = 0; i < n; i += step) rows.push(i);
  if (rows[rows.length - 1] !== n - 1 && n > 0) rows.push(n - 1);
  return (
    <div class="table-wrap" style={{ maxHeight: '320px', overflowY: 'auto' }}>
      <table class="data">
        <thead>
          <tr>
            <th>{xLabel}</th>
            {series.map((s) => (
              <th class="num" key={s.id}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i}>
              <td class="num">{xFormat(base.x[i]!)}</td>
              {series.map((s) => {
                const idx = s === base ? i : nearestIndex(s.x, len(s), base.x[i]!);
                const y = idx >= 0 ? s.y[idx]! : NaN;
                return (
                  <td class="num" key={s.id}>
                    {Number.isFinite(y) ? yFormat(y) : '–'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: Props,
  c: ThemeColors,
  hover: number | null,
): Layout {
  ctx.clearRect(0, 0, width, height);
  const x0 = M.left;
  const x1 = width - M.right;
  const y0 = height - M.bottom;
  const y1 = M.top;

  // Wertebereiche bestimmen.
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const s of p.series) {
    const n = len(s);
    for (let i = 0; i < n; i++) {
      const x = s.x[i]!;
      const y = s.y[i]!;
      if (!Number.isFinite(x) || !Number.isFinite(y) || (p.yLog && y <= 0)) continue;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  for (const r of p.refLines ?? []) {
    if (Number.isFinite(r.y) && (!p.yLog || r.y > 0)) {
      yMin = Math.min(yMin, r.y);
      yMax = Math.max(yMax, r.y);
    }
  }
  if (p.xMin !== undefined) xMin = p.xMin;
  if (p.xMax !== undefined) xMax = p.xMax;
  if (p.yMin !== undefined) yMin = p.yMin;
  if (p.yMax !== undefined) yMax = p.yMax;
  if (!Number.isFinite(xMin)) {
    xMin = 0;
    xMax = 1;
  }
  if (xMax === xMin) xMax = xMin + 1;
  if (!Number.isFinite(yMin)) {
    yMin = p.yLog ? 1e-6 : 0;
    yMax = p.yLog ? 1 : 1;
  }

  let yTicks: number[];
  if (p.yLog) {
    yMin = 10 ** Math.floor(Math.log10(yMin));
    yMax = 10 ** Math.ceil(Math.log10(yMax));
    if (yMax === yMin) yMax = yMin * 10;
    yTicks = logTicks(yMin, yMax);
  } else {
    if (p.yMin === undefined || p.yMax === undefined) [yMin, yMax] = niceRange(yMin, yMax, 4);
    yTicks = niceTicks(yMin, yMax, 4);
  }

  const sx = (v: number): number => x0 + ((v - xMin) / (xMax - xMin)) * (x1 - x0);
  const sy = p.yLog
    ? (v: number): number =>
        y0 - ((Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * (y0 - y1)
    : (v: number): number => y0 - ((v - yMin) / (yMax - yMin)) * (y0 - y1);

  // Raster und Achsen.
  ctx.font = `11px ${c.fontMono}`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1;
  for (const t of yTicks) {
    const y = Math.round(sy(t)) + 0.5;
    ctx.strokeStyle = c.grid;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.fillStyle = c.ink3;
    ctx.textAlign = 'right';
    ctx.fillText(p.yFormat(t), x0 - 8, y);
  }
  const xTicks = niceTicks(xMin, xMax, Math.max(2, Math.floor((x1 - x0) / 90)));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of xTicks) {
    const x = sx(t);
    if (x < x0 - 1 || x > x1 + 1) continue;
    ctx.fillStyle = c.ink3;
    ctx.fillText(p.xFormat(t), x, y0 + 8);
  }
  ctx.strokeStyle = c.axis;
  ctx.beginPath();
  ctx.moveTo(x0, Math.round(y0) + 0.5);
  ctx.lineTo(x1, Math.round(y0) + 0.5);
  ctx.stroke();

  // Achsenbeschriftung.
  ctx.font = `11px ${c.fontUi}`;
  ctx.fillStyle = c.ink2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(p.yLabel, 4, 0);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(p.xLabel, x1, height - 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y1 - 4, x1 - x0, y0 - y1 + 8);
  ctx.clip();

  // Referenzlinien (Grenzwerte). Liegen zwei Beschriftungen zu dicht, kommt die zweite unter die Linie.
  const refs = (p.refLines ?? [])
    .filter((r) => Number.isFinite(r.y) && (!p.yLog || r.y > 0))
    .map((r) => ({ ...r, py: Math.round(sy(r.y)) + 0.5 }))
    .filter((r) => r.py >= y1 - 2 && r.py <= y0 + 2)
    .sort((a, b) => a.py - b.py);
  let lastLabel = -Infinity;
  for (const r of refs) {
    ctx.strokeStyle = c.ink3;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(x0, r.py);
    ctx.lineTo(x1, r.py);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = `11px ${c.fontUi}`;
    ctx.fillStyle = c.ink2;
    ctx.textAlign = 'left';
    const below = r.py - 3 - lastLabel < 13;
    ctx.textBaseline = below ? 'top' : 'bottom';
    const ly = below ? r.py + 3 : r.py - 3;
    ctx.fillText(r.label, x0 + 6, ly);
    lastLabel = below ? ly + 11 : ly;
  }

  // Linien – bei vielen Punkten Min/Max je Pixelspalte (verlustfreie Ausdünnung).
  const plotW = x1 - x0;
  p.series.forEach((s, si) => {
    const n = len(s);
    const color = seriesColor(s, si, c);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    let pen = false;
    if (n > plotW * 3) {
      let col = -1;
      let lo = Infinity;
      let hi = -Infinity;
      const flush = (): void => {
        if (col < 0 || lo === Infinity) return;
        const x = x0 + col;
        if (!pen) {
          ctx.moveTo(x, sy(lo));
          pen = true;
        } else ctx.lineTo(x, sy(lo));
        ctx.lineTo(x, sy(hi));
      };
      for (let i = 0; i < n; i++) {
        const xv = s.x[i]!;
        const yv = s.y[i]!;
        const cc = Math.floor(sx(xv) - x0);
        if (cc !== col) {
          flush();
          col = cc;
          lo = Infinity;
          hi = -Infinity;
        }
        if (Number.isFinite(yv) && (!p.yLog || yv > 0)) {
          if (yv < lo) lo = yv;
          if (yv > hi) hi = yv;
        } else if (lo === Infinity) {
          pen = false;
        }
      }
      flush();
    } else {
      for (let i = 0; i < n; i++) {
        const yv = s.y[i]!;
        if (!Number.isFinite(yv) || (p.yLog && yv <= 0)) {
          pen = false;
          continue;
        }
        const X = sx(s.x[i]!);
        const Y = sy(yv);
        if (pen) ctx.lineTo(X, Y);
        else {
          ctx.moveTo(X, Y);
          pen = true;
        }
      }
    }
    ctx.stroke();

    // Endpunkt mit Ring in Flächenfarbe.
    for (let i = n - 1; i >= 0; i--) {
      const yv = s.y[i]!;
      if (Number.isFinite(yv) && (!p.yLog || yv > 0)) {
        ctx.beginPath();
        ctx.arc(sx(s.x[i]!), sy(yv), 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = c.surface;
        ctx.stroke();
        break;
      }
    }
  });
  ctx.restore();

  // Fadenkreuz.
  if (hover !== null) {
    const x = Math.round(sx(hover)) + 0.5;
    ctx.strokeStyle = c.ink3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y0);
    ctx.stroke();
    p.series.forEach((s, si) => {
      const idx = nearestIndex(s.x, len(s), hover);
      if (idx < 0) return;
      const yv = s.y[idx]!;
      if (!Number.isFinite(yv) || (p.yLog && yv <= 0)) return;
      ctx.beginPath();
      ctx.arc(sx(s.x[idx]!), sy(yv), 4, 0, Math.PI * 2);
      ctx.fillStyle = seriesColor(s, si, c);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = c.surface;
      ctx.stroke();
    });
  }

  return { x0, x1, y0, y1, sx, sy, xMin, xMax };
}
