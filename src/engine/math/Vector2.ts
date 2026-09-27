/** Einfacher 2D-Vektor. Rechenoperationen liefern neue Instanzen, nur `set`/`copy` verändern. */
export class Vector2 {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  static fromAngle(radians: number, length = 1): Vector2 {
    return new Vector2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(other: Vector2): this {
    return this.set(other.x, other.y);
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  scale(factor: number): Vector2 {
    return new Vector2(this.x * factor, this.y * factor);
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  distanceTo(other: Vector2): number {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  /** Einheitsvektor in gleicher Richtung; der Nullvektor bleibt der Nullvektor. */
  normalize(): Vector2 {
    const len = this.length();
    return len === 0 ? new Vector2() : new Vector2(this.x / len, this.y / len);
  }

  lerp(target: Vector2, t: number): Vector2 {
    return new Vector2(this.x + (target.x - this.x) * t, this.y + (target.y - this.y) * t);
  }

  equals(other: Vector2, epsilon = 1e-9): boolean {
    return Math.abs(this.x - other.x) <= epsilon && Math.abs(this.y - other.y) <= epsilon;
  }
}
