import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetLoader } from '../src/engine';

afterEach(() => vi.unstubAllGlobals());

describe('AssetLoader', () => {
  it('lädt JSON-Dateien und meldet den Fortschritt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => Promise.resolve(Response.json({ url }))),
    );
    const assets = new AssetLoader();
    const progress: Array<[number, number]> = [];

    await assets.loadAll({ json: { a: 'a.json', b: 'b.json' } }, (loaded, total) =>
      progress.push([loaded, total]),
    );

    expect(assets.json('a')).toEqual({ url: 'a.json' });
    expect(assets.json('b')).toEqual({ url: 'b.json' });
    expect(progress).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });

  it('meldet HTTP-Fehler verständlich', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('nicht gefunden', { status: 404 }))),
    );
    await expect(new AssetLoader().loadJson('level', 'level.json')).rejects.toThrow(
      'level.json (HTTP 404)',
    );
  });

  it('wirft bei unbekannten Schlüsseln', () => {
    const assets = new AssetLoader();
    expect(() => assets.image('fehlt')).toThrow('Unbekanntes Bild');
    expect(() => assets.json('fehlt')).toThrow('Unbekannte JSON-Daten');
  });
});
