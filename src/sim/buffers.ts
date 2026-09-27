/**
 * Ringpuffer für Bahnspuren: speichert in festen Zeitabständen die Positionen einiger Körper.
 * Ältere Einträge werden überschrieben.
 */
export class TrailBuffer {
  readonly capacity: number;
  readonly bodies: number;
  /** Zeit je Eintrag. */
  readonly times: Float64Array;
  /** Positionen: [x0, y0, x1, y1, …] je Eintrag. */
  readonly positions: Float64Array;
  private start = 0;
  private count = 0;

  constructor(capacity: number, bodies: number) {
    this.capacity = capacity;
    this.bodies = bodies;
    this.times = new Float64Array(capacity);
    this.positions = new Float64Array(capacity * bodies * 2);
  }

  get length(): number {
    return this.count;
  }

  clear(): void {
    this.start = 0;
    this.count = 0;
  }

  push(time: number, coords: ArrayLike<number>): void {
    const slot = (this.start + this.count) % this.capacity;
    if (this.count < this.capacity) this.count++;
    else this.start = (this.start + 1) % this.capacity;
    this.times[slot] = time;
    const base = slot * this.bodies * 2;
    for (let k = 0; k < this.bodies * 2; k++) this.positions[base + k] = coords[k]!;
  }

  /** Physischer Index des i-ten Eintrags (0 = ältester). */
  slot(i: number): number {
    return (this.start + i) % this.capacity;
  }

  x(i: number, body: number): number {
    return this.positions[this.slot(i) * this.bodies * 2 + body * 2]!;
  }

  y(i: number, body: number): number {
    return this.positions[this.slot(i) * this.bodies * 2 + body * 2 + 1]!;
  }

  time(i: number): number {
    return this.times[this.slot(i)]!;
  }
}

/**
 * Messreihe mit fester Kapazität. Ist sie voll, wird jeder zweite Wert verworfen und das
 * Aufzeichnungsintervall verdoppelt – so passt auch eine Simulation über Jahrhunderte hinein.
 */
export class SeriesBuffer<K extends string> {
  readonly keys: readonly K[];
  readonly capacity: number;
  interval: number;
  readonly data: Record<K, Float64Array>;
  readonly time: Float64Array;
  length = 0;
  nextTime = 0;

  constructor(keys: readonly K[], capacity: number, interval: number) {
    this.keys = keys;
    this.capacity = capacity;
    this.interval = interval;
    this.time = new Float64Array(capacity);
    this.data = Object.fromEntries(keys.map((k) => [k, new Float64Array(capacity)])) as Record<
      K,
      Float64Array
    >;
  }

  due(time: number): boolean {
    return time >= this.nextTime;
  }

  push(time: number, values: Record<K, number>): void {
    if (this.length === this.capacity) this.decimate();
    this.time[this.length] = time;
    for (const k of this.keys) this.data[k][this.length] = values[k];
    this.length++;
    this.nextTime = time + this.interval;
  }

  private decimate(): void {
    const half = Math.floor(this.length / 2);
    for (let i = 0; i < half; i++) {
      this.time[i] = this.time[2 * i]!;
      for (const k of this.keys) this.data[k][i] = this.data[k][2 * i]!;
    }
    this.length = half;
    this.interval *= 2;
  }

  clear(): void {
    this.length = 0;
    this.nextTime = 0;
  }

  /** Als CSV-Text (Semikolon-getrennt, Dezimalkomma – öffnet sich direkt in deutschem Excel). */
  toCsv(
    headers: Record<K | 'time', string>,
    scale: Partial<Record<K | 'time', number>> = {},
  ): string {
    const cols: (K | 'time')[] = ['time', ...this.keys];
    const lines = [cols.map((c) => headers[c]).join(';')];
    for (let i = 0; i < this.length; i++) {
      lines.push(
        cols
          .map((c) => {
            const v = (c === 'time' ? this.time[i]! : this.data[c][i]!) / (scale[c] ?? 1);
            return Number.isFinite(v) ? String(Number(v.toPrecision(8))).replace('.', ',') : '';
          })
          .join(';'),
      );
    }
    return lines.join('\n');
  }
}
