/**
 * Speichert einen Spielstand als JSON im `localStorage`. Fehler (privater Modus, voller Speicher,
 * kaputte Daten) führen nie zum Absturz – dann gelten einfach die Standardwerte.
 * Lässt der Browser das Schreiben nicht zu, bleibt der letzte Stand bis zum Neuladen im Speicher.
 * Beim Laden werden gespeicherte Felder flach über die Standardwerte gelegt, damit neue
 * Felder in späteren Versionen automatisch ihren Standardwert erhalten.
 */
export class SaveStore<T extends object> {
  private readonly storage: Storage | null;
  private ok = true;
  private unsaved: string | null = null;

  constructor(
    private readonly key: string,
    private readonly defaults: T,
    storage?: Storage | null,
    /** Prüft die geladenen Felder und ersetzt kaputte durch die Voreinstellung. */
    private readonly sanitize?: (data: T) => T,
  ) {
    this.storage = storage === undefined ? getLocalStorage() : storage;
  }

  load(): T {
    try {
      const raw = this.unsaved ?? this.storage?.getItem(this.key);
      if (!raw) return structuredClone(this.defaults);
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return structuredClone(this.defaults);
      }
      const merged = { ...structuredClone(this.defaults), ...(parsed as Partial<T>) };
      return this.sanitize ? this.sanitize(merged) : merged;
    } catch {
      return structuredClone(this.defaults);
    }
  }

  /** Gibt `false` zurück, wenn nicht gespeichert werden konnte. */
  save(data: T): boolean {
    this.ok = false;
    const json = JSON.stringify(data);
    try {
      if (!this.storage) throw new Error('kein Speicher');
      this.storage.setItem(this.key, json);
      this.unsaved = null;
      this.ok = true;
      return true;
    } catch {
      this.unsaved = json;
      return false;
    }
  }

  /** Hat das letzte Speichern (auch über `update`) geklappt? */
  get lastSaveOk(): boolean {
    return this.ok;
  }

  /** Lädt, ändert und speichert in einem Schritt. */
  update(change: (data: T) => T): T {
    const next = change(this.load());
    this.save(next);
    return next;
  }

  clear(): void {
    this.unsaved = null;
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
