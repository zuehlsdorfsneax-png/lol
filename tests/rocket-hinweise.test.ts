import { describe, expect, it } from 'vitest';
import { Flight } from '../src/rocket/flight';
import { tipFor } from '../src/rocket/FlightScreen';

describe('Starttipp', () => {
  it('verspricht das All nur, wenn das Δv dafür reicht', () => {
    const f = new Flight(['kapsel', 'tank-xs', 'kolibri']);
    expect(f.deltaV()).toBeLessThan(2500);
    expect(tipFor(f, null)).not.toContain('reicht es ins All');
  });
});
