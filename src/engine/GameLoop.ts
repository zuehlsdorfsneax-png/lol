/** Abstraktion über `requestAnimationFrame`, damit sich die Schleife ohne Browser testen lässt. */
export interface FrameScheduler {
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
}

export const animationFrameScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export interface GameLoopOptions {
  /** Länge eines Simulationsschritts in Sekunden (Standard: 1/60). */
  step?: number;
  /** Obergrenze für die Dauer eines Frames in Sekunden, damit nach Rucklern nicht endlos nachgerechnet wird. */
  maxFrameTime?: number;
  scheduler?: FrameScheduler;
}

/**
 * Spielschleife mit festem Zeitschritt: `update` läuft immer mit derselben Schrittweite
 * (deterministische Physik, unabhängig von der Bildwiederholrate), `render` einmal pro Frame
 * mit `alpha` (0..1) als Anteil bis zum nächsten Schritt – nützlich für Interpolation.
 */
export class GameLoop {
  readonly step: number;
  /** Gemessene Bilder pro Sekunde, einmal pro Sekunde aktualisiert. */
  fps = 0;

  private readonly maxFrameTime: number;
  private readonly scheduler: FrameScheduler;
  private accumulator = 0;
  private lastTime: number | null = null;
  private handle: number | null = null;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(
    private readonly update: (dt: number) => void,
    private readonly render: (alpha: number) => void,
    options: GameLoopOptions = {},
  ) {
    this.step = options.step ?? 1 / 60;
    this.maxFrameTime = options.maxFrameTime ?? 0.25;
    this.scheduler = options.scheduler ?? animationFrameScheduler;
  }

  get running(): boolean {
    return this.handle !== null;
  }

  start(): void {
    if (this.running) return;
    this.lastTime = null;
    this.accumulator = 0;
    this.handle = this.scheduler.request(this.onFrame);
  }

  stop(): void {
    if (this.handle === null) return;
    this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  /** Verarbeitet einen Frame zum Zeitpunkt `now` in Millisekunden. */
  tick(now: number): void {
    if (this.lastTime === null) {
      this.lastTime = now;
      this.render(0);
      return;
    }

    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;
    frameTime = Math.min(Math.max(frameTime, 0), this.maxFrameTime);

    this.accumulator += frameTime;
    while (this.accumulator >= this.step) {
      this.update(this.step);
      this.accumulator -= this.step;
    }
    this.render(this.accumulator / this.step);
    this.measureFps(frameTime);
  }

  private readonly onFrame = (time: number): void => {
    this.tick(time);
    // `stop()` kann während `tick` aufgerufen worden sein.
    if (this.handle !== null) this.handle = this.scheduler.request(this.onFrame);
  };

  private measureFps(frameTime: number): void {
    this.fpsFrames++;
    this.fpsTime += frameTime;
    if (this.fpsTime >= 1) {
      this.fps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }
}
