import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { YEAR, OUTCOME_LABELS, KM } from '../physics';
import { openInSimulator } from '../app/store';
import { logTicks, niceTicks } from '../ui/charts/ticks';
import { Segmented, Select, Slider, Toggle } from '../ui/controls';
import { FILE_EXPORT, downloadCanvas, downloadText } from '../ui/download';
import { duration, fmt } from '../ui/format';
import { prepareCanvas, useElementSize, useThemeColors, type ThemeColors } from '../ui/hooks';
import { Icon } from '../ui/Icon';
import {
  AXES,
  DEFAULT_BASE,
  MAP_PRESETS,
  axisValue,
  cellParams,
  outcomeClass,
  realMoonMarker,
  theoryOverlays,
  type AxisKey,
  type CellResult,
  type MapConfig,
} from './axes';
import type { RunMessage, WorkerReply } from './worker';

const RESOLUTIONS = [
  { value: '24', label: '24 × 16', nx: 24, ny: 16 },
  { value: '40', label: '40 × 28', nx: 40, ny: 28 },
  { value: '64', label: '64 × 44', nx: 64, ny: 44 },
  { value: '96', label: '96 × 64', nx: 96, ny: 64 },
] as const;

const YEARS = ['5', '10', '25', '50', '100'] as const;

const M = { left: 62, right: 14, top: 14, bottom: 44 };

type Mode = 'outcome' | 'time';

interface Props {
  preset?: string | null;
  compact?: boolean;
}

function configFromPreset(
  id: string | null | undefined,
  nx: number,
  ny: number,
  years: number,
): MapConfig {
  const p = MAP_PRESETS.find((m) => m.id === id) ?? MAP_PRESETS[0]!;
  return { ...p.config, nx, ny, years, roche: true, base: DEFAULT_BASE };
}

/** Farbe einer Zelle. */
function cellColor(r: CellResult, mode: Mode, years: number, c: ThemeColors): string {
  const cls = outcomeClass(r.outcome);
  if (mode === 'outcome')
    return cls === 'stable' ? c.series[2]! : cls === 'crash' ? c.series[1]! : c.series[0]!;
  // Lebensdauer: sequentielle Blau-Skala, dunkel = lange stabil.
  const ramp = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
  if (cls === 'stable') return ramp[ramp.length - 1]!;
  const t = Math.log10(Math.max(r.time / 86_400, 1)) / Math.log10(years * 365.25);
  return ramp[Math.min(ramp.length - 2, Math.max(0, Math.floor(t * (ramp.length - 1))))]!;
}

