import { beforeEach, describe, expect, it } from 'vitest';
import { SaveStore } from '../../src/engine';

const defaults = { highscore: 0, name: 'Spieler' };

describe('SaveStore', () => {
  beforeEach(() => localStorage.clear());

  it('liefert Standardwerte, solange nichts gespeichert ist', () => {
    expect(new SaveStore('test', defaults).load()).toEqual(defaults);
  });

  it('speichert und lädt Daten', () => {
    const store = new SaveStore('test', defaults);
    expect(store.save({ highscore: 42, name: 'Ada' })).toBe(true);
    expect(new SaveStore('test', defaults).load()).toEqual({ highscore: 42, name: 'Ada' });
  });

  it('ergänzt fehlende Felder aus den Standardwerten', () => {
    localStorage.setItem('test', JSON.stringify({ highscore: 7 }));
    expect(new SaveStore('test', defaults).load()).toEqual({ highscore: 7, name: 'Spieler' });
  });

  it('fällt bei kaputten Daten auf die Standardwerte zurück', () => {
    localStorage.setItem('test', '{kaputt');
    expect(new SaveStore('test', defaults).load()).toEqual(defaults);
    localStorage.setItem('test', '[1, 2]');
    expect(new SaveStore('test', defaults).load()).toEqual(defaults);
  });

  it('gibt keine Referenz auf die Standardwerte heraus', () => {
    const store = new SaveStore('test', defaults);
    store.load().highscore = 99;
    expect(store.load().highscore).toBe(0);
  });

  it('aktualisiert in einem Schritt und kann löschen', () => {
    const store = new SaveStore('test', defaults);
    store.update((data) => ({ ...data, highscore: data.highscore + 5 }));
    expect(store.load().highscore).toBe(5);
    store.clear();
    expect(store.load()).toEqual(defaults);
  });

  it('funktioniert ohne verfügbaren Speicher', () => {
    const store = new SaveStore('test', defaults, null);
    expect(store.save({ highscore: 1, name: 'x' })).toBe(false);
    expect(store.load()).toEqual(defaults);
  });

  it('fängt Fehler beim Schreiben ab (z. B. voller Speicher)', () => {
    const failing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    } as unknown as Storage;
    expect(new SaveStore('test', defaults, failing).save(defaults)).toBe(false);
  });
});
