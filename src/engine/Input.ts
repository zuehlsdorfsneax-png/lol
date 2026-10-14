/**
 * Ordnet Aktionen (z. B. "jump") physische Tasten zu. Tasten werden über `KeyboardEvent.code`
 * angegeben (z. B. "Space", "KeyW", "ArrowLeft") und sind damit unabhängig vom Tastaturlayout.
 */
export type KeyBindings<A extends string> = Record<A, readonly string[]>;

/**
 * Tastatureingabe. Der Zustand wird per Event gesammelt und
 * im Update abgefragt. "Gerade gedrückt" bleibt bis nach dem nächsten Simulationsschritt
 * erhalten (`endStep`), damit kurze Tastendrücke nie verloren gehen.
 */
export class Input<A extends string = string> {
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

  /** Nach jedem Simulationsschritt aufrufen: setzt "gerade gedrückt/losgelassen" zurück. */
  endStep(): void {
    this.keysPressed.clear();
    this.keysReleased.clear();
  }

  /** Vergisst alle gehaltenen Tasten, z. B. wenn das Fenster den Fokus verliert. */
  reset(): void {
    this.keysDown.clear();
    this.endStep();
  }

  /**
   * Hört die Tastatur global am Fenster ab. Gibt eine Funktion zurück, die alle Listener wieder
   * entfernt. `blocksDefault` entscheidet je Taste, ob das Standardverhalten (z. B. Scrollen)
   * unterdrückt wird.
   */
  attach(blocksDefault: (code: string) => boolean = () => true): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      // Tippen in Feldern und Enter/Leertaste auf Knöpfen und Links gehören der Seite,
      // nicht dem Spiel – sonst ließen sich Knöpfe nicht mehr per Tastatur auslösen.
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (
        (event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter') &&
        target?.closest?.('button, a[href], summary')
      )
        return;
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
      // Belegte Tasten sollen nicht scrollen o. Ä. – Browser-Kürzel wie Strg+R bleiben aber erhalten.
      if (!hasModifier && this.boundCodes.has(event.code) && blocksDefault(event.code))
        event.preventDefault();
      this.handleKeyDown(event.code, event.repeat);
    };
    const onKeyUp = (event: KeyboardEvent): void => this.handleKeyUp(event.code);
    const onBlur = (): void => this.reset();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }
}
