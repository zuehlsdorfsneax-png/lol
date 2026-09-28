import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { prepareCanvas, useElementSize } from '../ui/hooks';
import type { Simulation } from './Simulation';
import { cameraFor, renderSpace, screenToFrame, type Camera, type ViewOptions } from './view';
import { AU, EARTH } from '../physics/constants';

interface Props {
  sim: { current: Simulation | null };
  view: ViewOptions;
  /** Sichtbarer Radius (m) beim Zurücksetzen der Kamera. */
  radius: number;
  /** Ändert sich, wenn die Kamera zurückgesetzt werden soll. */
  cameraKey: unknown;
  /** Wird in jedem Bild vor dem Zeichnen aufgerufen (Zeitschritt in s). */
  onFrame?: (dt: number) => void;
  /** Zusätzliche Zeichnung über der Szene (z. B. Zielmarkierungen). */
  onDraw?: (ctx: CanvasRenderingContext2D, cam: Camera, width: number, height: number) => void;
  onPointer?: (kind: 'down' | 'move' | 'up', frameXY: [number, number], e: PointerEvent) => boolean;
  /** CSS-Klasse für das Seitenverhältnis (siehe global.css). */
  shape?: 'wide' | 'square' | 'tall';
  children?: ComponentChildren;
  ariaLabel: string;
}

/**
 * Canvas für die Weltraumansicht: zeichnet in jedem Bild neu, Verschieben per Ziehen,
 * Zoomen per Mausrad oder Zwei-Finger-Geste, Doppelklick setzt die Ansicht zurück.
 */
export function SpaceCanvas(props: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = useRef<Camera>({ cx: 0, cy: 0, scale: 1e-6 });
  const propsRef = useRef(props);
  propsRef.current = props;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  // Kamera zurücksetzen, wenn sich Schlüssel oder Größe ändern.
  const lastKey = useRef<unknown>(Symbol());
  useEffect(() => {
    if (size.width === 0) return;
    if (lastKey.current !== props.cameraKey || cam.current.scale === 1e-6) {
      cam.current = cameraFor(props.radius, size.width, size.height);
      lastKey.current = props.cameraKey;
    }
  }, [props.cameraKey, props.radius, size.width, size.height]);

  useEffect(() => {
    let id = 0;
    let last = performance.now();
    const frame = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const p = propsRef.current;
      p.onFrame?.(dt);
      const canvas = canvasRef.current;
      const sim = p.sim.current;
      const { width, height } = sizeRef.current;
      if (canvas && sim && width > 0) {
        const ctx = prepareCanvas(canvas, width, height);
        if (ctx) {
          renderSpace(ctx, width, height, sim, cam.current, p.view);
          p.onDraw?.(ctx, cam.current, width, height);
        }
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, []);

  // Zeiger: Verschieben, Zwei-Finger-Zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const custom = useRef(false);

  const local = (e: PointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const toFrame = (px: number, py: number): [number, number] =>
    screenToFrame(cam.current, sizeRef.current.width, sizeRef.current.height, px, py);

  const zoomAt = (factor: number, px: number, py: number): void => {
    const c = cam.current;
    const { width, height } = sizeRef.current;
    const [wx, wy] = screenToFrame(c, width, height, px, py);
    // Grenzen: höchstens so weit heraus, dass 3 AE ins Bild passen (weiter sieht man nur
    // einen Punkt), höchstens so weit hinein, dass die Erde das halbe Bild füllt.
    const half = Math.min(width, height) / 2;
    const home = cameraFor(propsRef.current.radius, width, height).scale;
    const lo = Math.min(home / 10, half / (3 * AU));
    const hi = Math.max(home * 10, half / (2 * EARTH.radius));
    const scale = Math.min(Math.max(c.scale * factor, lo), hi);
    cam.current = {
      scale,
      cx: wx - (px - width / 2) / scale,
      cy: wy + (py - height / 2) / scale,
    };
  };

  const onPointerDown = (e: PointerEvent): void => {
    const [px, py] = local(e);
    if (props.onPointer?.('down', toFrame(px, py), e)) {
      custom.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: px, y: py });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), scale: cam.current.scale };
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    const [px, py] = local(e);
    if (custom.current) {
      props.onPointer?.('move', toFrame(px, py), e);
      return;
    }
    if (!pointers.current.has(e.pointerId)) {
      props.onPointer?.('move', toFrame(px, py), e);
      return;
    }
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: px, y: py });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const target = pinch.current.scale * (dist / pinch.current.dist);
      zoomAt(target / cam.current.scale, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
      return;
    }
    const c = cam.current;
    cam.current = { ...c, cx: c.cx - (px - prev.x) / c.scale, cy: c.cy + (py - prev.y) / c.scale };
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (custom.current) {
      const [px, py] = local(e);
      props.onPointer?.('up', toFrame(px, py), e);
      custom.current = false;
      return;
    }
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const r = canvasRef.current!.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div class={`space space-${props.shape ?? 'wide'}`} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={props.ariaLabel}
        style={{ cursor: 'grab', position: 'absolute', inset: 0 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDblClick={() => {
          cam.current = cameraFor(props.radius, sizeRef.current.width, sizeRef.current.height);
        }}
      />
      <div class="zoom-btns">
        <button
          type="button"
          aria-label="Hineinzoomen"
          onClick={() => zoomAt(1.5, sizeRef.current.width / 2, sizeRef.current.height / 2)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Herauszoomen"
          onClick={() => zoomAt(1 / 1.5, sizeRef.current.width / 2, sizeRef.current.height / 2)}
        >
          −
        </button>
      </div>
      {props.children}
    </div>
  );
}

/** Zoomstufe per Knopf (für Tastatur und Touch ohne Mehrfinger-Gesten). */
export type { Camera };
