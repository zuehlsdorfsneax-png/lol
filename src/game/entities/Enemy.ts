import { fillCircle, lerp, Vector2, type Circle } from '../../engine';
import { COLORS } from '../config';

/** Gegner, der geradlinig fliegt und an den Rändern abprallt. */
export class Enemy {
  static readonly RADIUS = 15;

  readonly position: Vector2;
  readonly velocity: Vector2;
  private readonly previous: Vector2;

  constructor(x: number, y: number, velocity: Vector2) {
    this.position = new Vector2(x, y);
    this.previous = this.position.clone();
    this.velocity = velocity.clone();
  }

  get bounds(): Circle {
    return { x: this.position.x, y: this.position.y, radius: Enemy.RADIUS };
  }

  update(dt: number, areaWidth: number, areaHeight: number): void {
    this.previous.copy(this.position);
    const r = Enemy.RADIUS;
    let x = this.position.x + this.velocity.x * dt;
    let y = this.position.y + this.velocity.y * dt;

    if (x < r) {
      x = r;
      this.velocity.x = Math.abs(this.velocity.x);
    } else if (x > areaWidth - r) {
      x = areaWidth - r;
      this.velocity.x = -Math.abs(this.velocity.x);
    }
    if (y < r) {
      y = r;
      this.velocity.y = Math.abs(this.velocity.y);
    } else if (y > areaHeight - r) {
      y = areaHeight - r;
      this.velocity.y = -Math.abs(this.velocity.y);
    }
    this.position.set(x, y);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    const x = lerp(this.previous.x, this.position.x, alpha);
    const y = lerp(this.previous.y, this.position.y, alpha);
    ctx.shadowColor = COLORS.enemy;
    ctx.shadowBlur = 16;
    fillCircle(ctx, x, y, Enemy.RADIUS, COLORS.enemy);
    ctx.shadowBlur = 0;
    fillCircle(ctx, x, y, Enemy.RADIUS * 0.4, COLORS.background);
  }
}
