import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { h, render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import { Dialog } from '../src/rocket/Dialog';

// jsdom setzt `inert` weder als Attribut noch blockiert es Fokus oder Klicks. Geprüft wird die
// Eigenschaft, nach der der Browser die Sperre einrichtet.

let app: HTMLDivElement;
let opener: HTMLButtonElement;
let hud: HTMLButtonElement;
let layer: HTMLDivElement;
let footer: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
  app = document.createElement('div');
  opener = document.createElement('button');
  opener.textContent = 'Menü';
  hud = document.createElement('button');
  hud.textContent = 'Drehen';
  layer = document.createElement('div');
  app.append(opener, hud, layer);
  footer = document.createElement('footer');
  document.body.append(app, footer);
});

afterEach(() => {
  render(null, layer);
});

function open(...children: ComponentChildren[]): Promise<void> {
  return act(() => render(h(Dialog, { label: 'Menü', children }), layer));
}

describe('Dialog: Sperre des Hintergrunds und Fokus', () => {
  it('beim Öffnen werden die Geschwister inert, der Dialog selbst bleibt bedienbar', async () => {
    await open(h('button', { class: 'primary' }, 'Weiter'));
    expect(opener.inert).toBe(true);
    expect(hud.inert).toBe(true);
    expect(footer.inert).toBe(true);
    expect(app.inert).toBeFalsy();
    expect(layer.querySelector<HTMLElement>('[role="dialog"]')!.inert).toBeFalsy();
  });

  it('der Dialog bekommt beim Öffnen den Fokus auf seinen Hauptknopf', async () => {
    opener.focus();
    await open(
      h('button', { class: 'secondary' }, 'Abbrechen'),
      h('button', { class: 'primary' }, 'Weiter'),
    );
    expect(document.activeElement).toBe(layer.querySelector('.primary'));
  });

  it('beim Schließen wird die Sperre aufgehoben und der Fokus an den auslösenden Knopf zurückgegeben', async () => {
    opener.focus();
    await open(h('button', { class: 'primary' }, 'Weiter'));
    await act(() => render(null, layer));
    expect(opener.inert).toBeFalsy();
    expect(hud.inert).toBeFalsy();
    expect(footer.inert).toBeFalsy();
    expect(document.activeElement).toBe(opener);
  });

  it('Geschwister, die schon vorher gesperrt waren, bleiben nach dem Schließen gesperrt', async () => {
    footer.inert = true;
    await open(h('button', { class: 'primary' }, 'Weiter'));
    await act(() => render(null, layer));
    expect(footer.inert).toBe(true);
    expect(hud.inert).toBeFalsy();
  });
});
