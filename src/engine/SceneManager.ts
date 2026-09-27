import type { Scene } from './Scene';

/**
 * Stapel von Szenen. Nur die oberste Szene wird aktualisiert; gezeichnet wird zusätzlich alles
 * darunter, solange die Szenen darüber `transparent` sind.
 */
export class SceneManager {
  private readonly stack: Scene[] = [];

  get current(): Scene | undefined {
    return this.stack.at(-1);
  }

  get size(): number {
    return this.stack.length;
  }

  /** Legt eine Szene oben auf den Stapel; die bisherige wird pausiert. */
  push(scene: Scene): void {
    this.current?.pause?.();
    this.stack.push(scene);
    scene.enter?.();
  }

  /** Entfernt die oberste Szene; die darunter wird fortgesetzt. */
  pop(): Scene | undefined {
    const scene = this.stack.pop();
    scene?.exit?.();
    this.current?.resume?.();
    return scene;
  }

  /** Ersetzt alle Szenen durch `scene` – für Wechsel wie Menü → Spiel → Game Over. */
  replace(scene: Scene): void {
    while (this.stack.length > 0) this.stack.pop()?.exit?.();
    this.stack.push(scene);
    scene.enter?.();
  }

  update(dt: number): void {
    this.current?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    let first = this.stack.length - 1;
    while (first > 0 && this.stack[first]?.transparent) first--;

    const top = this.current;
    for (const scene of this.stack.slice(Math.max(first, 0))) {
      ctx.save();
      // Szenen unterhalb der obersten werden nicht aktualisiert – sie zeigen ihren letzten Zustand.
      scene.render(ctx, scene === top ? alpha : 1);
      ctx.restore();
    }
  }
}
