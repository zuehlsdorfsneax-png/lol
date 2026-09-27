import { randomRange, type RandomSource } from '../../engine';

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
}

/** Langsam scrollender Sternenhimmel als Hintergrund. */
export class Starfield {
  private readonly stars: Star[];

  constructor(
    width: number,
    private readonly height: number,
    count = 90,
    random: RandomSource = Math.random,
  ) {
    this.stars = Array.from({ length: count }, () => ({
      x: randomRange(0, width, random),
      y: randomRange(0, height, random),
      speed: randomRange(6, 30, random),
      size: randomRange(0.5, 2, random),
    }));
  }

  update(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > this.height) star.y -= this.height;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      ctx.globalAlpha = 0.3 + star.size / 3;
      ctx.fillStyle = '#fff';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }
}
