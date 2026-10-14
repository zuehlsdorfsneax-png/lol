import { describe, expect, it } from 'vitest';
import { niceTicks, tickDigits } from '../src/ui/charts/ticks';

describe('tickDigits', () => {
  it('ganze Zahlen brauchen keine Nachkommastelle', () => {
    expect(tickDigits(niceTicks(0, 15.4, 4))).toBe(0);
  });

  it('Schritt 0,5 und Schritt 2,5 brauchen eine Stelle', () => {
    expect(tickDigits(niceTicks(0, 2.4, 5))).toBe(1);
    expect(tickDigits(niceTicks(0, 14, 6))).toBe(1);
  });

  it('feine Teilung bis 0,05 braucht zwei Stellen', () => {
    expect(tickDigits(niceTicks(0, 0.2, 4))).toBe(2);
  });
});
