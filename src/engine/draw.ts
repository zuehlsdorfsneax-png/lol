export interface TextStyle {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: 'normal' | 'bold';
  font?: string;
}

const DEFAULT_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TextStyle = {},
): void {
  ctx.font = `${style.weight ?? 'normal'} ${style.size ?? 16}px ${style.font ?? DEFAULT_FONT}`;
  ctx.fillStyle = style.color ?? '#fff';
  ctx.textAlign = style.align ?? 'left';
  ctx.textBaseline = style.baseline ?? 'alphabetic';
  ctx.fillText(text, x, y);
}

export function fillCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Zeichnet einen Stern mit `points` Zacken, gedreht um `rotation` (Bogenmaß). */
export function fillStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  points: number,
  outerRadius: number,
  innerRadius: number,
  color: string,
  rotation = 0,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation - Math.PI / 2 + (i * Math.PI) / points;
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
