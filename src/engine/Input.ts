/**
 * Ordnet Aktionen (z. B. "jump") physische Tasten zu. Tasten werden über `KeyboardEvent.code`
 * angegeben (z. B. "Space", "KeyW", "ArrowLeft") und sind damit unabhängig vom Tastaturlayout.
 */
export type KeyBindings<A extends string> = Record<A, readonly string[]>;

export interface PointerState {
  /** Position in logischen Spielkoordinaten. */
  x: number;
  y: number;
  down: boolean;
  /** Seit dem letzten Simulationsschritt gedrückt bzw. losgelassen. */
  pressed: boolean;
  released: boolean;
}

/**
 * Tastatur- und Zeiger-Eingabe (Maus, Touch, Stift). Der Zustand wird per Event gesammelt und
 * im Update abgefragt. "Gerade gedrückt" bleibt bis nach dem nächsten Simulationsschritt
 * erhalten (`endStep`), damit kurze Tastendrücke nie verloren gehen.
 */
export class Input<A extends string = string> {
  readonly pointer: PointerState = { x: 0, y: 0, down: false, pressed: false, released: false };

  private readonly keysDown = new Set<string>();
  private readonly keysPressed = new Set<string>();
  private readonly keysReleased = new Set<string>();
  private readonly boundCodes: ReadonlySet<string>;

  constructor(private readonly bindings: KeyBindings<A>) {
    this.boundCodes = new Set(Object.values<readonly string[]>(bindings).flat());
  }

  isDown(action: A): boolean {
    return this.bindings[action].some((code) => this.keysDown.has(code));
  }

  wasPressed(action: A): boolean {
    return this.bindings[action].some((code) => this.keysPressed.has(code));
  }

  wasReleased(action: A): boolean {
    return this.bindings[action].some((code) => this.keysReleased.has(code));
  }

  /** -1, 0 oder 1 – praktisch für Bewegungsachsen, z. B. `axis('left', 'right')`. */
  axis(negative: A, positive: A): number {
    return (this.isDown(positive) ? 1 : 0) - (this.isDown(negative) ? 1 : 0);
  }

  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  keyWasPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  handleKeyDown(code: string, repeat = false): void {
    if (!repeat && !this.keysDown.has(code)) this.keysPressed.add(code);
    this.keysDown.add(code);
  }

  handleKeyUp(code: string): void {
    if (this.keysDown.delete(code)) this.keysReleased.add(code);
  }

  handlePointerDown(x: number, y: number): void {
    this.handlePointerMove(x, y);
    if (!this.pointer.down) this.pointer.pressed = true;
    this.pointer.down = true;
  }

  handlePointerMove(x: number, y: number): void {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  handlePointerUp(x: number, y: number): void {
    this.handlePointerMove(x, y);
    if (this.pointer.down) this.pointer.released = true;
    this.pointer.down = false;
  }

  /** Nach jedem Simulationsschritt aufrufen: setzt "gerade gedrückt/losgelassen" zurück. */
  endStep(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.pointer.pressed = false;
    this.pointer.released = false;
  }

  /** Vergisst alle gehaltenen Tasten, z. B. wenn das Fenster den Fokus verliert. */
  reset(): void {
    this.keysDown.clear();
    this.pointer.down = false;
    this.endStep();
  }

  /**
   * Verbindet die Eingabe mit DOM-Events. Tastatur wird global am Fenster abgehört,
   * Zeiger-Events nur auf `surface`. Gibt eine Funktion zurück, die alle Listener wieder entfernt.
   */
  attach(
    surface: HTMLElement,
    toLogical: (clientX: number, clientY: number) => { x: number; y: number },
  ): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      // Belegte Tasten sollen nicht scrollen o. Ä. – Browser-Kürzel wie Strg+R bleiben aber erhalten.
      if (!hasModifier && this.boundCodes.has(event.code)) event.preventDefault();
      this.handleKeyDown(event.code, event.repeat);
    };
    const onKeyUp = (event: KeyboardEvent): void => this.handleKeyUp(event.code);
    const onBlur = (): void => this.reset();

    const pointerHandler =
      (handle: (x: number, y: number) => void) =>
      (event: PointerEvent): void => {
        if (!event.isPrimary) return;
        const { x, y } = toLogical(event.clientX, event.clientY);
        handle(x, y);
      };
    const onPointerDown = pointerHandler((x, y) => this.handlePointerDown(x, y));
    const onPointerMove = pointerHandler((x, y) => this.handlePointerMove(x, y));
    const onPointerUp = pointerHandler((x, y) => this.handlePointerUp(x, y));
    const onPointerDownCapture = (event: PointerEvent): void => {
      // Zeiger festhalten, damit "loslassen" auch außerhalb der Spielfläche ankommt.
      if (event.isPrimary) surface.setPointerCapture?.(event.pointerId);
      onPointerDown(event);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    surface.addEventListener('pointerdown', onPointerDownCapture);
    surface.addEventListener('pointermove', onPointerMove);
    surface.addEventListener('pointerup', onPointerUp);
    surface.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      surface.removeEventListener('pointerdown', onPointerDownCapture);
      surface.removeEventListener('pointermove', onPointerMove);
      surface.removeEventListener('pointerup', onPointerUp);
      surface.removeEventListener('pointercancel', onPointerUp);
    };
  }
}
