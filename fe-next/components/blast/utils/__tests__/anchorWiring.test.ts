import { describe, it, expect } from 'vitest';
import { getWaveConfig, getWaveDistribution } from '@/components/blast/utils/blastWaveConfig';

// Sprint 1: anchor retired. Suite kept as a regression guard so a future
// re-enable trips loud — the wiring code that gates anchor on its config
// flag is still on the hot path and could leak the tile back if flipped.
describe('anchor wiring (Sprint 1: retired)', () => {
  it('wave 7 has anchor=0', () => {
    const d = getWaveDistribution(getWaveConfig(7));
    expect(d.anchor ?? 0).toBe(0);
  });
  it('wave 8 still has anchor=0 (retired)', () => {
    const d = getWaveDistribution(getWaveConfig(8));
    expect(d.anchor ?? 0).toBe(0);
  });
  it('wave 12 still has anchor=0 (retired)', () => {
    const d = getWaveDistribution(getWaveConfig(12));
    expect(d.anchor ?? 0).toBe(0);
  });
  it('distribution sum stays ~1', () => {
    const d = getWaveDistribution(getWaveConfig(12));
    const s = Object.values(d).reduce((a,b)=>a+b,0);
    expect(Math.abs(s-1)).toBeLessThan(0.01);
  });
});