export function StabilityMap({ preset, compact = false }: Props) {
  const [presetId, setPresetId] = useState(
    MAP_PRESETS.find((m) => m.id === preset)?.id ?? MAP_PRESETS[0]!.id,
  );
  const [res, setRes] = useState<string>(compact ? '24' : '40');
  const [years, setYears] = useState<string>('10');
  const resolution = RESOLUTIONS.find((r) => r.value === res)!;
  const [config, setConfig] = useState<MapConfig>(() =>
    configFromPreset(presetId, resolution.nx, resolution.ny, Number(years)),
  );
  const [mode, setMode] = useState<Mode>('outcome');
  const [progress, setProgress] = useState({ done: 0, total: 0, running: false, seconds: 0 });
  const [hover, setHover] = useState<{ i: number; j: number; px: number; py: number } | null>(null);
  const [selected, setSelected] = useState<{ i: number; j: number } | null>(null);
  const results = useRef<(CellResult | null)[]>([]);
  const workers = useRef<Worker[]>([]);
  const job = useRef(0);
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useThemeColors();
  const dirty = useRef(true);
  const startTime = useRef(0);

  const stop = (): void => {
    for (const w of workers.current) w.terminate();
    workers.current = [];
    setProgress((p) => ({ ...p, running: false }));
  };

  const run = (cfg: MapConfig = config): void => {
    stop();
    const id = ++job.current;
    const total = cfg.nx * cfg.ny;
    results.current = Array.from({ length: total }, () => null);
    setSelected(null);
    dirty.current = true;
    // Zufällige Reihenfolge: Die Karte füllt sich gleichmäßig und zeigt früh ein Gesamtbild.
    const cells: [number, number][] = [];
    for (let j = 0; j < cfg.ny; j++) for (let i = 0; i < cfg.nx; i++) cells.push([i, j]);
    let seed = 7;
    for (let k = cells.length - 1; k > 0; k--) {
      seed = (seed * 16807) % 2147483647;
      const r = seed % (k + 1);
      [cells[k], cells[r]] = [cells[r]!, cells[k]!];
    }
    const count = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));
    let done = 0;
    let finished = 0;
    startTime.current = performance.now();
    setProgress({ done: 0, total, running: true, seconds: 0 });
    for (let w = 0; w < count; w++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<WorkerReply>) => {
        const msg = e.data;
        if (msg.job !== id) return;
        if (msg.type === 'cell') {
          results.current[msg.j * cfg.nx + msg.i] = msg;
          done++;
          dirty.current = true;
        } else if (++finished === count) {
          worker.terminate();
          setProgress({
            done: total,
            total,
            running: false,
            seconds: (performance.now() - startTime.current) / 1000,
          });
          return;
        }
      };
      const share = cells.filter((_, k) => k % count === w);
      const message: RunMessage = { type: 'run', job: id, config: cfg, cells: share };
      worker.postMessage(message);
      workers.current.push(worker);
    }
    const timer = setInterval(() => {
      if (job.current !== id) return clearInterval(timer);
      setProgress((p) => {
        if (!p.running) {
          clearInterval(timer);
          return p;
        }
        return { ...p, done, seconds: (performance.now() - startTime.current) / 1000 };
      });
    }, 200);
  };

  // Beim ersten Anzeigen gleich rechnen – die Seite zeigt so sofort ein Ergebnis.
  useEffect(() => {
    run();
    return stop;
  }, []);

  const applyPreset = (id: string): void => {
    setPresetId(id);
    const cfg = configFromPreset(id, resolution.nx, resolution.ny, Number(years));
    setConfig(cfg);
    run(cfg);
  };

  const updateConfig = (patch: Partial<MapConfig>): void => {
    setConfig((c) => ({ ...c, ...patch }));
  };

  // Zeichnen, sobald neue Ergebnisse da sind.
  useEffect(() => {
    let id = requestAnimationFrame(function frame() {
      if (dirty.current) {
        dirty.current = false;
        draw();
      }
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  });
  useEffect(() => {
    dirty.current = true;
  }, [size.width, colors, mode, hover, selected, config]);

  const height = compact
    ? Math.max(260, size.width * 0.55)
    : Math.max(320, Math.min(size.width * 0.62, 620));

  const scales = (): { x0: number; x1: number; y0: number; y1: number } => ({
    x0: M.left,
    x1: size.width - M.right,
    y0: height - M.bottom,
    y1: M.top,
  });

  function toPx(axis: AxisKey, min: number, max: number, v: number, a: number, b: number): number {
    const def = AXES[axis];
    const t = def.log
      ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min))
      : (v - min) / (max - min);
    return a + t * (b - a);
  }

  function draw(): void {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0) return;
    const ctx = prepareCanvas(canvas, size.width, height);
    if (!ctx) return;
    const c = colors;
    const cfg = config;
    ctx.clearRect(0, 0, size.width, height);
    const { x0, x1, y0, y1 } = scales();
    const cw = (x1 - x0) / cfg.nx;
    const ch = (y0 - y1) / cfg.ny;
    const gap = cw > 9 && ch > 9 ? 1 : 0;
    ctx.fillStyle = c.surface2;
    ctx.fillRect(x0, y1, x1 - x0, y0 - y1);
    results.current.forEach((r, k) => {
      if (!r) return;
      const i = k % cfg.nx;
      const j = Math.floor(k / cfg.nx);
      ctx.fillStyle = cellColor(r, mode, cfg.years, c);
      ctx.fillRect(x0 + i * cw, y0 - (j + 1) * ch, cw - gap, ch - gap);
    });

    // Achsen.
    ctx.strokeStyle = c.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y1 + 0.5, x1 - x0 - 1, y0 - y1 - 1);
    ctx.font = `11px ${c.fontMono}`;
    ctx.fillStyle = c.ink3;
    const xDef = AXES[cfg.x];
    const yDef = AXES[cfg.y];
    const xt = xDef.log
      ? logTicksExtended(cfg.xMin, cfg.xMax)
      : niceTicks(cfg.xMin, cfg.xMax, Math.max(3, Math.floor((x1 - x0) / 90)));
    const yt = yDef.log ? logTicksExtended(cfg.yMin, cfg.yMax) : niceTicks(cfg.yMin, cfg.yMax, 5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of xt) {
      const px = toPx(cfg.x, cfg.xMin, cfg.xMax, t, x0, x1);
      if (px < x0 - 1 || px > x1 + 1) continue;
      ctx.fillText(xDef.format(t), px, y0 + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const t of yt) {
      const py = toPx(cfg.y, cfg.yMin, cfg.yMax, t, y0, y1);
      if (py < y1 - 1 || py > y0 + 1) continue;
      ctx.fillText(yDef.format(t), x0 - 6, py);
    }
    ctx.font = `12px ${c.fontUi}`;
    ctx.fillStyle = c.ink2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(xDef.label, (x0 + x1) / 2, height - 2);
    ctx.save();
    ctx.translate(13, (y0 + y1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText(yDef.label, 0, 0);
    ctx.restore();

    // Theorie-Linien.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y1, x1 - x0, y0 - y1);
    ctx.clip();
    for (const o of theoryOverlays(cfg)) {
      const pts = o.points.map(
        ([x, y]) =>
          [
            toPx(cfg.x, cfg.xMin, cfg.xMax, x, x0, x1),
            toPx(cfg.y, cfg.yMin, cfg.yMax, y, y0, y1),
          ] as const,
      );
      for (const [stroke, w] of [
        [c.surface, 4],
        [c.ink, 1.6],
      ] as const) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = w;
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
      }
      // Beschriftung am ersten sichtbaren Punkt der (verdichteten) Linie.
      const dense: (readonly [number, number])[] = [];
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay] = pts[k]!;
        const [bx, by] = pts[k + 1]!;
        for (let s = 0; s < 20; s++)
          dense.push([ax + ((bx - ax) * s) / 20, ay + ((by - ay) * s) / 20]);
      }
      const vis = dense.find(
        ([x, y]) => x >= x0 + 4 && x <= x1 - 150 && y >= y1 + 22 && y <= y0 - 4,
      );
      if (vis) {
        ctx.font = `11px ${c.fontUi}`;
        const w = ctx.measureText(o.label).width;
        ctx.fillStyle = c.surface;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(vis[0] + 4, vis[1] - 16, w + 8, 15);
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.ink;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(o.label, vis[0] + 8, vis[1] - 3);
      }
    }
    const marker = realMoonMarker(cfg);
    if (marker) {
      const mx = toPx(cfg.x, cfg.xMin, cfg.xMax, marker[0], x0, x1);
      const my = toPx(cfg.y, cfg.yMin, cfg.yMax, marker[1], y0, y1);
      ctx.fillStyle = c.ink;
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `600 11px ${c.fontUi}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = c.surface;
      ctx.fillRect(mx + 9, my - 8, ctx.measureText('heutiger Mond').width + 8, 16);
      ctx.fillStyle = c.ink;
      ctx.fillText('heutiger Mond', mx + 13, my);
    }
    ctx.restore();

    const mark = (cell: { i: number; j: number } | null, color: string): void => {
      if (!cell) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 + cell.i * cw - 1, y0 - (cell.j + 1) * ch - 1, cw + 1, ch + 1);
    };
    mark(hover, c.ink);
    mark(selected, c.accent);
  }

  const cellAt = (e: MouseEvent): { i: number; j: number; px: number; py: number } | null => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { x0, x1, y0, y1 } = scales();
    if (px < x0 || px > x1 || py < y1 || py > y0) return null;
    const i = Math.min(config.nx - 1, Math.floor(((px - x0) / (x1 - x0)) * config.nx));
    const j = Math.min(config.ny - 1, Math.floor(((y0 - py) / (y0 - y1)) * config.ny));
    return { i, j, px, py };
  };

  const describe = (i: number, j: number): { x: number; y: number; r: CellResult | null } => ({
    x: axisValue(AXES[config.x], config.xMin, config.xMax, (i + 0.5) / config.nx),
    y: axisValue(AXES[config.y], config.yMin, config.yMax, (j + 0.5) / config.ny),
    r: results.current[j * config.nx + i] ?? null,
  });

  const exportCsv = (): void => {
    const lines = [
      `# Stabilitätskarte Orbitlabor; ${config.years} Jahre; ${config.retrograde ? 'retrograd' : 'prograd'}`,
      [
        AXES[config.x].label,
        AXES[config.y].label,
        'Ergebnis',
        'Zeit bis Ereignis (Jahre)',
        'min. Abstand (km)',
        'max. Abstand (km)',
      ].join(';'),
    ];
    for (let j = 0; j < config.ny; j++) {
      for (let i = 0; i < config.nx; i++) {
        const { x, y, r } = describe(i, j);
        if (!r) continue;
        lines.push(
          [x, y, OUTCOME_LABELS[r.outcome], r.time / YEAR, r.minDistance / KM, r.maxDistance / KM]
            .map((v) =>
              typeof v === 'number' ? String(Number(v.toPrecision(6))).replace('.', ',') : v,
            )
            .join(';'),
        );
      }
    }
    downloadText(`stabilitaetskarte-${presetId}.csv`, lines.join('\n'), 'text/csv');
  };

  const counts = useMemo(() => {
    const n = { stable: 0, crash: 0, escape: 0 };
    for (const r of results.current) if (r) n[outcomeClass(r.outcome)]++;
    return n;
  }, [progress.done, progress.running]);

  const hoverInfo = hover ? describe(hover.i, hover.j) : null;
  const selInfo = selected ? describe(selected.i, selected.j) : null;
  const presetMeta = MAP_PRESETS.find((m) => m.id === presetId);
  const axisOptions = (Object.keys(AXES) as AxisKey[]).map((k) => ({
    value: k,
    label: AXES[k].label,
  }));

  return (
    <div class="stack" style={{ gap: '14px' }}>
      <div class="toolbar">
        <div style={{ minWidth: 'min(100%, 300px)', flex: '1' }}>
          <Select
            id={`map-preset-${compact ? 'c' : 'f'}`}
            label="Karte"
            value={presetId}
            options={MAP_PRESETS.map((m) => ({ value: m.id, label: m.title }))}
            onChange={applyPreset}
          />
        </div>
        <div class="btn-row" style={{ alignSelf: 'end' }}>
          {progress.running ? (
            <button type="button" class="btn" onClick={stop}>
              <Icon name="pause" filled /> Anhalten
            </button>
          ) : (
            <button type="button" class="btn primary" onClick={() => run()}>
              <Icon name="play" filled /> Neu berechnen
            </button>
          )}
          <Segmented
            label="Farbe"
            value={mode}
            options={[
              { value: 'outcome', label: 'Ergebnis' },
              { value: 'time', label: 'Lebensdauer' },
            ]}
            onChange={setMode}
          />
        </div>
      </div>
      {presetMeta && <p class="small muted">{presetMeta.description}</p>}

      {!compact && (
        <details class="section">
          <summary>Achsen und Rechenparameter</summary>
          <div class="section-body">
            <div class="grid-2">
              <Select
                id="map-x"
                label="x-Achse"
                value={config.x}
                options={axisOptions}
                onChange={(x: AxisKey) => updateConfig({ x, xMin: AXES[x].min, xMax: AXES[x].max })}
              />
              <Select
                id="map-y"
                label="y-Achse"
                value={config.y}
                options={axisOptions}
                onChange={(y: AxisKey) => updateConfig({ y, yMin: AXES[y].min, yMax: AXES[y].max })}
              />
              <RangeInputs
                axis={config.x}
                min={config.xMin}
                max={config.xMax}
                onChange={(xMin, xMax) => updateConfig({ xMin, xMax })}
              />
              <RangeInputs
                axis={config.y}
                min={config.yMin}
                max={config.yMax}
                onChange={(yMin, yMax) => updateConfig({ yMin, yMax })}
              />
            </div>
            <div class="row">
              <span class="small muted">Auflösung</span>
              <Segmented
                label="Auflösung"
                value={res}
                options={RESOLUTIONS.map((r) => ({ value: r.value, label: r.label }))}
                onChange={(v) => {
                  setRes(v);
                  const r = RESOLUTIONS.find((x) => x.value === v)!;
                  updateConfig({ nx: r.nx, ny: r.ny });
                }}
              />
            </div>
            <div class="row">
              <span class="small muted">Simulationsdauer je Zelle</span>
              <Segmented
                label="Simulationsdauer"
                value={years}
                options={YEARS.map((y) => ({ value: y, label: `${y} J.` }))}
                onChange={(v) => {
                  setYears(v);
                  updateConfig({ years: Number(v) });
                }}
              />
            </div>
            <Toggle
              id="map-retro"
              label="Mond rückläufig (retrograd)"
              checked={config.retrograde}
              onChange={(retrograde) => updateConfig({ retrograde })}
            />
            <Toggle
              id="map-roche"
              label="Roche-Grenze zählt als Zerstörung"
              checked={config.roche}
              onChange={(roche) => updateConfig({ roche })}
            />
            <p class="small muted">
              Änderungen gelten nach „Neu berechnen“. Jede Zelle ist eine eigene Simulation mit
              Velocity-Verlet und adaptiver Schrittweite.
            </p>
          </div>
        </details>
      )}

      <div class="chart-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ height: `${height}px`, cursor: 'crosshair' }}
          role="img"
          aria-label={`Stabilitätskarte: ${AXES[config.y].label} über ${AXES[config.x].label}`}
          onPointerMove={(e) => setHover(cellAt(e))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const cell = cellAt(e);
            if (cell) setSelected({ i: cell.i, j: cell.j });
          }}
        />
        {hover && hoverInfo && (
          <div
            class="tooltip"
            style={{
              left: `${Math.min(hover.px + 14, size.width - 210)}px`,
              top: `${Math.max(hover.py - 90, 0)}px`,
            }}
          >
            <div class="tooltip-head">
              {AXES[config.x].short} = {AXES[config.x].format(hoverInfo.x)} · {AXES[config.y].short}{' '}
              = {AXES[config.y].format(hoverInfo.y)}
            </div>
            {hoverInfo.r ? (
              <>
                <div class="tooltip-row">
                  <strong>{OUTCOME_LABELS[hoverInfo.r.outcome]}</strong>
                </div>
                {hoverInfo.r.outcome !== 'stable' && (
                  <div class="tooltip-row">nach {duration(hoverInfo.r.time)}</div>
                )}
                <div class="tooltip-row muted">Klicken für Details</div>
              </>
            ) : (
              <div class="tooltip-row muted">noch nicht berechnet</div>
            )}
          </div>
        )}
      </div>

      <div class="row" style={{ justifyContent: 'space-between' }}>
        <div class="legend">
          {mode === 'outcome' ? (
            <>
              <span class="legend-item">
                <span class="legend-swatch" style={{ background: 'var(--series-3)' }} />
                stabil ({counts.stable})
              </span>
              <span class="legend-item">
                <span class="legend-swatch" style={{ background: 'var(--series-2)' }} />
                Absturz / zerrissen ({counts.crash})
              </span>
              <span class="legend-item">
                <span class="legend-swatch" style={{ background: 'var(--series-1)' }} />
                entkommen ({counts.escape})
              </span>
            </>
          ) : (
            <span class="legend-item">
              Zeit bis zum Ereignis: hell = sofort, dunkel = lange; ganz dunkel = {config.years}{' '}
              Jahre stabil
            </span>
          )}
          <span class="legend-item">
            <span class="legend-key" style={{ background: 'var(--ink)' }} />
            Theorie
          </span>
        </div>
        <div class="btn-row">
          <span class="small muted">
            {progress.running
              ? `${fmt(progress.done)} / ${fmt(progress.total)} Simulationen · ${fmt(progress.seconds, 0)} s`
              : progress.total > 0
                ? `${fmt(progress.total)} Simulationen in ${fmt(progress.seconds, 1)} s`
                : ''}
          </span>
          <button type="button" class="btn small" onClick={exportCsv} disabled={progress.running}>
            <Icon name="download" /> {FILE_EXPORT ? 'CSV' : 'CSV kopieren'}
          </button>
          {FILE_EXPORT && (
            <button
              type="button"
              class="btn small"
              onClick={() =>
                canvasRef.current &&
                downloadCanvas(canvasRef.current, `stabilitaetskarte-${presetId}.png`)
              }
            >
              <Icon name="camera" /> Bild
            </button>
          )}
        </div>
      </div>
      {progress.running && (
        <div
          style={{
            height: '4px',
            background: 'var(--surface-3)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemax={progress.total}
        >
          <div
            style={{
              height: '100%',
              width: `${(progress.done / Math.max(1, progress.total)) * 100}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
      )}

      {selected && selInfo && (
        <div class="panel panel-pad">
          <div class="panel-title">
            <h3>
              {AXES[config.x].short} = {AXES[config.x].format(selInfo.x)}, {AXES[config.y].short} ={' '}
              {AXES[config.y].format(selInfo.y)}
            </h3>
            <button
              type="button"
              class="btn small primary"
              onClick={() =>
                openInSimulator(
                  cellParams(config, selected.i, selected.j),
                  'Aus der Stabilitätskarte',
                )
              }
            >
              Im Simulator ansehen <Icon name="arrow" />
            </button>
          </div>
          {selInfo.r ? (
            <dl class="kv">
              <dt>Ergebnis</dt>
              <dd>{OUTCOME_LABELS[selInfo.r.outcome]}</dd>
              <dt>Zeit</dt>
              <dd>
                {selInfo.r.outcome === 'stable'
                  ? `${config.years} Jahre überstanden`
                  : `nach ${duration(selInfo.r.time)}`}
              </dd>
              <dt>Kleinster / größter Abstand</dt>
              <dd>
                {fmt(selInfo.r.minDistance / KM)} / {fmt(selInfo.r.maxDistance / KM)} km
              </dd>
            </dl>
          ) : (
            <p class="small muted">Diese Zelle ist noch nicht berechnet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function logTicksExtended(min: number, max: number): number[] {
  const ticks = logTicks(min, max);
  if (ticks.length >= 3) return ticks;
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}

function RangeInputs({
  axis,
  min,
  max,
  onChange,
}: {
  axis: AxisKey;
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const def = AXES[axis];
  const lo = def.log ? def.min / 10 : def.min - (def.max - def.min);
  const hi = def.log ? def.max * 10 : def.max + (def.max - def.min);
  return (
    <div class="grid-2" style={{ gap: '10px' }}>
      <Slider
        id={`${axis}-min`}
        label={`${def.short} von`}
        value={min}
        min={Math.max(lo, def.log ? 1e-3 : -Infinity)}
        max={hi}
        log={def.log}
        format={def.format}
        onChange={(v) => onChange(Math.min(v, max * 0.99), max)}
      />
      <Slider
        id={`${axis}-max`}
        label="bis"
        value={max}
        min={Math.max(lo, def.log ? 1e-3 : -Infinity)}
        max={hi}
        log={def.log}
        format={def.format}
        onChange={(v) => onChange(min, Math.max(v, min * 1.01 + 1e-9))}
      />
    </div>
  );
}
