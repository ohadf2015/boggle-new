import { describe, it, expect } from 'vitest';
import { getWaveConfig, getWaveDistribution } from '@/components/blast/utils/blastWaveConfig';
describe('anchor wiring', () => {
  it('wave 7 has anchor=0', () => {
    const d = getWaveDistribution(getWaveConfig(7));
    expect(d.anchor ?? 0).toBe(0);
  });
  it('wave 8 has anchor>0', () => {
    const d = getWaveDistribution(getWaveConfig(8));
    expect(d.anchor).toBeGreaterThan(0);
  });
  it('wave 12 has anchor>0', () => {
    const d = getWaveDistribution(getWaveConfig(12));
    expect(d.anchor).toBeGreaterThan(0);
  });
  it('distribution sum stays ~1', () => {
    const d = getWaveDistribution(getWaveConfig(12));
    const s = Object.values(d).reduce((a,b)=>a+b,0);
    expect(Math.abs(s-1)).toBeLessThan(0.01);
  });
});
