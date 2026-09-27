export interface AssetManifest {
  images?: Record<string, string>;
  json?: Record<string, string>;
}

/**
 * Lädt Bilder und JSON-Dateien vorab und stellt sie über einen Schlüssel bereit.
 * URLs stammen entweder aus `public/` (z. B. "assets/player.png") oder aus einem Vite-Import
 * (`import playerUrl from './assets/player.png'`).
 */
export class AssetLoader {
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly data = new Map<string, unknown>();

  async loadImage(key: string, url: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch (cause) {
      throw new Error(`Bild konnte nicht geladen werden: ${url}`, { cause });
    }
    this.images.set(key, image);
    return image;
  }

  async loadJson<T = unknown>(key: string, url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`JSON konnte nicht geladen werden: ${url} (HTTP ${response.status})`);
    }
    const value = (await response.json()) as T;
    this.data.set(key, value);
    return value;
  }

  /** Lädt alles aus dem Manifest parallel und meldet den Fortschritt (z. B. für einen Ladebalken). */
  async loadAll(
    manifest: AssetManifest,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<void> {
    const tasks = [
      ...Object.entries(manifest.images ?? {}).map(
        ([key, url]) =>
          () =>
            this.loadImage(key, url),
      ),
      ...Object.entries(manifest.json ?? {}).map(
        ([key, url]) =>
          () =>
            this.loadJson(key, url),
      ),
    ];
    let loaded = 0;
    onProgress?.(loaded, tasks.length);
    await Promise.all(
      tasks.map(async (task) => {
        await task();
        onProgress?.(++loaded, tasks.length);
      }),
    );
  }

  image(key: string): HTMLImageElement {
    const image = this.images.get(key);
    if (!image) throw new Error(`Unbekanntes Bild: "${key}" – wurde es geladen?`);
    return image;
  }

  json<T = unknown>(key: string): T {
    if (!this.data.has(key))
      throw new Error(`Unbekannte JSON-Daten: "${key}" – wurden sie geladen?`);
    return this.data.get(key) as T;
  }
}
