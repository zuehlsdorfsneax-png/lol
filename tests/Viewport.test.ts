import { describe, expect, it } from 'vitest';
import { fitToContainer } from '../src/engine';

describe('fitToContainer', () => {
  it('füllt die Breite, wenn der Container verhältnismäßig höher ist', () => {
    expect(fitToContainer(480, 1000, 960, 540, 1)).toEqual({
      cssWidth: 480,
      cssHeight: 270,
      canvasWidth: 480,
      canvasHeight: 270,
    });
  });

  it('füllt die Höhe, wenn der Container verhältnismäßig breiter ist', () => {
    const fit = fitToContainer(3000, 1080, 960, 540, 1);
    expect(fit.cssWidth).toBe(1920);
    expect(fit.cssHeight).toBe(1080);
  });

  it('berücksichtigt die Pixeldichte für eine scharfe Darstellung', () => {
    const fit = fitToContainer(960, 540, 960, 540, 2);
    expect(fit).toMatchObject({ cssWidth: 960, canvasWidth: 1920, canvasHeight: 1080 });
  });

  it('liefert nie eine Canvas-Größe von 0', () => {
    const fit = fitToContainer(0, 0, 960, 540, 1);
    expect(fit.canvasWidth).toBe(1);
    expect(fit.canvasHeight).toBe(1);
  });
});
