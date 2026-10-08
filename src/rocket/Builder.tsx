import { Fragment, type ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { progressStore } from '../missions/progress';
import { Tex } from '../ui/content';
import { fmt } from '../ui/format';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Icon, type IconName } from '../ui/Icon';
import { CHALLENGES, type Challenge, type ChallengeGroup } from './challenges';
import { PAINTS, drawPart, drawRocket, entryWidth, setPaint, visualWidth } from './draw';
import {
  START_GROUPS,
  START_OPTIONS,
  THRUST_FACTORS,
  buildRules,
  type SandboxSettings,
  type StartId,
} from './sandbox';
import { apsides, type Satellite } from './flight';
import { km } from './format';
import { GOALS, GOAL_GROUPS, RANKS, STAR_POINTS, careerPoints, rankFor } from './goals';
import {
  PART_CATEGORIES,
  TEMPLATES,
  checkDesign,
  designHeight,
  part,
  boosterPod,
  ispAt,
  segments,
  stageStats,
  totalDeltaV,
  totalMass,
  isPart,
  copies,
  sideEntry,
  sideMountable,
  sideOf,
  stackHeight,
  unlocked,
  type BuildRules,
  type Design,
  type PartDef,
} from './parts';
import type { Tab } from './RocketGame';
import { G0, bodyById } from './world';

/** Grobe Δv-Bedarfe im Spiel (aus Testflügen mit Hilfe-Pilot und Bordcomputer). */
const MILESTONES = [
  { dv: 2500, label: 'Weltraum' },
  { dv: 3900, label: 'Umlaufbahn' },
  { dv: 4400, label: 'Raumstation' },
  { dv: 5700, label: 'Mondlandung' },
  { dv: 6900, label: 'Mond hin & zurück' },
  { dv: 7000, label: 'Ceres-Landung' },
  { dv: 7800, label: 'Marslandung' },
  { dv: 9500, label: 'Europa- oder Ganymed-Landung' },
  { dv: 10_500, label: 'Merkurlandung' },
  { dv: 10_800, label: 'Mars: landen & zurück' },
];

function PartIcon({ def }: { def: PartDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = prepareCanvas(c, 44, 44);
    if (!ctx) return;
    ctx.clearRect(0, 0, 44, 44);
    // Landebeine und Booster ragen nach unten über ihr Bauteil hinaus.
    const below =
      def.kind === 'legs' ? 1.6 : def.kind === 'booster' ? 5.5 : def.kind === 'shield' ? 0.35 : 0;
    const extra = def.kind === 'booster' ? boosterPod(def).rise + 0.4 : 0;
    const h = def.height + below + extra;
    const wide = visualWidth(def);
    const s = Math.min(36 / Math.max(wide, 0.5), 36 / h);
    ctx.save();
    ctx.translate(22, 22 + (h * s) / 2 - below * s);
    ctx.scale(s, -s);
    drawPart(ctx, def, 0, -below + (def.kind === 'legs' ? 0.2 : 0));
    ctx.restore();
  }, [def]);
  return (
    <canvas
      aria-hidden="true"
      ref={ref}
      class="part-icon"
      style={{ width: '44px', height: '44px' }}
    />
  );
}

/** Ende des Blocks ab Index i: ein Teil im Stapel samt der Seitenteile direkt dahinter. */
function blockEnd(d: Design, i: number): number {
  if (sideOf(d[i]!) > 0) return i + 1;
  let j = i + 1;
  while (j < d.length && sideOf(d[j]!) > 0) j++;
  return j;
}

/** Nächstes Teil im Stapel vor Index i (−1: keins). */
function coreBefore(d: Design, i: number): number {
  let k = i - 1;
  while (k >= 0 && sideOf(d[k]!) > 0) k--;
  return k;
}

/** Einfügestelle beim Ziehen: Index in der Liste und seitlicher Abstand (0: in den Stapel). */
interface Drop {
  at: number;
  side: number;
}

/** Abfragen an den Bauplan während des Ziehens (Bildschirmkoordinaten). */
interface PreviewApi {
  /** Wohin das Teil `id` unter dem Zeiger käme; null außerhalb des Bauplans. */
  dropAt: (x: number, y: number, id: string, sideAllowed: boolean) => Drop | null;
}

/** Lage eines Eintrags (m): Unterkante, Oberkante und seitlicher Abstand (0: im Stapel). */
interface Place {
  y0: number;
  y1: number;
  side: number;
}

function places(design: Design): Place[] {
  const out: Place[] = [];
  let y = 0;
  for (let i = design.length - 1; i >= 0; i--) {
    const e = design[i]!;
    out[i] = { y0: y, y1: y + part(e).height, side: sideOf(e) };
    y += stackHeight(e);
  }
  return out;
}

/** Abstand der Maßlinien: so, dass die Beschriftungen mindestens 40 px auseinander liegen. */
function labelStep(scale: number): number {
  return [1, 2, 5, 10, 20, 50, 100, 200, 500].find((s) => s * scale >= 40) ?? 1000;
}

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 8;

