import { useEffect, useRef } from 'preact/hooks';
import { prepareCanvas, useElementSize, useThemeColors, type ThemeColors } from './hooks';

export type DrawFn = (ctx: CanvasRenderingContext2D, width: number, height: number, colors: ThemeColors, time: number) => void;

interface Props {
  draw: DrawFn;
  /** Neu zeichnen, wenn sich diese Werte ändern. */
  deps: unknown[];
  /** CSS-Seitenverhältnis, z. B. "16 / 9". */
  aspect?: string;
  height?: number;
  /** In jedem Bild neu zeichnen (Animation). */
  animate?: boolean;
  label: string;
  className?: string;
  onPointerDown?: (x: number, y: number, e: PointerEvent) => void;
  onPointerMove?: (x: number, y: number, e: PointerEvent) => void;
  onPointerUp?: (x: number, y: number, e: PointerEvent) => void;
}

/** Canvas, der sich an seine Breite anpasst und scharf auf HiDPI-Bildschirmen zeichnet. */
export function CanvasBox(props: Props) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useThemeColors();
  const drawRef = useRef(props.draw);
  drawRef.current = props.draw;
  const t0 = useRef(performance.now());

  const paint = (): void => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const ctx = prepareCanvas(canvas, size.width, size.height);
    if (ctx) drawRef.current(ctx, size.width, size.height, colors, (performance.now() - t0.current) / 1000);
  };

  useEffect(paint, [size.width, size.height, colors, ...props.deps]);

  useEffect(() => {
    if (!props.animate) return;
    let id = requestAnimationFrame(function frame() {
      paint();
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  });

  const pos = (e: PointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  return (
    <div
      ref={wrapRef}
      class={props.className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: props.aspect,
        height: props.height ? `${props.height}px` : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={props.label}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: props.onPointerDown ? 'none' : undefined }}
        onPointerDown={
          props.onPointerDown &&
          ((e) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            props.onPointerDown!(...pos(e), e);
          })
        }
        onPointerMove={props.onPointerMove && ((e) => props.onPointerMove!(...pos(e), e))}
        onPointerUp={props.onPointerUp && ((e) => props.onPointerUp!(...pos(e), e))}
      />
    </div>
  );
}
