import { adaptiveStep, jacobiConstant, rk4Step, type State4 } from '../physics';

export interface Particle {
  id: number;
  state: State4;
  /** Jacobi-Konstante beim Start. */
  C: number;
  trail: number[];
  status: 'active' | 'crashed' | 'escaped';
  age: number;
  color: string;
}

const COLORS = ['#8fe3ff', '#ffd27a', '#b7a6ff', '#7ef0b4', '#ff9fc2', '#f5f7ff'];
const TRAIL_POINTS = 2500;

/** Masselose Teilchen im mitrotierenden System. */
export class ParticleSystem {
  particles: Particle[] = [];
  time = 0;
  private nextId = 1;

  constructor(public mu: number) {}

  add(x: number, y: number, vx: number, vy: number): Particle {
    const p: Particle = {
      id: this.nextId,
      state: [x, y, vx, vy],
      C: jacobiConstant(this.mu, x, y, vx, vy),
      trail: [x, y],
      status: 'active',
      age: 0,
      color: COLORS[(this.nextId - 1) % COLORS.length]!,
    };
    this.nextId++;
    this.particles.push(p);
    return p;
  }

  clear(): void {
    this.particles = [];
  }

  /** Rechnet `duration` Zeiteinheiten weiter (höchstens `maxSteps` Schritte je Teilchen). */
  advance(duration: number, maxSteps = 4000): void {
    const mu = this.mu;
    for (const p of this.particles) {
      if (p.status !== 'active') continue;
      let t = 0;
      let steps = 0;
      let sinceSample = 0;
      while (t < duration && steps < maxSteps) {
        const dt = Math.min(adaptiveStep(mu, p.state[0], p.state[1], 0.01, 0.01), duration - t);
        p.state = rk4Step(mu, p.state, dt);
        t += dt;
        sinceSample += dt;
        steps++;
        const [x, y] = p.state;
        const r1 = Math.hypot(x + mu, y);
        const r2 = Math.hypot(x - 1 + mu, y);
        if (r1 < 0.004 || (mu > 0 && r2 < 0.004 * Math.cbrt(mu / 0.01))) {
          p.status = 'crashed';
          break;
        }
        if (Math.hypot(x, y) > 6) {
          p.status = 'escaped';
          break;
        }
        if (sinceSample > 0.01) {
          p.trail.push(x, y);
          sinceSample = 0;
        }
      }
      p.age += t;
      p.trail.push(p.state[0], p.state[1]);
      if (p.trail.length > TRAIL_POINTS * 2) p.trail.splice(0, p.trail.length - TRAIL_POINTS * 2);
    }
    this.time += duration;
  }
}

/** Zeichnet Teilchen samt Spur. */
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: readonly Particle[],
  toScreen: (x: number, y: number) => [number, number],
): void {
  for (const p of particles) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.status === 'active' ? 0.75 : 0.35;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < p.trail.length; i += 2) {
      const [sx, sy] = toScreen(p.trail[i]!, p.trail[i + 1]!);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    const [sx, sy] = toScreen(p.state[0], p.state[1]);
    ctx.fillStyle = p.status === 'crashed' ? '#ff8a7a' : p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#060a18';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function drawDragArrow(
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
): void {
  ctx.strokeStyle = '#f5f7ff';
  ctx.fillStyle = '#f5f7ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(from[0], from[1], 4, 0, Math.PI * 2);
  ctx.fill();
}
