import { describe, it, expect } from 'vitest';
import { dayDeltaSentence, formatDelta } from '../delta';

const t = (_k: string, fb?: string, p: Record<string, string | number> = {}) => (fb ?? '').replace(/\{(\w+)\}/g, (_, n: string) => String(p[n]));
const LRI = '⁦';
const PDI = '⁩';

describe('formatDelta', () => {
  it('isolates the signed percent so a minus or plus sign stays on the number in right-to-left text', () => {
    expect(formatDelta({ current: 5, prior: 10, pct: -50 })).toBe(`${LRI}-50%${PDI}`);
    expect(formatDelta({ current: 15, prior: 10, pct: 50 })).toBe(`${LRI}+50%${PDI}`);
  });
  it('has nothing to show without a baseline', () => {
    expect(formatDelta({ current: 5, prior: 0, pct: null })).toBeNull();
  });
});

describe('dayDeltaSentence', () => {
  it('says it is too early to compare in the first hours', () => {
    expect(dayDeltaSentence({ prior: 40, projected: null, pct: null }, t)).toBe('Yesterday: 40. Too early in the day to compare.');
  });
  it('gives the pace, the change and yesterday without wrapping mixed text in parentheses', () => {
    expect(dayDeltaSentence({ prior: 66, projected: 64, pct: -3 }, t)).toBe(`At this pace: 64 · ${LRI}-3%${PDI} vs yesterday (66)`);
  });
  it('says so plainly when both days are empty', () => {
    expect(dayDeltaSentence({ prior: 0, projected: 0, pct: null }, t)).toBe('None today and none yesterday either');
  });
  it('does not invent a percent when yesterday was empty', () => {
    expect(dayDeltaSentence({ prior: 0, projected: 12, pct: null }, t)).toBe('At this pace: 12 (yesterday: 0)');
  });
});
