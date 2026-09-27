export interface FitResult {
  /** Größe des Canvas auf der Seite in CSS-Pixeln. */
  cssWidth: number;
  cssHeight: number;
  /** Tatsächliche Auflösung des Canvas in Gerätepixeln. */
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Berechnet, wie eine logische Auflösung maximal groß in einen Container passt.
 * Das Seitenverhältnis bleibt erhalten (Letterboxing), `devicePixelRatio` sorgt für scharfe Darstellung.
 */
export function fitToContainer(
  containerWidth: number,
  containerHeight: number,
  logicalWidth: number,
  logicalHeight: number,
  devicePixelRatio: number,
): FitResult {
  const scale = Math.max(
    0,
    Math.min(containerWidth / logicalWidth, containerHeight / logicalHeight),
  );
  const cssWidth = Math.floor(logicalWidth * scale);
  const cssHeight = Math.floor(logicalHeight * scale);
  return {
    cssWidth,
    cssHeight,
    canvasWidth: Math.max(1, Math.round(cssWidth * devicePixelRatio)),
    canvasHeight: Math.max(1, Math.round(cssHeight * devicePixelRatio)),
  };
}

/**
 * Verwaltet den Canvas: skaliert ihn passend ins Elternelement und stellt eine feste logische
 * Auflösung bereit. Spielcode zeichnet immer in logischen Koordinaten (0..width, 0..height).
 */
export class Viewport {
  readonly ctx: CanvasRenderingContext2D;
  private scaleX = 1;
  private scaleY = 1;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly width: number,
    readonly height: number,
    private readonly pixelArt = false,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D wird von diesem Browser nicht unterstützt.');
    this.ctx = ctx;
  }

  resize(): void {
    const container = this.canvas.parentElement ?? document.body;
    const fit = fitToContainer(
      container.clientWidth,
      container.clientHeight,
      this.width,
      this.height,
      window.devicePixelRatio || 1,
    );
    this.canvas.style.width = `${fit.cssWidth}px`;
    this.canvas.style.height = `${fit.cssHeight}px`;
    this.canvas.width = fit.canvasWidth;
    this.canvas.height = fit.canvasHeight;
    this.scaleX = fit.canvasWidth / this.width;
    this.scaleY = fit.canvasHeight / this.height;
    // Das Setzen der Canvas-Größe setzt den Kontext zurück.
    this.ctx.imageSmoothingEnabled = !this.pixelArt;
  }

  /** Passt die Größe sofort und bei jeder Fensteränderung an. Gibt eine Abmelde-Funktion zurück. */
  attach(): () => void {
    const onResize = (): void => this.resize();
    this.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }

  /** Setzt die Transformation auf logische Koordinaten und füllt das Bild mit `background`. */
  beginFrame(background: string): void {
    const { ctx } = this;
    ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Rechnet Bildschirmkoordinaten (z. B. `event.clientX`) in logische Spielkoordinaten um. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * this.width,
      y: ((clientY - rect.top) / rect.height) * this.height,
    };
  }
}
