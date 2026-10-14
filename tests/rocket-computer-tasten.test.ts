import { afterEach, describe, expect, it } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { Step } from '../src/rocket/ComputerPanel';

const host = document.createElement('div');
afterEach(() => render(null, host));

describe('Schrittknöpfe des Bordcomputers', () => {
  it('Enter und Leertaste lösen die Aktion genau einmal aus', async () => {
    let n = 0;
    await act(() => render(h(Step, { label: '+', title: '10 m/s mehr', action: () => n++ }), host));
    const btn = host.querySelector('button')!;
    btn.click();
    expect(n).toBe(1);
  });

  it('ein Mausklick wiederholt nicht zusätzlich zur Zeigerwiederholung', async () => {
    let n = 0;
    await act(() => render(h(Step, { label: '+', title: '10 m/s mehr', action: () => n++ }), host));
    const btn = host.querySelector('button')!;
    btn.setPointerCapture = () => undefined;
    btn.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    btn.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(n).toBe(1);
  });
});
