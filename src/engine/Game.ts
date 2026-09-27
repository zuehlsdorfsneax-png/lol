import { AssetLoader } from './AssetLoader';
import { GameLoop } from './GameLoop';
import { Input, type KeyBindings } from './Input';
import type { Scene } from './Scene';
import { SceneManager } from './SceneManager';
import { SoundPlayer } from './SoundPlayer';
import { Viewport } from './Viewport';

export interface GameConfig<A extends string> {
  canvas: HTMLCanvasElement;
  /** Logische Auflösung, in der das Spiel zeichnet und rechnet. */
  width: number;
  height: number;
  bindings: KeyBindings<A>;
  background?: string;
  /** Simulationsschritt in Sekunden (Standard: 1/60). */
  step?: number;
  /** Deaktiviert Bildglättung für scharfe Pixelgrafik. */
  pixelArt?: boolean;
  /** Taste (KeyboardEvent.code) für das Debug-Overlay. Standard: "Backquote" (^ bzw. `). */
  debugKey?: string;
}

/** Verbindet Viewport, Eingabe, Szenen, Assets, Sound und Spielschleife. */
export class Game<A extends string = string> {
  readonly viewport: Viewport;
  readonly input: Input<A>;
  readonly scenes = new SceneManager();
  readonly assets = new AssetLoader();
  readonly sound = new SoundPlayer();
  readonly loop: GameLoop;
  /** Zeigt FPS und Zeigerposition an; umschaltbar mit `debugKey`. */
  debug = false;

  private readonly background: string;
  private readonly debugKey: string;
  private detachers: Array<() => void> = [];

  constructor(config: GameConfig<A>) {
    this.viewport = new Viewport(config.canvas, config.width, config.height, config.pixelArt);
    this.input = new Input(config.bindings);
    this.background = config.background ?? '#000';
    this.debugKey = config.debugKey ?? 'Backquote';
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      (alpha) => this.render(alpha),
      { step: config.step },
    );
  }

  get width(): number {
    return this.viewport.width;
  }

  get height(): number {
    return this.viewport.height;
  }

  /** Startet das Spiel mit `scene` als erster Szene. */
  start(scene: Scene): void {
    if (this.detachers.length === 0) this.attach();
    this.scenes.replace(scene);
    this.loop.start();
  }

  /** Hält die Schleife an und entfernt alle Event-Listener. */
  stop(): void {
    this.loop.stop();
    for (const detach of this.detachers) detach();
    this.detachers = [];
  }

  private attach(): void {
    const onVisibilityChange = (): void => {
      // Im Hintergrund pausieren: spart Akku und verhindert einen großen Zeitsprung beim Zurückkehren.
      if (document.hidden) {
        this.loop.stop();
        this.input.reset();
      } else {
        this.loop.start();
      }
    };
    const unlockAudio = (): void => this.sound.unlock();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    this.detachers.push(
      this.viewport.attach(),
      this.input.attach(this.viewport.canvas, (x, y) => this.viewport.toLogical(x, y)),
      () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      },
    );
  }

  private update(dt: number): void {
    if (this.input.keyWasPressed(this.debugKey)) this.debug = !this.debug;
    this.scenes.update(dt);
    this.input.endStep();
  }

  private render(alpha: number): void {
    this.viewport.beginFrame(this.background);
    this.scenes.render(this.viewport.ctx, alpha);
    if (this.debug) this.renderDebug();
  }

  private renderDebug(): void {
    const { ctx } = this.viewport;
    const { pointer } = this.input;
    const lines = [
      `FPS ${this.loop.fps}`,
      `Szenen ${this.scenes.size}`,
      `Zeiger ${Math.round(pointer.x)}, ${Math.round(pointer.y)}${pointer.down ? ' ●' : ''}`,
    ];
    // Unten links, damit das Overlay typische HUD-Elemente oben nicht verdeckt.
    const boxHeight = lines.length * 16 + 8;
    const top = this.height - boxHeight - 4;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(4, top, 170, boxHeight);
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillStyle = '#0f0';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, 10, top + 6 + i * 16));
    ctx.restore();
  }
}
