import { describe, expect, it } from 'vitest';
import { SceneManager, type Scene } from '../src/engine';

function createScene(name: string, log: string[], transparent = false): Scene {
  return {
    transparent,
    enter: () => log.push(`${name}:enter`),
    exit: () => log.push(`${name}:exit`),
    pause: () => log.push(`${name}:pause`),
    resume: () => log.push(`${name}:resume`),
    update: (dt) => log.push(`${name}:update(${dt})`),
    render: (_ctx, alpha) => log.push(`${name}:render(${alpha})`),
  };
}

const ctx = { save: () => {}, restore: () => {} } as unknown as CanvasRenderingContext2D;

describe('SceneManager', () => {
  it('ruft Lebenszyklus-Hooks bei push und pop auf', () => {
    const log: string[] = [];
    const scenes = new SceneManager();
    const a = createScene('a', log);
    const b = createScene('b', log);

    scenes.push(a);
    scenes.push(b);
    expect(scenes.current).toBe(b);
    expect(scenes.pop()).toBe(b);
    expect(scenes.current).toBe(a);
    expect(log).toEqual(['a:enter', 'a:pause', 'b:enter', 'b:exit', 'a:resume']);
  });

  it('beendet beim Ersetzen alle bisherigen Szenen', () => {
    const log: string[] = [];
    const scenes = new SceneManager();
    scenes.push(createScene('a', log));
    scenes.push(createScene('b', log));
    log.length = 0;

    scenes.replace(createScene('c', log));
    expect(scenes.size).toBe(1);
    expect(log).toEqual(['b:exit', 'a:exit', 'c:enter']);
  });

  it('aktualisiert nur die oberste Szene', () => {
    const log: string[] = [];
    const scenes = new SceneManager();
    scenes.push(createScene('a', log));
    scenes.push(createScene('b', log));
    log.length = 0;

    scenes.update(0.5);
    expect(log).toEqual(['b:update(0.5)']);
  });

  it('zeichnet Szenen unter transparenten Overlays mit alpha 1', () => {
    const log: string[] = [];
    const scenes = new SceneManager();
    scenes.push(createScene('hidden', log));
    scenes.push(createScene('game', log));
    scenes.push(createScene('overlay', log, true));
    log.length = 0;

    scenes.render(ctx, 0.3);
    expect(log).toEqual(['game:render(1)', 'overlay:render(0.3)']);
  });

  it('kommt mit einem leeren Stapel zurecht', () => {
    const scenes = new SceneManager();
    expect(scenes.pop()).toBeUndefined();
    expect(() => scenes.update(1)).not.toThrow();
    expect(() => scenes.render(ctx, 0)).not.toThrow();
  });
});
