import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { SimulatorPage, csvHeader } from '../../src/pages/SimulatorPage';
import { REAL_PARAMS } from '../../src/physics';
import { radiusAfterFrameChange } from '../../src/sim/view';
import { DEFAULT_SETTINGS } from '../../src/sim/Simulation';

// jsdom hat weder ResizeObserver noch matchMedia noch einen Canvas-Kontext. Die Größe bleibt 0,
// deshalb wird nichts gezeichnet; die Zeitsteuerung und die Bedienelemente laufen trotzdem.

let root: HTMLDivElement;
// Jeder Aufruf von performance.now() verbraucht Rechenzeit; sonst liefe die Schleife in onFrame
// bei einem Schritt ohne Zeitgewinn ewig.
let verbrauchProAufruf: number;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  const fake = performance.now.bind(performance);
  let verbraucht = 0;
  verbrauchProAufruf = 0.05;
  vi.spyOn(performance, 'now').mockImplementation(
    () => fake() + (verbraucht += verbrauchProAufruf),
  );
  root = document.createElement('div');
  document.body.append(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function open(preset: string | null): Promise<void> {
  await act(() => {
    render(h(SimulatorPage, { preset }), root);
  });
}

async function frames(n: number): Promise<void> {
  for (let i = 0; i < n; i++)
    await act(() => {
      vi.advanceTimersByTime(16);
    });
}

const clock = (): string => root.querySelector('.clock')!.textContent;

function button(name: string): HTMLButtonElement {
  const b = [...root.querySelectorAll('button')].find((x) => x.textContent?.trim() === name);
  if (!b) throw new Error(`Knopf „${name}“ fehlt`);
  return b;
}

const press = (name: string): Promise<void> =>
  act(() => {
    const b = button(name);
    b.focus();
    b.click();
  });

async function choose(id: string): Promise<void> {
  const select = root.querySelector<HTMLSelectElement>('#preset')!;
  select.value = id;
  await act(() => {
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('Simulator: Voreinstellung wechseln', () => {
  it('startet auch dann neu, wenn beide Voreinstellungen dieselben Parameter haben', async () => {
    await open('real');
    await press('1 Monat/s');
    await frames(30);
    expect(clock()).toMatch(/Tage$/);
    await choose('mondbahn-sonne');
    expect(clock()).toBe('t = 0,0 h');
  });
});

describe('Simulator: Adresse und Hinweis zur Voreinstellung', () => {
  it('schreibt die gewählte Voreinstellung in die Adresse', async () => {
    history.replaceState(null, '', '#simulator');
    await open(null);
    await choose('roche');
    expect(location.hash).toBe('#sim-roche');
  });

  it('nimmt den Hinweis auf eine unbekannte Voreinstellung nach der Auswahl zurück', async () => {
    history.replaceState(null, '', '#sim-foo');
    await open('foo');
    expect(root.querySelector('.notice')?.textContent).toContain('„foo“ gibt es nicht');
    await choose('roche');
    expect(root.querySelector('.notice')).toBeNull();
  });
});

describe('Simulator: Ereigniskarte', () => {
  async function untilEvent(): Promise<HTMLElement> {
    await open('absturz');
    await press('1 Woche/s');
    await frames(80);
    const card = root.querySelector<HTMLElement>('.event-card');
    if (!card) throw new Error('Keine Ereigniskarte');
    return card;
  }

  it('nimmt den Fokus, deckt das HUD nicht ab und gibt den Fokus zurück', async () => {
    const card = await untilEvent();
    expect(document.activeElement?.textContent).toBe('Weiterrechnen');
    expect(root.querySelector('.hud-tl')).toBeNull();
    await act(() => {
      card
        .querySelector('button')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(root.querySelector('.event-card')).toBeNull();
    expect(root.querySelector('.hud-tl')).not.toBeNull();
    expect(document.activeElement?.textContent).toBe('1 Woche/s');
  });
});

describe('Simulator: Zeitachse der Diagramme', () => {
  it('die Tabelle nennt nach 2,4 Tagen keine Zeit doppelt', async () => {
    await open('real');
    await frames(22);
    await press('Tabelle');
    const zeiten = [...root.querySelectorAll('.chart table.data tbody td:first-child')].map(
      (td) => td.textContent,
    );
    expect(zeiten.length).toBeGreaterThan(3);
    expect(new Set(zeiten).size).toBe(zeiten.length);
  });
});

describe('Simulator: Hinweis „Rechenleistung begrenzt“', () => {
  it('verschwindet, sobald nicht mehr gerechnet wird', async () => {
    await open('teilchen');
    verbrauchProAufruf = 4;
    await press('25 Jahre/s');
    await frames(3);
    expect(root.textContent).toContain('Rechenleistung begrenzt');
    await press('Pause');
    await frames(2);
    expect(root.textContent).not.toContain('Rechenleistung begrenzt');
  });
});

describe('Simulator: CSV-Kopf', () => {
  it('schreibt Dezimalkomma und lässt die Erdbahn ohne Sonne weg', () => {
    const kopf = csvHeader(REAL_PARAMS, DEFAULT_SETTINGS);
    expect(kopf).toContain('Erdbahn 1 AE, e = 0,0167');
    expect(kopf).toContain('v = 1,0271 × vₖ');
    expect(csvHeader({ ...REAL_PARAMS, sunMass: 0 }, DEFAULT_SETTINGS)).not.toContain('Erdbahn');
  });
});

describe('Simulator: Bildradius beim Wechsel des Bezugssystems', () => {
  it('holt Erde und Mond aus der Sonnenbahn-Ansicht zurück', () => {
    expect(radiusAfterFrameChange('earth', 1.6e11)).toBe(4e9);
    expect(radiusAfterFrameChange('rotating', 2e9)).toBe(2e9);
    expect(radiusAfterFrameChange('inertial', 3e8)).toBe(1e9);
  });
});
