/**
 * Puffer für Bahnspuren: speichert die Positionen einiger Körper. Ist er voll, wird jeder zweite
 * Eintrag verworfen und `stride` verdoppelt – so reicht die Spur auch über Jahrzehnte zurück
 * (mit gröberen Abständen), statt nur die letzten Einträge zu halten.
 */
export class TrailBuffer {
  readonly capacity: number;
  readonly bodies: number;
  /** Zeit je Eintrag. */
  readonly times: Float64Array;
  /** Positionen: [x0, y0, x1, y1, …] je Eintrag. */
  readonly positions: Float64Array;
  /** Wie oft der Puffer ausgedünnt wurde, als Faktor für den Aufzeichnungsabstand. */
  stride = 1;
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

  push(time: number, coords: ArrayLike<number>): void {
    if (this.count === this.capacity) this.decimate();
    const slot = this.count++;
    this.times[slot] = time;
    const base = slot * this.bodies * 2;
    for (let k = 0; k < this.bodies * 2; k++) this.positions[base + k] = coords[k]!;
  }

  private decimate(): void {
    const width = this.bodies * 2;
    const half = Math.ceil(this.count / 2);
    for (let i = 1; i < half; i++) {
      this.times[i] = this.times[2 * i]!;
      this.positions.copyWithin(i * width, 2 * i * width, (2 * i + 1) * width);
    }
    this.count = half;
    this.stride *= 2;
  }

  x(i: number, body: number): number {
    return this.positions[i * this.bodies * 2 + body * 2]!;
  }

  y(i: number, body: number): number {
    return this.positions[i * this.bodies * 2 + body * 2 + 1]!;
  }

  time(i: number): number {
    return this.times[i]!;
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
