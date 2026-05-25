import { describe, it, expect } from 'vitest';
import { beamWidthFor, BEAM_MIN_PX, BEAM_MAX_PX } from '../craneBeam';

describe('beamWidthFor — held crane beam width scales with word length', () => {
  it('short words clamp to the minimum', () => {
    expect(beamWidthFor(1)).toBe(BEAM_MIN_PX);
    expect(beamWidthFor(2)).toBe(BEAM_MIN_PX);
  });

  it('long words clamp to the maximum (so the crane never overflows the bay)', () => {
    expect(beamWidthFor(40)).toBe(BEAM_MAX_PX);
  });

  it('mid-length words scale monotonically (longer ⇒ wider)', () => {
    const w4 = beamWidthFor(4);
    const w6 = beamWidthFor(6);
    const w8 = beamWidthFor(8);
    expect(w4).toBeLessThan(w6);
    expect(w6).toBeLessThan(w8);
  });

  it('all returned widths stay within [BEAM_MIN_PX, BEAM_MAX_PX]', () => {
    for (let n = 0; n <= 30; n++) {
      const w = beamWidthFor(n);
      expect(w).toBeGreaterThanOrEqual(BEAM_MIN_PX);
      expect(w).toBeLessThanOrEqual(BEAM_MAX_PX);
    }
  });
});
