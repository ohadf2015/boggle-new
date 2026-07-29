import { describe, it, expect } from 'vitest';
import { getWaveConfig, getWaveDistribution } from '@/components/blast/legacy/utils/blastWaveConfig';

// Revival sprint 2026-05-10: anchor un-retired at wave 8+. FTUE cohort
// (waves 1-7) still locks anchor out so first-time players don't see it.
describe('anchor wiring', () => {
  it('FTUE cohort (waves 1-7) keeps anchor out of distribution', () => {
    for (let w = 1; w <= 7; w++) {
      const d = getWaveDistribution(getWaveConfig(w));
      expect(d.anchor ?? 0).toBe(0);
    }
  });
  it('wave 8+ ships anchor (revival staircase 1/4)', () => {
    expect(getWaveDistribution(getWaveConfig(8)).anchor).toBeGreaterThan(0);
    expect(getWaveDistribution(getWaveConfig(12)).anchor).toBeGreaterThan(0);
  });
  it('distribution sum stays ~1 even with full revival inheritance', () => {
    const d = getWaveDistribution(getWaveConfig(12));
    const s = Object.values(d).reduce((a, b) => a + b, 0);
    expect(Math.abs(s - 1)).toBeLessThan(0.01);
  });
});