function Preview({
  design,
  selected,
  onSelect,
  onPress,
  drop,
  api,
  rules,
}: {
  design: Design;
  selected: number;
  onSelect: (i: number) => void;
  /** Zeiger auf einem Teil gedrückt (Beginn eines möglichen Ziehens). */
  onPress: (i: number, e: PointerEvent) => void;
  /** Beim Ziehen: Einfügestelle und gezogenes Teil. */
  drop: (Drop & { id: string }) | null;
  api: { current: PreviewApi | null };
  rules?: BuildRules;
}) {
  const [box, size] = useElementSize<HTMLDivElement>();
  const canvas = useRef<HTMLCanvasElement>(null);
  // Ansicht: Zoom relativ zur eingepassten Größe und Verschiebung in Pixeln.
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const layout = useRef({ scale: 1, base: 0, cx: 0, fit: 1, baseFit: 0, at: [] as Place[] });

  useEffect(() => {
    const c = canvas.current;
    const { width, height } = size;
    if (!c || width === 0) return;
    const ctx = prepareCanvas(c, width, height);
    if (!ctx) return;
    const at = places(design);
    const total = Math.max(designHeight(design), 8);
    const widest = Math.max(4, ...design.map(entryWidth));
    // Mit gewähltem Teil steht unten die Werkzeugleiste: dann die Rakete darüber zeichnen.
    const baseFit = height - (selected >= 0 ? 92 : 44);
    // Oben bleibt Platz für die Werkzeugleiste (auf dem Handy auch für die Datenzeile).
    const topPad = width < 520 ? 124 : 70;
    const fit = Math.min((baseFit - topPad) / (total + 1), (width - 80) / (widest + 2), 30);
    const scale = fit * view.zoom;
    const cx = width / 2 + view.x;
    const base = baseFit + view.y;
    layout.current = { scale, base, cx, fit, baseFit, at };
    ctx.clearRect(0, 0, width, height);

    // Blaupause: feines Raster je Meter (wenn groß genug), kräftige Linien mit Maßangabe
    const step = labelStep(scale);
    const lines = (every: number, color: string): void => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (let k = Math.ceil(-cx / scale / every); k * every * scale < width - cx; k++) {
        const x = Math.round(cx + k * every * scale) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, Math.min(height, base));
      }
      for (let m = every; base - m * scale > 0; m += every) {
        if (base - m * scale > height) continue;
        const y = Math.round(base - m * scale) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    };
    ctx.lineWidth = 1;
    if (scale >= 7 && step > 1) lines(1, 'rgba(150,190,255,0.07)');
    lines(step, 'rgba(150,190,255,0.16)');
    ctx.fillStyle = 'rgba(190,210,245,0.55)';
    ctx.font = '500 11px Jost, system-ui, sans-serif';
    ctx.textAlign = 'right';
    for (let m = step; base - m * scale > 14; m += step)
      if (base - m * scale < height) ctx.fillText(`${m} m`, width - 52, base - m * scale - 4);
    ctx.textAlign = 'left';

    // Startplattform
    const pw = Math.max(160, (widest + 1.5) * scale);
    ctx.fillStyle = '#2a3346';
    ctx.fillRect(cx - pw / 2, base, pw, 7);
    ctx.fillStyle = '#1b2233';
    ctx.fillRect(cx - pw / 2 + 16, base + 7, pw - 32, 5);
    ctx.fillStyle = 'rgba(226,168,70,0.9)';
    for (let x = cx - pw / 2 + 4; x < cx + pw / 2 - 4; x += 16) ctx.fillRect(x, base + 1, 8, 2);

    ctx.save();
    ctx.translate(cx, base);
    ctx.scale(scale, -scale);
    drawRocket(ctx, design);
    ctx.restore();

    // Stufen wie in Spaceflight Simulator am Bauplan markieren: Klammer, Nummer, Δv
    const segs = segments(design);
    if (segs.length > 1) {
      const st = stageStats(design, rules);
      const bx = Math.round(cx - (widest / 2) * scale - 20) + 0.5;
      let idx = 0;
      ctx.font = '600 11px Jost, system-ui, sans-serif';
      segs.forEach((seg, k) => {
        const span = at.slice(idx, idx + seg.length);
        idx += seg.length;
        const y0 = base - Math.max(...span.map((p) => p.y1)) * scale + 3;
        const y1 = base - Math.min(...span.map((p) => p.y0)) * scale - 3;
        const number = segs.length - k;
        const mid = (y0 + y1) / 2;
        ctx.strokeStyle = 'rgba(226,168,70,0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 6, y0);
        ctx.lineTo(bx, y0);
        ctx.lineTo(bx, y1);
        ctx.lineTo(bx + 6, y1);
        ctx.stroke();
        ctx.fillStyle = '#e2a846';
        ctx.beginPath();
        ctx.arc(bx - 11, mid, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1305';
        ctx.textAlign = 'center';
        ctx.fillText(String(number), bx - 11, mid + 4);
        const dv = st[number - 1]?.deltaV ?? 0;
        if (dv > 0 && Number.isFinite(dv) && y1 - y0 > 26) {
          const text = `${fmt(dv)} m/s`;
          ctx.textAlign = 'right';
          if (bx - 26 - ctx.measureText(text).width > 6) {
            ctx.fillStyle = 'rgba(200,215,245,0.75)';
            ctx.fillText(text, bx - 26, mid + 4);
          }
        }
      });
      ctx.textAlign = 'left';
    }

    /** Sucher-Ecken um ein Rechteck (Pixel). */
    const finder = (x0: number, y0: number, bw: number, bh: number): void => {
      ctx.fillStyle = 'rgba(226,168,70,0.12)';
      ctx.fillRect(x0, y0, bw, bh);
      ctx.strokeStyle = '#e2a846';
      ctx.lineWidth = 2;
      const k = Math.min(10, bw / 3, bh / 3);
      ctx.beginPath();
      for (const [px, py, dx, dy] of [
        [x0, y0, 1, 1],
        [x0 + bw, y0, -1, 1],
        [x0, y0 + bh, 1, -1],
        [x0 + bw, y0 + bh, -1, -1],
      ] as const) {
        ctx.moveTo(px + dx * k, py);
        ctx.lineTo(px, py);
        ctx.lineTo(px, py + dy * k);
      }
      ctx.stroke();
    };
    /** Rahmen um ein Teil, bei Seitenteilen um beide Hälften des Paars. */
    const outline = (
      side: number,
      w: number,
      y0: number,
      y1: number,
      draw: typeof finder,
    ): void => {
      for (const x of side > 0 ? [-side, side] : [0])
        draw(
          cx + (x - w / 2) * scale - 6,
          base - y1 * scale - 4,
          w * scale + 12,
          (y1 - y0) * scale + 8,
        );
    };

    if (drop && drop.side > 0) {
      // Seitlich: gestrichelte Umrisse, wo das Paar hinkommt
      const parent = at[drop.at - 1];
      const def = part(drop.id);
      const y0 = parent?.y0 ?? 0;
      ctx.setLineDash([5, 4]);
      outline(drop.side, def.width, y0, y0 + def.height, (x, y, w, h) => {
        ctx.strokeStyle = '#e2a846';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, y + 4, w - 12, h - 8);
      });
      ctx.setLineDash([]);
      ctx.fillStyle = '#e2a846';
      ctx.font = '600 12px Jost, system-ui, sans-serif';
      ctx.fillText(
        `${def.name} · Paar, ${fmt(drop.side, 1)} m seitlich`,
        cx + (drop.side + def.width / 2) * scale + 10,
        base - (y0 + def.height / 2) * scale + 4,
      );
    } else if (drop) {
      // In den Stapel: gestrichelte Linie an der Fuge
      const hb = drop.at < design.length ? at[drop.at]!.y1 : 0;
      const y = Math.round(base - hb * scale) + 0.5;
      const half = Math.max(36, (Math.max(widest, visualWidth(part(drop.id))) / 2 + 0.8) * scale);
      ctx.strokeStyle = '#e2a846';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e2a846';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * half, y);
        ctx.lineTo(cx + s * (half + 8), y - 5);
        ctx.lineTo(cx + s * (half + 8), y + 5);
        ctx.fill();
      }
      ctx.font = '600 12px Jost, system-ui, sans-serif';
      ctx.fillText(part(drop.id).name, cx + half + 14, y + 4);
    } else if (selected >= 0 && at[selected]) {
      const p = at[selected];
      outline(p.side, visualWidth(part(design[selected]!)), p.y0, p.y1, finder);
    }
    if (design.length === 0) {
      ctx.fillStyle = 'rgba(223,229,245,0.75)';
      ctx.textAlign = 'center';
      ctx.font = '500 16px Jost, system-ui, sans-serif';
      ctx.fillText('Wähle ein Bauteil aus der Liste –', width / 2, height / 2 - 12);
      ctx.fillText('oder oben eine Vorlage.', width / 2, height / 2 + 12);
    }
  }, [
    design,
    selected,
    size,
    view,
    rules?.thrust,
    rules?.infiniteFuel,
    drop?.at,
    drop?.side,
    drop?.id,
  ]);

  /** Zeiger in Bauplan-Metern: Höhe über der Rampe und Abstand zur Achse (mit Vorzeichen). */
  const toMeters = (x: number, y: number): { m: number; dx: number } | null => {
    const c = canvas.current;
    if (!c) return null;
    const r = c.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
    const { scale, base, cx } = layout.current;
    return { m: (base - (y - r.top)) / scale, dx: (x - r.left - cx) / scale };
  };

  /** Teil unter dem Zeiger (−1: keins); Seitenteile zuerst, sie liegen außen. */
  const partAt = (x: number, y: number): number => {
    const q = toMeters(x, y);
    if (!q) return -1;
    const { at } = layout.current;
    const adx = Math.abs(q.dx);
    const inside = (i: number, p: Place): boolean =>
      q.m >= p.y0 && q.m <= p.y1 && Boolean(design[i]);
    for (let i = 0; i < at.length; i++) {
      const p = at[i];
      if (
        p &&
        p.side > 0 &&
        inside(i, p) &&
        Math.abs(adx - p.side) <= visualWidth(part(design[i]!)) / 2 + 0.3
      )
        return i;
    }
    return at.findIndex(
      (p, i) => p && p.side === 0 && inside(i, p) && adx <= visualWidth(part(design[i]!)) / 2 + 1.5,
    );
  };

  api.current = {
    dropAt: (x, y, id, sideAllowed) => {
      const q = toMeters(x, y);
      if (!q) return null;
      const { at } = layout.current;
      const def = part(id);
      // Seitlich an ein Teil im Stapel, wenn der Zeiger neben dessen Rand steht
      const host = at.findIndex(
        (p, i) => p && p.side === 0 && q.m >= p.y0 && q.m <= p.y1 && Boolean(design[i]),
      );
      if (sideAllowed && host >= 0 && sideMountable(def)) {
        const rim = part(design[host]!).width / 2;
        const adx = Math.abs(q.dx);
        if (adx > rim + 0.3) {
          const side = Math.max(rim + def.width / 2, adx);
          return { at: host + 1, side: Math.round(side * 10) / 10 };
        }
      }
      // Sonst in den Stapel: nächste Fuge über einem Teil oder ganz unten
      let best = design.length;
      let gap = Math.abs(q.m);
      at.forEach((p, k) => {
        if (p && p.side === 0 && Math.abs(q.m - p.y1) < gap) {
          gap = Math.abs(q.m - p.y1);
          best = k;
        }
      });
      return { at: best, side: 0 };
    },
  };

  // Verschieben (Ziehen auf freier Fläche, zwei Finger) und Zoomen (Mausrad, Zwei-Finger-Geste)
  const zoomAt = (px: number, py: number, factor: number): void => {
    setView((v) => {
      const { scale, base, cx, fit, baseFit } = layout.current;
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.zoom * factor));
      const k = (fit * zoom) / scale;
      // Der Punkt unter dem Zeiger bleibt stehen.
      const ncx = px - (px - cx) * k;
      const nbase = py + (base - py) * k;
      return { zoom, x: ncx - size.width / 2, y: nbase - baseFit };
    });
  };
  const fitView = (): void => setView({ zoom: 1, x: 0, y: 0 });
  const panned = useRef(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const wheel = (e: WheelEvent): void => {
      e.preventDefault();
      const r = c.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    c.addEventListener('wheel', wheel, { passive: false });
    return () => c.removeEventListener('wheel', wheel);
  });
  const down = (e: PointerEvent): void => {
    const hit = partAt(e.clientX, e.clientY);
    if (hit >= 0 && pointers.current.size === 0) {
      onPress(hit, e);
      return;
    }
    const c = canvas.current;
    if (!c) return;
    c.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    panned.current = false;
  };
  const moveView = (e: PointerEvent): void => {
    const ps = pointers.current;
    const last = ps.get(e.pointerId);
    if (!last) return;
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    if (ps.size >= 2) {
      // Zwei Finger: Abstand ändert den Zoom, Mittelpunkt verschiebt
      const [a, b] = [...ps.values()];
      const before = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a2, b2] = [...ps.values()];
      const after = Math.hypot(a2!.x - b2!.x, a2!.y - b2!.y);
      if (before > 0)
        zoomAt((a2!.x + b2!.x) / 2 - r.left, (a2!.y + b2!.y) / 2 - r.top, after / before);
      panned.current = true;
      return;
    }
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if (!panned.current && Math.hypot(dx, dy) < 4) return;
    panned.current = true;
    ps.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const up = (e: PointerEvent): void => {
    pointers.current.delete(e.pointerId);
  };

  return (
    <div class="blueprint-canvas" ref={box}>
      <canvas
        ref={canvas}
        onClick={(e) => {
          if (panned.current) panned.current = false;
          else onSelect(partAt(e.clientX, e.clientY));
        }}
        onDblClick={(e) => {
          if (partAt(e.clientX, e.clientY) < 0) fitView();
        }}
        onPointerDown={down}
        onPointerMove={moveView}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label="Bauplan der Rakete; Klick wählt ein Teil, Ziehen auf freier Fläche verschiebt, Mausrad zoomt"
      />
      <div class="blueprint-zoom" role="group" aria-label="Bauplan zoomen">
        <button
          type="button"
          class="gbtn icon small"
          onClick={() => zoomAt(size.width / 2, size.height / 2, 1.4)}
          aria-label="Näher"
          title="Näher (Mausrad)"
        >
          <Icon name="plus" />
        </button>
        <button
          type="button"
          class="gbtn icon small"
          onClick={() => zoomAt(size.width / 2, size.height / 2, 1 / 1.4)}
          aria-label="Weiter weg"
          title="Weiter weg (Mausrad)"
        >
          <Icon name="minus" />
        </button>
        <button
          type="button"
          class="gbtn icon small"
          onClick={fitView}
          disabled={view.zoom === 1 && view.x === 0 && view.y === 0}
          aria-label="Ganze Rakete zeigen"
          title="Ganze Rakete zeigen (Doppelklick auf freie Fläche)"
        >
          <Icon name="expand" />
        </button>
      </div>
    </div>
  );
}

