import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { Slider } from '../src/ui/controls';
import { LineChart } from '../src/ui/charts/LineChart';
import { duration, sci } from '../src/ui/format';

let root: HTMLDivElement;

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
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  render(null, root);
  root.remove();
  vi.unstubAllGlobals();
});

describe('Slider mit Schrittweite', () => {
  it('trägt die echten Werte, damit ein Pfeiltastenschritt genau eine Stufe weitergeht', async () => {
    const seen: number[] = [];
    await act(() => {
      render(
        h(Slider, {
          id: 'winkel',
          label: 'Winkel',
          value: 35,
          min: 0,
          max: 360,
          step: 5,
          onChange: (v: number) => seen.push(v),
        }),
        root,
      );
    });
    const input = root.querySelector('input')!;
    expect([input.min, input.max, input.step]).toEqual(['0', '360', '5']);
    await act(() => {
      input.value = '40';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(seen).toEqual([40]);
  });
});

describe('LineChart', () => {
  it('behält die Zeichenfläche, wenn die Tabelle ein- und wieder ausgeschaltet wird', async () => {
    await act(() => {
      render(
        h(LineChart, {
          title: 'Test',
          xLabel: 'x',
          yLabel: 'y',
          xFormat: String,
          yFormat: String,
          series: [{ id: 'a', label: 'a', x: [0, 1], y: [0, 1] }],
        }),
        root,
      );
    });
    const canvas = root.querySelector('canvas');
    const toggle = root.querySelector('button')!;
    await act(() => toggle.click());
    expect(root.querySelector('table')).not.toBeNull();
    await act(() => toggle.click());
    expect(root.querySelector('table')).toBeNull();
    expect(root.querySelector('canvas')).toBe(canvas);
  });
});

describe('sci', () => {
  it('rundet die Mantisse nicht auf 10', () => {
    expect(sci(9.996e-7)).toBe('1,00 · 10⁻⁶');
    expect(sci(0.0099996)).toBe('1,00 · 10⁻²');
    expect(sci(1.234e-6)).toBe('1,23 · 10⁻⁶');
  });
});

describe('duration', () => {
  it('steht nach "nach" im Dativ', () => {
    expect(duration(5 * 86400, true)).toBe('5,0 Tagen');
    expect(duration(3 * 3.15576e7, true)).toBe('3,00 Jahren');
    expect(duration(5 * 86400)).toBe('5,0 Tage');
  });
});
