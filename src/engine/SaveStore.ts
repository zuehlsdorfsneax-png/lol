/**
 * Speichert einen Spielstand als JSON im `localStorage`. Fehler (privater Modus, voller Speicher,
 * kaputte Daten) führen nie zum Absturz – dann gelten einfach die Standardwerte.
 * Beim Laden werden gespeicherte Felder flach über die Standardwerte gelegt, damit neue
 * Felder in späteren Versionen automatisch ihren Standardwert erhalten.
 */
export class SaveStore<T extends object> {
  private readonly storage: Storage | null;

  constructor(
    private readonly key: string,
    private readonly defaults: T,
    storage?: Storage | null,
  ) {
    this.storage = storage === undefined ? getLocalStorage() : storage;
  }

  load(): T {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return { ...this.defaults };
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { ...this.defaults };
      }
      return { ...this.defaults, ...(parsed as Partial<T>) };
    } catch {
      return { ...this.defaults };
    }
  }

  /** Gibt `false` zurück, wenn nicht gespeichert werden konnte. */
  save(data: T): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  /** Lädt, ändert und speichert in einem Schritt. */
  update(change: (data: T) => T): T {
    const next = change(this.load());
    this.save(next);
    return next;
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // Ohne Speicherzugriff gibt es nichts zu löschen.
    }
  }
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