/** Kleines Aufklappmenü in der Werft (schließt bei Klick daneben und mit Esc). */
function Menu({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: (close: () => void) => ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div class="gmenu" ref={ref}>
      <button
        type="button"
        class={`gbtn ${open ? 'on' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={label}
        title={label}
        onClick={() => setOpen(!open)}
      >
        <Icon name={icon} />
        <span class="gbtn-label">{label}</span>
      </button>
      {open && <div class="gmenu-list">{children(() => setOpen(false))}</div>}
    </div>
  );
}

/** Gespeicherte Raketen prüfen: unbekannte Teile oder kaputte Einträge fallen weg. */
function loadHangar(): Record<string, string[]> {
  const raw: unknown = progressStore.load().rocketHangar;
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Record<string, string[]> = {};
  for (const [n, d] of Object.entries(raw as Record<string, unknown>))
    if (Array.isArray(d) && d.length > 0 && d.every((id) => typeof id === 'string' && isPart(id)))
      out[n] = d as string[];
  return out;
}

function spec(p: PartDef): string {
  if (p.thrust > 0) return `${fmt(p.thrust / 1000)} kN · ${p.isp} s`;
  if (p.fuel > 0) return `${fmt(p.fuel / 1000, 1)} t Treibstoff`;
  return `${fmt(p.dry / 1000, p.dry < 100 ? 2 : 1)} t`;
}

/** Name auf der Kachel: In der Gruppe „Antrieb“ ist „Triebwerk“ doppelt. */
const tileName = (p: PartDef): string => p.name.replace(/^(Vakuum)?triebwerk /i, '');

const kN = (n: number): string => `${fmt(n / 1000, n < 10_000 ? 1 : 0)} kN`;

/** Kennwerte für die Leiste des markierten Teils: Schub und Isp am Boden und im Vakuum, Verbrauch. */
function figures(p: PartDef): string {
  const tons = (kg: number): string => `${fmt(kg / 1000, kg < 1000 ? 2 : 1)} t`;
  if (p.thrust > 0) {
    const flow = p.thrust / (p.isp * G0);
    const fuel = p.fuel > 0 ? ` · ${tons(p.fuel)} Treibstoff` : '';
    return `Schub ${kN(flow * G0 * ispAt(p, 1))} / ${kN(p.thrust)} · Isp ${fmt(ispAt(p, 1))} / ${p.isp} s (Boden / Vakuum) · ${fmt(flow, 1)} kg/s · leer ${tons(p.dry)}${fuel}`;
  }
  if (p.fuel > 0)
    return `${tons(p.fuel)} Treibstoff · leer ${tons(p.dry)} · Ø ${fmt(p.width, 1)} m`;
  return `${tons(p.dry)} · Ø ${fmt(p.width, 1)} m`;
}

export function Builder({
  tab,
  onTab,
  design,
  goals,
  stars,
  satellites,
  onSatellites,
  paint,
  onPaint,
  onChange,
  onLaunch,
  onChallenge,
  sandbox,
  onSandbox,
  sandboxSettings,
  onSandboxSettings,
  onClose,
  onResetCareer,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  design: Design;
  goals: readonly string[];
  stars: Record<string, number>;
  satellites: Satellite[];
  onSatellites: (s: Satellite[]) => void;
  paint: string;
  onPaint: (id: string) => void;
  onChange: (d: Design) => void;
  onLaunch: () => void;
  onChallenge: (c: Challenge) => void;
  sandbox: boolean;
  onSandbox: (on: boolean) => void;
  sandboxSettings: SandboxSettings;
  onSandboxSettings: (s: SandboxSettings) => void;
  onClose: () => void;
  onResetCareer: () => void;
}) {
  setPaint(paint);
  const points = careerPoints(goals, stars);
  const starSum = Object.values(stars).reduce((a, b) => a + b, 0);
  const rank = rankFor(points);
  const problems = checkDesign(design, sandbox ? buildRules(sandboxSettings) : undefined);
  const lockedParts = design.filter((id) => !unlocked(id, points, sandbox));
  const canLaunch = !problems.some((p) => p.level === 'error') && lockedParts.length === 0;
  const TABS: { id: Tab; label: string; icon: IconName; meta?: string }[] = [
    { id: 'werft', label: 'Werft', icon: 'wrench' },
    {
      id: 'herausforderungen',
      label: 'Herausforderungen',
      icon: 'trophy',
      meta: `${starSum}/${CHALLENGES.length * 3}`,
    },
    { id: 'karriere', label: 'Karriere', icon: 'medal', meta: rank.title },
  ];
  return (
    <div class="build">
      <header class="game-bar">
        <button
          type="button"
          class="gbtn icon"
          onClick={onClose}
          aria-label="Spiel verlassen"
          title="Spiel verlassen"
        >
          <Icon name="close" />
        </button>
        <div class="game-tabs" role="tablist" aria-label="Bereiche der Raketenwerft">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              class={tab === t.id ? 'on' : ''}
              onClick={() => onTab(t.id)}
              aria-label={t.meta ? `${t.label} (${t.meta})` : t.label}
              title={t.label}
            >
              <Icon name={t.icon} />
              <span class="gbtn-label">{t.label}</span>
              {t.meta && <span class="tab-meta">{t.meta}</span>}
            </button>
          ))}
        </div>
        <div class="game-bar-end">
          {tab === 'werft' && (
            <button
              type="button"
              class="gbtn launch"
              disabled={!canLaunch}
              onClick={onLaunch}
              title={canLaunch ? 'Zur Startrampe' : 'Erst die Hinweise rechts beheben'}
            >
              <Icon name="rocket" />
              <span>Starten</span>
            </button>
          )}
        </div>
      </header>
      {tab === 'werft' ? (
        <Werft
          design={design}
          points={points}
          problems={problems}
          lockedParts={lockedParts}
          onChange={onChange}
          sandbox={sandbox}
          onSandbox={onSandbox}
          settings={sandboxSettings}
          onSettings={onSandboxSettings}
        />
      ) : (
        <div class="game-page">
          <div class="game-page-inner">
            {tab === 'herausforderungen' ? (
              <ChallengeList stars={stars} onStart={onChallenge} />
            ) : (
              <MissionControl
                goals={goals}
                stars={stars}
                paint={paint}
                onPaint={onPaint}
                satellites={satellites}
                onSatellites={onSatellites}
                sandbox={sandbox}
                onReset={onResetCareer}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Werft({
  design,
  points,
  problems,
  lockedParts,
  onChange,
  sandbox,
  onSandbox,
  settings,
  onSettings,
}: {
  design: Design;
  points: number;
  problems: ReturnType<typeof checkDesign>;
  lockedParts: string[];
  onChange: (d: Design) => void;
  sandbox: boolean;
  onSandbox: (on: boolean) => void;
  settings: SandboxSettings;
  onSettings: (s: SandboxSettings) => void;
}) {
  const [selected, setSelected] = useState(-1);
  const [cat, setCat] = useState(PART_CATEGORIES[0]!.id);
  const [statsOpen, setStatsOpen] = useState(false);
  const [hangar, setHangar] = useState<Record<string, string[]>>(loadHangar);
  const [name, setName] = useState('');
  /** Name, der auf ein zweites Tippen wartet (Überschreiben bzw. Löschen). */
  const [confirmSave, setConfirmSave] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const saveHangar = (next: Record<string, string[]>): boolean => {
    setHangar(next);
    progressStore.update((p) => ({ ...p, rocketHangar: next }));
    return progressStore.lastSaveOk;
  };
  // Rückgängig: die letzten Baustände (Strg+Z oder Knopf).
  const history = useRef<Design[]>([]);
  const commit = (next: Design): void => {
    history.current = [...history.current.slice(-39), design];
    onChange(next);
  };
  const undo = (): void => {
    const prev = history.current.pop();
    if (!prev) return;
    onChange(prev);
    setSelected(-1);
    setLockHint('Rückgängig gemacht.');
  };
  // Im Sandkasten gelten Schubfaktor, Treibstoff-Schalter und Startort auch für die Werte hier.
  const rules = sandbox ? buildRules(settings) : undefined;
  const home = rules?.body ?? bodyById('earth');
  const stats = stageStats(design.length ? design : ['kapsel'], rules);
  const dv = design.length ? totalDeltaV(design, rules) : 0;
  const earthStart = !sandbox || settings.start === 'rampe';
  // Kurz gesagt, wie weit die Rakete kommt (nur für Starts von der Erde mit echtem Treibstoff).
  const reach =
    earthStart && !rules?.infiniteFuel
      ? (MILESTONES.filter((m) => dv >= m.dv).pop()?.label ?? 'kurzer Hüpfer')
      : null;
  const mass = totalMass(design);
  const first = design.length ? stats[0] : undefined;

  const [lockHint, setLockHint] = useState('');
  const add = (entry: string, pos?: number): void => {
    const id = part(entry).id;
    if (!unlocked(id, points, sandbox)) {
      setLockHint(
        `${part(id).name} gibt es ab ${part(id).unlock} Punkten (du hast ${points}). Im Sandkasten kannst du es schon ausprobieren.`,
      );
      return;
    }
    setLockHint('');
    const at = pos ?? (selected >= 0 ? blockEnd(design, selected) : design.length);
    commit([...design.slice(0, at), entry, ...design.slice(at)]);
    setSelected(at);
  };
  const move = (dir: -1 | 1): void => {
    if (selected < 0) return;
    if (sideOf(design[selected]!) > 0) {
      // Seitenteil an das vorige bzw. nächste Teil im Stapel hängen
      const host = coreBefore(design, selected);
      const target = dir < 0 ? coreBefore(design, host) : blockEnd(design, host);
      if (target < 0 || target >= design.length) return;
      const entry = design[selected]!;
      const rest = design.filter((_, i) => i !== selected);
      const t = rest.indexOf(design[target]!, dir < 0 ? 0 : target - 1);
      commit([...rest.slice(0, t + 1), entry, ...rest.slice(t + 1)]);
      setSelected(t + 1);
      return;
    }
    // Teil im Stapel: samt seiner Seitenteile mit dem Nachbarblock tauschen
    const end = blockEnd(design, selected);
    const block = design.slice(selected, end);
    if (dir < 0) {
      const prev = coreBefore(design, selected);
      if (prev < 0) return;
      commit([
        ...design.slice(0, prev),
        ...block,
        ...design.slice(prev, selected),
        ...design.slice(end),
      ]);
      setSelected(prev);
    } else {
      if (end >= design.length) return;
      const nextEnd = blockEnd(design, end);
      const next = design.slice(end, nextEnd);
      commit([...design.slice(0, selected), ...next, ...block, ...design.slice(nextEnd)]);
      setSelected(selected + next.length);
    }
  };
  const remove = (): void => {
    if (selected < 0) return;
    // Mit einem Teil im Stapel gehen auch seine Seitenteile.
    const end = blockEnd(design, selected);
    commit([...design.slice(0, selected), ...design.slice(end)]);
    setSelected(Math.min(selected, design.length - (end - selected) - 1));
  };
  const duplicate = (): void => {
    if (selected < 0) return;
    const e = design[selected]!;
    const side = sideOf(e);
    // Seitenteil: ein weiteres Paar daneben; Teil im Stapel: darunter (ohne Seitenteile)
    if (side > 0) add(sideEntry(part(e).id, side + part(e).width), selected + 1);
    else add(e, blockEnd(design, selected));
  };

  // Ziehen: aus der Teileliste in den Bauplan oder innerhalb der Rakete. Erst ab 8 px Weg wird
  // aus einem Druck ein Ziehen – ein kurzes Tippen bleibt ein Klick.
  const [drag, setDrag] = useState<{
    id: string;
    from: number | null;
    x: number;
    y: number;
    drop: Drop | null;
  } | null>(null);
  const previewApi = useRef<PreviewApi | null>(null);
  const dragEnded = useRef(false);
  // Der Browser entscheidet schon beim Aufsetzen, ob er eine Wischgeste selbst übernimmt; das
  // lässt sich nur mit einem dauerhaft angemeldeten, nicht-passiven Listener verhindern.
  const werft = useRef<HTMLDivElement>(null);
  const touchClaim = useRef<((ev: TouchEvent) => void) | null>(null);
  useEffect(() => {
    const el = werft.current;
    if (!el) return;
    const onMove = (ev: TouchEvent): void => touchClaim.current?.(ev);
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);
  const press = (id: string, from: number | null, e: PointerEvent): void => {
    if (e.button !== 0) return;
    const { pointerId, clientX: x0, clientY: y0 } = e;
    let active = false;
    // Ein Teil im Stapel nimmt seine Seitenteile mit; mit solchen darf es nicht selbst zur Seite.
    const block = from === null ? [id] : design.slice(from, blockEnd(design, from));
    const sideAllowed = block.length === 1;
    // Auf Touch-Geräten scrollt die Teileliste in einer Richtung (CSS touch-action); eine
    // Bewegung quer dazu ist ein Ziehen – dann darf der Browser die Geste nicht übernehmen.
    const scrolls = getComputedStyle(e.currentTarget as Element).touchAction;
    const claim = (ev: TouchEvent): void => {
      const t = ev.touches[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - x0);
      const dy = Math.abs(t.clientY - y0);
      const across = scrolls === 'pan-x' ? dy > dx : scrolls === 'pan-y' ? dx > dy : true;
      if (active || across) ev.preventDefault();
    };
    const where = (ev: PointerEvent): Drop | null =>
      previewApi.current?.dropAt(ev.clientX, ev.clientY, id, sideAllowed) ?? null;
    const stop = (): void => {
      touchClaim.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
    };
    const move = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      if (!active) {
        const dx = Math.abs(ev.clientX - x0);
        const dy = Math.abs(ev.clientY - y0);
        if (Math.hypot(dx, dy) < 8) return;
        // Längs der Scrollrichtung gehört die Geste der Liste.
        const along = scrolls === 'pan-x' ? dx >= dy : scrolls === 'pan-y' ? dy >= dx : false;
        if (ev.pointerType === 'touch' && along) {
          stop();
          return;
        }
      }
      active = true;
      setDrag({ id, from, x: ev.clientX, y: ev.clientY, drop: where(ev) });
    };
    const up = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      stop();
      if (!active) return;
      setDrag(null);
      // Der Klick nach dem Loslassen soll nichts mehr auswählen oder anbauen.
      dragEnded.current = true;
      setTimeout(() => (dragEnded.current = false), 0);
      const drop = where(ev);
      if (drop === null) return;
      const entry = sideEntry(id, drop.side);
      if (from === null) {
        add(entry, drop.at);
        return;
      }
      const rest = [...design.slice(0, from), ...design.slice(from + block.length)];
      commit([...rest.slice(0, drop.at), entry, ...block.slice(1), ...rest.slice(drop.at)]);
      setSelected(drop.at);
    };
    const cancel = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      stop();
      setDrag(null);
    };
    if (e.pointerType === 'touch') touchClaim.current = claim;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };
  const load = (d: readonly string[]): void => {
    commit([...d]);
    setSelected(-1);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT') {
        e.preventDefault();
        undo();
        return;
      }
      const dup = e.key === 'd' || e.key === 'D';
      if (e.key !== 'Delete' && e.key !== 'Backspace' && !dup) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Nur, wenn nichts Bestimmtes den Fokus hat (oder die Bauansicht selbst).
      const el = e.target as HTMLElement | null;
      const free = !el || el === document.body || el.classList.contains('game');
      if (!free && !el.closest('.blueprint')) return;
      if (el?.closest('button, a, input, select, textarea, [role="menu"], .gmenu')) return;
      e.preventDefault();
      if (dup) duplicate();
      else remove();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const maxBar = 12_000;
  const sel = selected >= 0 && design[selected] ? part(design[selected]) : null;
  return (
    <div class={`werft ${drag ? 'dragging' : ''}`} ref={werft}>
      <aside class="parts-panel" aria-label="Bauteile">
        <div class="part-cats" role="tablist" aria-label="Art der Bauteile">
          {PART_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={cat === c.id}
              class={cat === c.id ? 'on' : ''}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div class="part-grid">
          {(PART_CATEGORIES.find((c) => c.id === cat) ?? PART_CATEGORIES[0]!).groups.map(
            (g) =>
              g.parts.length > 0 && (
                <Fragment key={g.label}>
                  <h3 class="part-group">{g.label}</h3>
                  {g.parts.map((p) => {
                    const open = unlocked(p.id, points, sandbox);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        class={`part-tile ${open ? '' : 'locked'}`}
                        onClick={() => {
                          if (!dragEnded.current) add(p.id);
                        }}
                        onPointerDown={(e) => press(p.id, null, e)}
                        title={open ? p.info : `Ab ${p.unlock} Punkten: ${p.info}`}
                      >
                        <PartIcon def={p} />
                        <span class="part-name">{tileName(p)}</span>
                        <span class="part-spec">{open ? spec(p) : `ab ${p.unlock} P.`}</span>
                      </button>
                    );
                  })}
                </Fragment>
              ),
          )}
        </div>
        <p class={`parts-hint ${lockHint ? 'msg' : ''}`} aria-live="polite">
          {lockHint ||
            (sandbox
              ? 'Sandkasten: alle Teile, Vorlagen und Lackierungen frei – dafür keine Punkte.'
              : selected >= 0
                ? 'Neue Teile kommen unter das markierte Teil.'
                : 'Antippen: unten anbauen. Ziehen: an jede Stelle – neben ein Teil gezogen als Paar seitlich.')}
        </p>
      </aside>

      <section class="blueprint" aria-label="Rakete">
        <div class="blueprint-tools">
          <Menu icon="stack" label="Vorlagen">
            {(close) =>
              TEMPLATES.map((t) => {
                const lockedIds = [
                  ...new Set(t.parts.filter((id) => !unlocked(id, points, sandbox))),
                ];
                const stages = segments(t.parts).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    class="gmenu-item"
                    onClick={() => {
                      load(t.parts);
                      close();
                    }}
                  >
                    <strong>
                      {t.name}
                      {lockedIds.length ? ' · gesperrt' : ''}
                    </strong>
                    <span>{t.info}</span>
                    <span class="gmenu-meta">
                      Δv {fmt(totalDeltaV(t.parts))} m/s · {stages}{' '}
                      {stages === 1 ? 'Stufe' : 'Stufen'} · {t.parts.length} Teile
                    </span>
                    {lockedIds.length > 0 && (
                      <span class="gmenu-meta locked">
                        Gesperrt: {lockedIds.map((id) => part(id).name).join(', ')}
                      </span>
                    )}
                  </button>
                );
              })
            }
          </Menu>
          <Menu icon="box" label="Hangar">
            {(close) => (
              <>
                {Object.keys(hangar).length === 0 && (
                  <p class="gmenu-note">Noch keine eigenen Raketen gespeichert.</p>
                )}
                {Object.entries(hangar).map(([n, d]) => (
                  <div key={n} class="gmenu-row">
                    <button
                      type="button"
                      class="gmenu-item"
                      onClick={() => {
                        load(d);
                        setName(n);
                        close();
                      }}
                    >
                      <strong>{n}</strong>
                      <span>{d.length} Teile</span>
                    </button>
                    <button
                      type="button"
                      class={`gbtn small ${confirmDelete === n ? 'danger' : 'icon'}`}
                      aria-label={confirmDelete === n ? `${n} wirklich löschen` : `${n} löschen`}
                      onClick={() => {
                        if (confirmDelete !== n) {
                          setConfirmDelete(n);
                          return;
                        }
                        const next = { ...hangar };
                        delete next[n];
                        setConfirmDelete('');
                        setLockHint(
                          saveHangar(next)
                            ? `„${n}“ aus dem Hangar gelöscht.`
                            : 'Löschen nicht möglich – der Browser erlaubt keinen Speicher.',
                        );
                      }}
                    >
                      <Icon name="trash" />
                      {confirmDelete === n && ' Löschen?'}
                    </button>
                  </div>
                ))}
                <form
                  class="gmenu-save"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const n = name.trim();
                    if (!n || design.length === 0) return;
                    if (hangar[n] && confirmSave !== n) {
                      // Gleicher Name: erst beim zweiten Mal überschreiben.
                      setConfirmSave(n);
                      setLockHint(`„${n}“ gibt es schon – noch einmal tippen überschreibt sie.`);
                      return;
                    }
                    setConfirmSave('');
                    setLockHint(
                      saveHangar({ ...hangar, [n]: [...design] })
                        ? `„${n}“ im Hangar gespeichert.`
                        : 'Speichern nicht möglich – der Browser erlaubt keinen Speicher.',
                    );
                  }}
                >
                  <input
                    type="text"
                    maxLength={24}
                    placeholder="Name der Rakete"
                    aria-label="Name der Rakete"
                    value={name}
                    onInput={(e) => {
                      setName((e.target as HTMLInputElement).value);
                      setConfirmSave('');
                    }}
                  />
                  <button
                    type="submit"
                    class="gbtn primary small"
                    disabled={!name.trim() || design.length === 0}
                  >
                    <Icon name="save" />{' '}
                    {confirmSave && confirmSave === name.trim() ? 'Überschreiben' : 'Speichern'}
                  </button>
                </form>
              </>
            )}
          </Menu>
          <button
            type="button"
            class="gbtn"
            disabled={history.current.length === 0}
            onClick={undo}
            aria-label="Rückgängig"
            title="Rückgängig (Strg+Z)"
          >
            <Icon name="rotl" />
            <span class="gbtn-label">Zurück</span>
          </button>
          <button
            type="button"
            class="gbtn"
            disabled={design.length === 0}
            onClick={() => {
              load([]);
              setLockHint('Rakete abgebaut – „Zurück“ (Strg+Z) holt sie wieder.');
            }}
            aria-label="Ganze Rakete abbauen"
            title="Alle Teile entfernen (mit „Zurück“ rückgängig)"
          >
            <Icon name="close" />
            <span class="gbtn-label">Abbauen</span>
          </button>
          <label
            class={`gtoggle ${sandbox ? 'on' : ''}`}
            title="Sandkasten: alle Teile frei und eigene Regeln (Treibstoff, Schub, Startort) – dafür keine Punkte"
          >
            <input
              type="checkbox"
              checked={sandbox}
              onChange={(e) => onSandbox((e.target as HTMLInputElement).checked)}
            />
            <span class="gtoggle-knob" aria-hidden="true" />
            Sandkasten
          </label>
          {sandbox && (
            <Menu icon="sliders" label="Einstellungen">
              {() => <SandboxPanel settings={settings} onChange={onSettings} />}
            </Menu>
          )}
        </div>

        <Preview
          design={
            drag && drag.from !== null
              ? [...design.slice(0, drag.from), ...design.slice(blockEnd(design, drag.from))]
              : design
          }
          selected={drag ? -1 : selected}
          onSelect={(i) => {
            if (!dragEnded.current) setSelected(i);
          }}
          onPress={(i, e) => press(part(design[i]!).id, i, e)}
          drop={drag?.drop ? { ...drag.drop, id: drag.id } : null}
          api={previewApi}
          rules={rules}
        />

        {sel && (
          <div class="part-toolbar" role="toolbar" aria-label={`Bauteil ${sel.name}`}>
            <div class="part-toolbar-text">
              <strong>
                {sel.name}
                {sideOf(design[selected]!) > 0 &&
                  ` · Paar, ${fmt(sideOf(design[selected]!), 1)} m seitlich`}
              </strong>
              <span>{sel.info}</span>
              <span class="part-figures">{figures(sel)}</span>
            </div>
            <button
              type="button"
              class="gbtn icon"
              onClick={duplicate}
              aria-label="Doppeln"
              title="Doppeln: gleiches Teil darunter (D)"
            >
              <Icon name="copy" />
            </button>
            <button
              type="button"
              class="gbtn icon"
              disabled={selected <= 0}
              onClick={() => move(-1)}
              aria-label="Nach oben"
              title="Nach oben"
            >
              <Icon name="up" />
            </button>
            <button
              type="button"
              class="gbtn icon"
              disabled={selected >= design.length - 1}
              onClick={() => move(1)}
              aria-label="Nach unten"
              title="Nach unten"
            >
              <Icon name="down" />
            </button>
            <button
              type="button"
              class="gbtn icon danger"
              onClick={remove}
              aria-label="Entfernen"
              title="Entfernen (Entf)"
            >
              <Icon name="trash" />
            </button>
          </div>
        )}
      </section>

      <aside class={`stats-panel ${statsOpen ? 'open' : ''}`} aria-label="Daten der Rakete">
        <button
          type="button"
          class="stats-summary"
          aria-expanded={statsOpen}
          onClick={() => setStatsOpen(!statsOpen)}
        >
          <span>
            Δv <strong>{fmt(dv)} m/s</strong>
          </span>
          {reach && (
            <span class="stats-reach" title="So weit reicht das Δv bei einem Start von der Erde">
              → <strong>{reach}</strong>
            </span>
          )}
          <span>
            TWR <strong>{first && first.thrust > 0 ? fmt(first.twrStart, 2) : '–'}</strong>
          </span>
          <span class="stats-mass">
            <strong>{fmt(mass / 1000, 1)} t</strong>
          </span>
          {problems.some((p) => p.level === 'error') && <span class="stats-alert">!</span>}
          <Icon name="chevron" />
        </button>
        <div class="stats-body">
          <div class="dv-big">
            <span>Δv gesamt</span>
            <strong>
              {fmt(dv)} <small>m/s</small>
            </strong>
          </div>
          <div class="dv-bar" aria-hidden="true">
            <div class="dv-fill" style={{ width: `${Math.min(100, (dv / maxBar) * 100)}%` }} />
            {earthStart &&
              MILESTONES.map((m) => (
                <span
                  key={m.label}
                  class={`dv-mark ${dv >= m.dv ? 'ok' : ''}`}
                  style={{ left: `${(m.dv / maxBar) * 100}%` }}
                />
              ))}
          </div>
          {rules?.infiniteFuel ? (
            <p class="small muted">Sandkasten: Der Treibstoff geht nie aus – Δv ohne Grenze.</p>
          ) : earthStart ? (
            <ul class="dv-list">
              {MILESTONES.map((m) => (
                <li key={m.label} class={dv >= m.dv ? 'ok' : ''}>
                  <span aria-hidden="true">{dv >= m.dv ? '✓' : '·'}</span> {m.label}
                  <span class="dv-need">{fmt(m.dv)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p class="small muted">
              Die Richtwerte (Umlaufbahn, Mond …) gelten für einen Start von der Erde.
            </p>
          )}
          <dl class="stat-grid">
            <div>
              <dt>Masse</dt>
              <dd>{fmt(mass / 1000, 1)} t</dd>
            </div>
            <div>
              <dt title={`Schub-Gewichts-Verhältnis beim Start (${home.name})`}>TWR am Start</dt>
              <dd class={first && first.thrust > 0 && first.twrStart < 1 ? 'weak' : ''}>
                {first && first.thrust > 0 ? fmt(first.twrStart, 2) : '–'}
              </dd>
            </div>
            <div>
              <dt>Höhe</dt>
              <dd>{fmt(designHeight(design), 1)} m</dd>
            </div>
            <div>
              <dt>Teile</dt>
              <dd>{design.reduce((n, e) => n + copies(e), 0)}</dd>
            </div>
          </dl>
          {design.length > 0 && stats.length > 1 && (
            <table class="stage-table">
              <thead>
                <tr>
                  <th>Stufe</th>
                  <th>Δv</th>
                  <th title={`Schub-Gewichts-Verhältnis (${home.name})`}>TWR</th>
                  <th>Brenndauer</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.number}>
                    <td>{s.number}</td>
                    <td>{fmt(s.deltaV)}</td>
                    <td class={s.thrust > 0 && s.twrStart < 1 ? 'weak' : ''}>
                      {s.thrust > 0 ? fmt(s.twrStart, 2) : '–'}
                      {home.id === 'earth' && s.thrust > 0 && s.twrMoon >= 1 && s.twrEarth < 1
                        ? ' ☾'
                        : ''}
                    </td>
                    <td>{s.burnTime > 0 ? `${fmt(s.burnTime)} s` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {design.length > 0 &&
            stats.length > 1 &&
            home.id === 'earth' &&
            stats.some((s) => s.thrust > 0 && s.twrMoon >= 1 && s.twrEarth < 1) && (
              <p class="small muted">
                ☾ = zu schwach für die Erde, reicht aber für den Mond (TWR über 1 bei
                Mondschwerkraft).
              </p>
            )}
          {problems.length > 0 && (
            <ul class="build-problems">
              {problems.map((p) => (
                <li key={p.text} class={p.level}>
                  <Icon name={p.level === 'error' ? 'fail' : 'warn'} /> {p.text}
                </li>
              ))}
            </ul>
          )}
          {lockedParts.length > 0 && (
            <p class="build-problems-note">
              Noch gesperrt: {[...new Set(lockedParts)].map((id) => part(id).name).join(', ')}. Mehr
              Punkte sammeln – oder im Sandkasten fliegen.
            </p>
          )}
          <details class="rocket-eq">
            <summary>Woher kommt das Δv?</summary>
            <p>
              Die Raketengleichung von Ziolkowski: Wie viel Geschwindigkeit eine Rakete gewinnt,
              hängt vom Triebwerk (I<sub>sp</sub>) und vom Massenverhältnis ab.
            </p>
            <Tex
              block
            >{String.raw`\Delta v = I_\text{sp}\, g_0 \ln\frac{m_\text{voll}}{m_\text{leer}}`}</Tex>
            <p>
              Weil der Logarithmus langsam wächst, lohnen sich Stufen: Leere Tanks werden
              abgeworfen, und die nächste Stufe beschleunigt weniger Masse.
            </p>
          </details>
        </div>
      </aside>
      {/* Am Ende: davor eingefügt, würde es die Teileliste unter dem Finger neu aufbauen */}
      {drag && (
        <div
          class={`drag-ghost ${drag.drop === null ? 'away' : ''}`}
          style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}
          aria-hidden="true"
        >
          <PartIcon def={part(drag.id)} />
        </div>
      )}
    </div>
  );
}

function Switch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label class={`gswitch ${on ? 'on' : ''}`}>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span class="gswitch-text">
        <strong>{label}</strong>
        <span>{hint}</span>
      </span>
      <span class="gtoggle-knob" aria-hidden="true" />
    </label>
  );
}

/** Regeln und Startort des Sandkastens. */
function SandboxPanel({
  settings,
  onChange,
}: {
  settings: SandboxSettings;
  onChange: (s: SandboxSettings) => void;
}) {
  const set = (patch: Partial<SandboxSettings>): void => onChange({ ...settings, ...patch });
  return (
    <div class="sandbox-panel">
      <label class="sb-field">
        <span>Startort</span>
        <select
          value={settings.start}
          onChange={(e) => set({ start: (e.target as HTMLSelectElement).value as StartId })}
        >
          {START_GROUPS.map((g) => (
            <optgroup key={g} label={g}>
              {START_OPTIONS.filter((o) => o.group === g).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div class="sb-field">
        <span>Schub der Triebwerke</span>
        <div class="sb-seg" role="radiogroup" aria-label="Schubfaktor">
          {THRUST_FACTORS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={settings.thrust === k}
              class={settings.thrust === k ? 'on' : ''}
              onClick={() => set({ thrust: k })}
            >
              {k}×
            </button>
          ))}
        </div>
      </div>
      <Switch
        label="Unendlich Treibstoff"
        hint="Die Tanks werden nie leer."
        on={settings.fuel}
        onChange={(fuel) => set({ fuel })}
      />
      <Switch
        label="Unzerstörbar"
        hint="Kein Absturz, kein Verglühen – jede Berührung ist eine Landung."
        on={settings.indestructible}
        onChange={(indestructible) => set({ indestructible })}
      />
      <Switch
        label="Hitze beim Wiedereintritt"
        hint="Aus: Die Rakete wird in der Luft nicht heiß."
        on={settings.heat}
        onChange={(heat) => set({ heat })}
      />
      <Switch
        label="Luftwiderstand"
        hint="Aus: Die Luft bremst die Rakete nicht (Fallschirme wirken weiter)."
        on={settings.drag}
        onChange={(drag) => set({ drag })}
      />
    </div>
  );
}

const GROUP_INFO: Record<ChallengeGroup, string> = {
  Flugschule: 'Die Grundlagen: abheben, Umlaufbahn, Manöver planen.',
  Profi: 'Andocken, Satelliten, Präzisionslandungen.',
  Meister: 'Für echte Raketenprofis.',
};

/** Übersicht der Herausforderungen mit den besten Sternen. */
function ChallengeList({
  stars,
  onStart,
}: {
  stars: Record<string, number>;
  onStart: (c: Challenge) => void;
}) {
  const groups: ChallengeGroup[] = ['Flugschule', 'Profi', 'Meister'];
  const records = progressStore.load().rocketChallenges ?? {};
  return (
    <section class="challenge-list" aria-label="Herausforderungen">
      <p class="small muted">
        Feste Rakete, feste Startsituation, ein Ziel: Jede Herausforderung bringt bis zu drei
        Sterne, jeder Stern zählt {STAR_POINTS} Punkte für deinen Rang.
      </p>
      {groups.map((g) => (
        <div key={g} class="challenge-group">
          <h3>
            {g} <span class="small muted">{GROUP_INFO[g]}</span>
          </h3>
          <ol class="challenge-rows">
            {CHALLENGES.filter((c) => c.group === g).map((c) => {
              const n = stars[c.id] ?? 0;
              return (
                <li key={c.id} class={`challenge-row ${n > 0 ? 'done' : ''}`}>
                  <span class="challenge-no" aria-hidden="true">
                    {String(CHALLENGES.indexOf(c) + 1).padStart(2, '0')}
                  </span>
                  <div class="challenge-text">
                    <h4>{c.title}</h4>
                    <p class="challenge-brief">{c.brief}</p>
                    <p class="challenge-meta">
                      {c.computer ? 'Bordcomputer erlaubt' : 'Ohne Bordcomputer'}
                      {records[c.id]?.text && <> · Bestes Ergebnis: {records[c.id]!.text}</>}
                    </p>
                  </div>
                  <div class="challenge-side">
                    <span class="challenge-stars" role="img" aria-label={`${n} von 3 Sternen`}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} class={i < n ? 'on' : ''}>
                          ★
                        </span>
                      ))}
                    </span>
                    <button type="button" class="gbtn small" onClick={() => onStart(c)}>
                      {n > 0 ? 'Nochmal' : 'Starten'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}

/** Rang, Punkte, alle Ziele, Satelliten und die freigeschalteten Lackierungen. */
function MissionControl({
  goals,
  stars,
  paint,
  onPaint,
  satellites,
  onSatellites,
  sandbox,
  onReset,
}: {
  goals: readonly string[];
  stars: Record<string, number>;
  paint: string;
  onPaint: (id: string) => void;
  satellites: Satellite[];
  onSatellites: (s: Satellite[]) => void;
  sandbox: boolean;
  onReset: () => void;
}) {
  const points = careerPoints(goals, stars);
  const starSum = Object.values(stars).reduce((a, b) => a + b, 0);
  const rank = rankFor(points);
  const prev = RANKS[rank.index]!.points;
  const progress = rank.next === null ? 1 : (points - prev) / (rank.next - prev);
  return (
    <section class="mission-control" aria-labelledby="missionskontrolle">
      <div class="mc-head">
        <div>
          <h3 id="missionskontrolle">Missionskontrolle</h3>
          <p class="small muted">
            Jedes erreichte Ziel und jeder Stern bringt Punkte. Mit Punkten steigst du im Rang auf –
            bis zum „{RANKS[RANKS.length - 1]!.title}“ – und schaltest neue Bauteile und
            Lackierungen frei.
          </p>
        </div>
        <div class="mc-rank">
          <strong>{rank.title}</strong>
          <span>
            {points} Punkte
            {starSum > 0 ? ` (davon ${starSum * STAR_POINTS} aus ${starSum} Sternen)` : ''}
            {rank.next !== null ? ` · nächster Rang ab ${rank.next}` : ' · höchster Rang!'}
          </span>
          <div class="dv-bar" aria-hidden="true">
            <div class="dv-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
        </div>
      </div>
      <div class="mc-goals">
        {GOAL_GROUPS.map((g) => (
          <div key={g} class="mc-group">
            <h4>{g}</h4>
            <ul>
              {GOALS.filter((q) => q.group === g).map((q) => (
                <li key={q.id} class={goals.includes(q.id) ? 'done' : ''}>
                  <span aria-hidden="true">{goals.includes(q.id) ? '★' : '☆'}</span>
                  <span class="mc-goal">
                    {q.title}
                    <small>{q.text}</small>
                  </span>
                  <span class="pts">{q.points}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {[false, true].map((sb) => {
        const list = satellites.filter((q) => !!q.sandbox === sb);
        if (list.length === 0) return null;
        return (
          <div key={String(sb)} class="mc-sats">
            <h4>
              {sb ? 'Satelliten aus dem Sandkasten' : 'Deine Satelliten'} ({list.length})
            </h4>
            {sb && (
              <p class="small muted">
                Sie kreisen nur in Sandkasten-Flügen und bringen keine Punkte.
              </p>
            )}
            <ul>
              {list.map((s) => {
                const b = bodyById(s.body);
                const { peri, apo } = apsides(s.el);
                return (
                  <li key={s.id}>
                    {s.name} · um {b.name} · {km(peri - b.radius)} – {km(apo - b.radius)}
                    <ConfirmButton
                      class="btn small ghost"
                      label="Abschalten"
                      confirm="Wirklich?"
                      onConfirm={() => onSatellites(satellites.filter((q) => q !== s))}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div class="mc-paints" role="radiogroup" aria-label="Lackierung">
        <span class="small muted">Lackierung:</span>
        {PAINTS.map((p) => {
          const locked = !sandbox && points < p.points;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={paint === p.id}
              class={`paint ${paint === p.id ? 'on' : ''}`}
              disabled={locked}
              title={locked ? `Ab ${p.points} Punkten` : p.name}
              onClick={() => onPaint(p.id)}
            >
              <span
                class="swatch"
                style={{
                  background: `linear-gradient(90deg, ${p.metal[0]}, ${p.metal[1]} 45%, ${p.stripe} 46%, ${p.stripe} 60%, ${p.band} 61%)`,
                }}
              />
              {locked ? `${p.name} · gesperrt bis ${p.points} Punkte` : p.name}
            </button>
          );
        })}
      </div>
      <div class="mc-reset">
        <p class="small muted">
          Neu anfangen: Punkte, Sterne, Satelliten und Spielstände der Raketenwerft werden gelöscht.
          Deine Raketen im Hangar bleiben.
        </p>
        <ConfirmButton
          class="btn small"
          label="Karriere zurücksetzen"
          confirm="Wirklich alles löschen?"
          onConfirm={onReset}
        />
      </div>
    </section>
  );
}
