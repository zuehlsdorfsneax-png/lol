/**
 * Eine Szene ist ein eigenständiger Spielzustand, z. B. Menü, Level oder Pause-Overlay.
 * Alle Hooks außer `update` und `render` sind optional.
 */
export interface Scene {
  /** Wenn `true`, wird die Szene darunter weiterhin gezeichnet (für Overlays wie ein Pausemenü). */
  readonly transparent?: boolean;

  /** Die Szene wird aktiv (nach `push` oder `replace`). */
  enter?(): void;
  /** Die Szene wird endgültig entfernt (nach `pop` oder `replace`). */
  exit?(): void;
  /** Eine andere Szene wurde darübergelegt. */
  pause?(): void;
  /** Die Szene darüber wurde entfernt, diese Szene ist wieder oben. */
  resume?(): void;

  /** Simulationsschritt mit fester Schrittweite `dt` in Sekunden. */
  update(dt: number): void;
  /** Zeichnet die Szene; `alpha` (0..1) dient zur Interpolation zwischen zwei Schritten. */
  render(ctx: CanvasRenderingContext2D, alpha: number): void;
}
