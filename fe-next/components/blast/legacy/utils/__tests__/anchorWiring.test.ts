import { describe, it, expect } from 'vitest';
import { getWaveConfig, getWaveDistribution } from '@/components/blast/legacy/utils/blastWaveConfig';

// Featured roster: anchor appears at W7, W8, W10, W11 in the rotation cycle.
// FTUE cohort (waves 1-6) keeps anchor out; it unlocks at W7.
describe('anchor wiring', () => {
  it('FTUE cohort (waves 1-6) keeps anchor out of distribution', () => {
    for (let w = 1; w <= 6; w++) {
      const d = getWaveDistribution(getWaveConfig(w));
      expect(d.anchor ?? 0).toBe(0);
    }
  });
  it('wave 7+ features anchor in rotation (7, 8, 10, 11 of each 10-wave cycle)', () => {
    expect(getWaveDistribution(getWaveConfig(7)).anchor).toBeGreaterThan(0);
    expect(getWaveDistribution(getWaveConfig(8)).anchor).toBeGreaterThan(0);
    // W9 features prism+mystery, no anchor
    expect(getWaveDistribution(getWaveConfig(9)).anchor ?? 0).toBe(0);
    expect(getWaveDistribution(getWaveConfig(10)).anchor).toBeGreaterThan(0);
  });
  it('distribution sum stays ~1 even with full revival inheritance', () => {
    const d = getWaveDistribution(getWaveConfig(12));
    const s = Object.values(d).reduce((a, b) => a + b, 0);
    expect(Math.abs(s - 1)).toBeLessThan(0.01);
  });
});
