import { useEffect, useRef } from 'preact/hooks';
import {
  prepareCanvas,
  useAnimationFrame,
  useElementSize,
  useThemeColors,
  type ThemeColors,
} from './hooks';

export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: ThemeColors,
  time: number,
) => void;

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
    if (ctx)
      drawRef.current(
        ctx,
        size.width,
        size.height,
        colors,
        (performance.now() - t0.current) / 1000,
      );
  };

  useEffect(paint, [size.width, size.height, colors, ...props.deps]);

  useAnimationFrame(paint, !!props.animate);

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
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
