import { describe, expect, it } from 'vitest';
import { KM, runStability, scenarioInfo, type ScenarioParams } from '../src/physics';
import { AXES, DEFAULT_BASE, sliderRange, type AxisKey } from '../src/stability/axes';

function paramsAt(axis: AxisKey, v: number): ScenarioParams {
  if (axis !== 'moonDistanceRH') return { ...DEFAULT_BASE, [axis]: v };
  const rh = scenarioInfo(DEFAULT_BASE).hillRadius / KM;
  return { ...DEFAULT_BASE, moonDistance: v * rh };
}

describe('Regler der Stabilitätskarte', () => {
  it.each(Object.keys(AXES) as AxisKey[])(
    '%s: beide Reglerenden rechnen mit endlichen Werten',
    (axis) => {
      const { lo, hi } = sliderRange(axis);
      for (const v of [lo, hi]) {
        const r = runStability(paramsAt(axis, v), { years: 1 });
        expect(Number.isFinite(r.minDistance), `${axis} = ${v}`).toBe(true);
        expect(r.maxDistance).toBeGreaterThan(0);
      }
    },
  );

  it('der Regelbereich enthält die Voreinstellung jeder Achse', () => {
    for (const axis of Object.keys(AXES) as AxisKey[]) {
      const { lo, hi } = sliderRange(axis);
      expect(lo).toBeLessThanOrEqual(AXES[axis].min);
      expect(hi).toBeGreaterThanOrEqual(AXES[axis].max);
    }
  });
});
