import { describe, it, expect } from 'vitest';
import { quickRank, QUICK_RANKS } from '../quickRank';

describe('quickRank', () => {
  it('0 points → first rank, progress toward next', () => {
    const r = quickRank(0);
    expect(r.key).toBe('rookie');
    expect(r.nextAt).toBe(300);
    expect(r.progress).toBe(0);
  });
  it('mid-tier progress is fractional', () => {
    const r = quickRank(550); // bronze 300..800
    expect(r.key).toBe('bronze');
    expect(r.progress).toBeCloseTo((550 - 300) / (800 - 300));
  });
  it('top rank caps with no next threshold', () => {
    const r = quickRank(999999);
    expect(r.key).toBe('legend');
    expect(r.nextAt).toBeNull();
    expect(r.progress).toBe(1);
  });
  it('thresholds ascend strictly', () => {
    const ts = QUICK_RANKS.map((r) => r.at);
    expect([...ts].sort((a, b) => a - b)).toEqual(ts);
    expect(new Set(ts).size).toBe(ts.length);
  });
  it('rank-up detection across a round', () => {
    expect(quickRank(290).key).not.toBe(quickRank(310).key);
  });
});
