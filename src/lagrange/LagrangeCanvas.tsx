import { useEffect, useRef } from 'preact/hooks';
import { linearStability, lagrangePoints } from '../physics';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import { contour, lagrangeLevels, rampColor, sampleGrid, type Grid, type LView } from './field';

export interface Overlay {
  (
    ctx: CanvasRenderingContext2D,
    toScreen: (x: number, y: number) => [number, number],
    scale: number,
    width: number,
    height: number,
  ): void;
}

interface Props {
  mu: number;
  view: LView;
  heat?: boolean;
  /** Höhenlinien bei C(L1), C(L2), C(L3) zeigen. */
  contours?: boolean;
  /** Bereich schattieren, den ein Teilchen mit dieser Jacobi-Konstante nicht erreichen kann. */
  forbiddenC?: number | null;
  points?: boolean;
  /** Radius der Hauptkörper in Pixeln. */
  bodyRadius?: [number, number];
  bodyLabels?: [string, string];
  overlay?: Overlay;
  animate?: boolean;
  shape?: 'wide' | 'square' | 'tall';
  label: string;
  onPointer?: (kind: 'down' | 'move' | 'up', x: number, y: number) => void;
  onWheel?: (factor: number, x: number, y: number) => void;
}

const LEVEL_COLOR = '#f2c46e';
const FORBIDDEN = 'rgba(8, 11, 24, 0.78)';

/** Darstellung des mitrotierenden Systems im eingeschränkten Drei-Körper-Problem. */
export function LagrangeCanvas(props: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const background = useRef<{ key: string; canvas: HTMLCanvasElement; grid: Grid } | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const paint = (): void => {
    const p = propsRef.current;
    const { width, height } = sizeRef.current;
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const ctx = prepareCanvas(canvas, width, height);
    if (!ctx) return;
    const { view, mu } = p;
    const scale = width / (2 * view.half);
    const toScreen = (x: number, y: number): [number, number] => [
      width / 2 + (x - view.cx) * scale,
      height / 2 - (y - view.cy) * scale,
    ];

    // Hintergrund (nur neu berechnen, wenn sich etwas geändert hat).
    const key = [
      mu,
      view.cx,
      view.cy,
      view.half,
      width,
      height,
      p.heat,
      p.contours,
      p.forbiddenC,
    ].join('|');
    if (!background.current || background.current.key !== key) {
      background.current = { key, ...renderBackground(p, width, height) };
    }
    ctx.drawImage(background.current.canvas, 0, 0, width, height);

    // Hauptkörper.
    const [r1, r2] = p.bodyRadius ?? [9, 6];
    const bodies: [number, number, number, string, string][] = [
      [-mu, 0, r1, '#ffc14d', p.bodyLabels?.[0] ?? 'm₁'],
      [1 - mu, 0, r2, '#4c9aff', p.bodyLabels?.[1] ?? 'm₂'],
    ];
    ctx.font = '12px Jost, system-ui, sans-serif';
    for (const [x, y, r, color, name] of bodies) {
      const [sx, sy] = toScreen(x, y);
      if (sx < -50 || sx > width + 50) continue;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfe5f5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(name, sx, sy + r + 4);
    }

    // Lagrange-Punkte mit Stabilität.
    if (p.points !== false) {
      for (const lp of lagrangePoints(mu)) {
        const [sx, sy] = toScreen(lp.x, lp.y);
        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;
        const stable = linearStability(mu, lp).stable;
        ctx.strokeStyle = stable ? '#3ccb86' : '#ff8a7a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (stable) {
          ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        } else {
          ctx.moveTo(sx - 5, sy - 5);
          ctx.lineTo(sx + 5, sy + 5);
          ctx.moveTo(sx + 5, sy - 5);
          ctx.lineTo(sx - 5, sy + 5);
        }
        ctx.stroke();
        ctx.fillStyle = '#f5f7ff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(lp.name, sx + 8, sy - 8);
      }
    }

    p.overlay?.(ctx, toScreen, scale, width, height);
  };

  useEffect(paint);

  useEffect(() => {
    if (!props.animate) return;
    let id = requestAnimationFrame(function frame() {
      paint();
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [props.animate]);

  const toWorld = (e: PointerEvent | WheelEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    const { view } = propsRef.current;
    const scale = r.width / (2 * view.half);
    return [
      view.cx + (e.clientX - r.left - r.width / 2) / scale,
      view.cy - (e.clientY - r.top - r.height / 2) / scale,
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent): void => {
      if (!propsRef.current.onWheel) return;
      e.preventDefault();
      propsRef.current.onWheel(Math.exp(e.deltaY * 0.0015), ...toWorld(e));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div class={`space space-${props.shape ?? 'wide'}`} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={props.label}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: props.onPointer ? 'crosshair' : 'default',
        }}
        onPointerDown={(e) => {
          if (!props.onPointer) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          props.onPointer('down', ...toWorld(e));
        }}
        onPointerMove={(e) => props.onPointer?.('move', ...toWorld(e))}
        onPointerUp={(e) => props.onPointer?.('up', ...toWorld(e))}
      />
    </div>
  );
}

function renderBackground(
  p: Props,
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; grid: Grid } {
  const cell = 3;
  const grid = sampleGrid(p.mu, p.view, width, height, cell);
  const off = document.createElement('canvas');
  off.width = grid.nx;
  off.height = grid.ny;
  const octx = off.getContext('2d')!;
  const img = octx.createImageData(grid.nx, grid.ny);
  const levels = lagrangeLevels(p.mu);
  const base = Math.min(...levels.map((l) => l.C));
  const lo = Math.log(1e-4);
  const hi = Math.log(3);
  for (let k = 0; k < grid.values.length; k++) {
    const v = grid.values[k]!;
    // Ohne Farbverlauf: erlaubtes Gebiet in gedecktem Blau, damit die verbotene Zone absticht.
    let rgb: [number, number, number] = [30, 46, 96];
    if (p.heat !== false) {
      const t = 1 - (Math.log(Math.max(v - base, 1e-6) + 1e-4) - lo) / (hi - lo);
      rgb = rampColor(t * 0.92);
    }
    if (p.forbiddenC != null && v < p.forbiddenC)
      rgb = [rgb[0] * 0.2 + 5, rgb[1] * 0.2 + 7, rgb[2] * 0.2 + 15];
    img.data[4 * k] = rgb[0];
    img.data[4 * k + 1] = rgb[1];
    img.data[4 * k + 2] = rgb[2];
    img.data[4 * k + 3] = 255;
  }
  octx.putImageData(img, 0, 0);

  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  // Pixelmitte = Rasterpunkt → um eine halbe Zelle verschieben.
  ctx.drawImage(off, -cell / 2, -cell / 2, grid.nx * cell, grid.ny * cell);

  const toPx = (i: number, j: number): [number, number] => [i * cell, j * cell];
  const drawLevel = (level: number, color: string, widthPx: number, dash: number[] = []): void => {
    const segs = contour(grid, level);
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let s = 0; s < segs.length; s += 4) {
      const [ax, ay] = toPx(segs[s]!, segs[s + 1]!);
      const [bx, by] = toPx(segs[s + 2]!, segs[s + 3]!);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  if (p.contours !== false) {
    for (const l of levels.slice(0, 3)) drawLevel(l.C, LEVEL_COLOR, 1, [4, 3]);
  }
  if (p.forbiddenC != null) {
    ctx.fillStyle = FORBIDDEN;
    drawLevel(p.forbiddenC, '#ff8a7a', 1.5);
  }
  return { canvas, grid };
}
