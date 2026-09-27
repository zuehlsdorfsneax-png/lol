import { fillStar, Vector2, type Circle } from '../../engine';
import { COLORS } from '../config';

/** Einsammelbarer Stern, der leicht pulsiert und sich dreht. */
export class Collectible {
  static readonly RADIUS = 14;

  readonly position: Vector2;
  private time: number;

  constructor(x: number, y: number, phase = 0) {
    this.position = new Vector2(x, y);
    this.time = phase;
  }

  get bounds(): Circle {
    return { x: this.position.x, y: this.position.y, radius: Collectible.RADIUS };
  }

  update(dt: number): void {
    this.time += dt;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pulse = 1 + Math.sin(this.time * 5) * 0.12;
    const r = Collectible.RADIUS * pulse;
    ctx.shadowColor = COLORS.accent;
    ctx.shadowBlur = 14;
    fillStar(ctx, this.position.x, this.position.y, 5, r, r * 0.45, COLORS.accent, this.time);
    ctx.shadowBlur = 0;
  }
}
