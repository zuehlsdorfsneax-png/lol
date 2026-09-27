import { clamp, fillCircle, lerp, Vector2, type Circle } from '../../engine';
import { COLORS } from '../config';

export class Player {
  static readonly RADIUS = 18;
  static readonly SPEED = 280;

  readonly position: Vector2;
  private readonly previous: Vector2;

  constructor(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.previous = this.position.clone();
  }

  get bounds(): Circle {
    return { x: this.position.x, y: this.position.y, radius: Player.RADIUS };
  }

  /** `direction` hat höchstens die Länge 1 (1 = volle Geschwindigkeit). */
  update(dt: number, direction: Vector2, areaWidth: number, areaHeight: number): void {
    this.previous.copy(this.position);
    const r = Player.RADIUS;
    this.position.set(
      clamp(this.position.x + direction.x * Player.SPEED * dt, r, areaWidth - r),
      clamp(this.position.y + direction.y * Player.SPEED * dt, r, areaHeight - r),
    );
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const x = lerp(this.previous.x, this.position.x, alpha);
    const y = lerp(this.previous.y, this.position.y, alpha);
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 20;
    fillCircle(ctx, x, y, Player.RADIUS, COLORS.player);
    ctx.shadowBlur = 0;
    fillCircle(ctx, x - 5, y - 5, Player.RADIUS * 0.35, 'rgba(255, 255, 255, 0.7)');
  }
}
