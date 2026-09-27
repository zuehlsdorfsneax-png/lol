import { afterEach, describe, expect, it } from 'vitest';
import { Input } from '../../src/engine';

const bindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space'],
};

describe('Input', () => {
  it('bildet mehrere Tasten auf eine Aktion ab', () => {
    const input = new Input(bindings);
    input.handleKeyDown('KeyA');
    expect(input.isDown('left')).toBe(true);
    expect(input.isDown('right')).toBe(false);
    input.handleKeyUp('KeyA');
    input.handleKeyDown('ArrowLeft');
    expect(input.isDown('left')).toBe(true);
  });

  it('meldet "gerade gedrückt" genau bis zum Ende des Schritts', () => {
    const input = new Input(bindings);
    input.handleKeyDown('Space');
    expect(input.wasPressed('jump')).toBe(true);
    input.endStep();
    expect(input.wasPressed('jump')).toBe(false);
    expect(input.isDown('jump')).toBe(true);

    input.handleKeyUp('Space');
    expect(input.wasReleased('jump')).toBe(true);
    input.endStep();
    expect(input.wasReleased('jump')).toBe(false);
  });

  it('verliert kurze Tastendrücke zwischen zwei Schritten nicht', () => {
    const input = new Input(bindings);
    input.handleKeyDown('Space');
    input.handleKeyUp('Space');
    expect(input.isDown('jump')).toBe(false);
    expect(input.wasPressed('jump')).toBe(true);
  });

  it('ignoriert Tastenwiederholung', () => {
    const input = new Input(bindings);
    input.handleKeyDown('Space');
    input.endStep();
    input.handleKeyDown('Space', true);
    expect(input.wasPressed('jump')).toBe(false);
  });

  it('liefert Achsenwerte', () => {
    const input = new Input(bindings);
    expect(input.axis('left', 'right')).toBe(0);
    input.handleKeyDown('KeyD');
    expect(input.axis('left', 'right')).toBe(1);
    input.handleKeyDown('KeyA');
    expect(input.axis('left', 'right')).toBe(0);
    input.handleKeyUp('KeyD');
    expect(input.axis('left', 'right')).toBe(-1);
  });

  it('verfolgt den Zeiger', () => {
    const input = new Input(bindings);
    input.handlePointerDown(10, 20);
    expect(input.pointer).toMatchObject({ x: 10, y: 20, down: true, pressed: true });
    input.endStep();
    input.handlePointerMove(30, 40);
    expect(input.pointer).toMatchObject({ x: 30, y: 40, down: true, pressed: false });
    input.handlePointerUp(30, 40);
    expect(input.pointer).toMatchObject({ down: false, released: true });
  });

  it('vergisst beim Zurücksetzen alle gehaltenen Tasten', () => {
    const input = new Input(bindings);
    input.handleKeyDown('KeyA');
    input.handlePointerDown(1, 1);
    input.reset();
    expect(input.isDown('left')).toBe(false);
    expect(input.pointer.down).toBe(false);
  });

  describe('attach', () => {
    let detach: (() => void) | undefined;
    afterEach(() => detach?.());

    it('verarbeitet Tastatur-Events und verhindert das Standardverhalten belegter Tasten', () => {
      const input = new Input(bindings);
      detach = input.attach(document.createElement('canvas'), (x, y) => ({ x, y }));

      const bound = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
      window.dispatchEvent(bound);
      expect(input.isDown('jump')).toBe(true);
      expect(bound.defaultPrevented).toBe(true);

      const unbound = new KeyboardEvent('keydown', { code: 'KeyZ', cancelable: true });
      window.dispatchEvent(unbound);
      expect(unbound.defaultPrevented).toBe(false);

      const shortcut = new KeyboardEvent('keydown', {
        code: 'KeyA',
        ctrlKey: true,
        cancelable: true,
      });
      window.dispatchEvent(shortcut);
      expect(shortcut.defaultPrevented).toBe(false);
    });

    it('setzt Tasten zurück, wenn das Fenster den Fokus verliert', () => {
      const input = new Input(bindings);
      detach = input.attach(document.createElement('canvas'), (x, y) => ({ x, y }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      window.dispatchEvent(new Event('blur'));
      expect(input.isDown('right')).toBe(false);
    });

    it('entfernt alle Listener wieder', () => {
      const input = new Input(bindings);
      input.attach(document.createElement('canvas'), (x, y) => ({ x, y }))();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(input.isDown('jump')).toBe(false);
    });
  });
});
