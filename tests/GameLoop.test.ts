import { describe, expect, it, vi } from 'vitest';
import { GameLoop, type FrameScheduler } from '../src/engine';

function createLoop(step = 0.25, maxFrameTime = 1) {
  const update = vi.fn<(dt: number) => void>();
  const render = vi.fn<(alpha: number) => void>();
  const loop = new GameLoop(update, render, { step, maxFrameTime });
  return { loop, update, render };
}

/** Scheduler, der Frames erst auf Anforderung des Tests ausführt. */
function manualScheduler() {
  let pending: ((time: number) => void) | null = null;
  const scheduler: FrameScheduler = {
    request: (callback) => {
      pending = callback;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
  };
  return {
    scheduler,
    frame(time: number) {
      const callback = pending;
      pending = null;
      callback?.(time);
    },
    get hasPending() {
      return pending !== null;
    },
  };
}

describe('GameLoop', () => {
  it('rendert im ersten Frame nur, ohne zu aktualisieren', () => {
    const { loop, update, render } = createLoop();
    loop.tick(1000);
    expect(update).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledWith(0);
  });

  it('führt feste Schritte aus und übergibt den Rest als alpha', () => {
    const { loop, update, render } = createLoop(0.25);
    loop.tick(0);

    loop.tick(500); // 0,5 s → 2 Schritte
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(0.25);
    expect(render).toHaveBeenLastCalledWith(0);

    loop.tick(625); // +0,125 s → kein Schritt, halber Schritt übrig
    expect(update).toHaveBeenCalledTimes(2);
    expect(render).toHaveBeenLastCalledWith(0.5);

    loop.tick(750); // Rest summiert sich zu einem vollen Schritt
    expect(update).toHaveBeenCalledTimes(3);
    expect(render).toHaveBeenLastCalledWith(0);
  });

  it('begrenzt sehr lange Frames auf maxFrameTime', () => {
    const { loop, update } = createLoop(0.25, 1);
    loop.tick(0);
    loop.tick(60_000);
    expect(update).toHaveBeenCalledTimes(4);
  });

  it('ignoriert rückwärts laufende Zeit', () => {
    const { loop, update } = createLoop();
    loop.tick(1000);
    loop.tick(500);
    expect(update).not.toHaveBeenCalled();
  });

  it('läuft über den Scheduler und stoppt auch aus einem Update heraus', () => {
    const frames = manualScheduler();
    const updates: number[] = [];
    const loop: GameLoop = new GameLoop(
      () => {
        updates.push(1);
        if (updates.length === 3) loop.stop();
      },
      () => {},
      { step: 0.25, scheduler: frames.scheduler },
    );

    loop.start();
    expect(loop.running).toBe(true);
    frames.frame(0);
    frames.frame(250);
    frames.frame(500);
    expect(frames.hasPending).toBe(true);
    frames.frame(750);
    expect(updates).toHaveLength(3);
    expect(loop.running).toBe(false);
    expect(frames.hasPending).toBe(false);
  });

  it('beginnt nach einem Neustart ohne Zeitsprung', () => {
    const frames = manualScheduler();
    const update = vi.fn();
    const loop = new GameLoop(update, () => {}, { step: 0.25, scheduler: frames.scheduler });

    loop.start();
    frames.frame(0);
    loop.stop();
    loop.start();
    frames.frame(100_000);
    expect(update).not.toHaveBeenCalled();
  });
});
