import { describe, it, expect } from 'vitest';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';
import { summarizeAwards } from '../awardsSummary';

const a = (count: number, extra: Partial<Achievement> = {}): Achievement => ({
  count,
  category: 'progress',
  icon: '⭐',
  nameKey: 'n',
  descriptionKey: 'd',
  isSecret: false,
  ...extra,
});

describe('summarizeAwards', () => {
  it('given no achievements, when summarized, then everything is zero and nothing is next', () => {
    const s = summarizeAwards({});
    expect(s).toMatchObject({ earned: 0, total: 0, next: null });
    expect(s.tiers).toEqual({ BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 });
  });

  it('given mixed counts, when summarized, then earned and per-tier counts follow the tier thresholds', () => {
    const s = summarizeAwards({ x: a(0), b: a(1), c: a(14), s: a(15), g: a(80), p: a(300) });
    expect(s.earned).toBe(5);
    expect(s.total).toBe(6);
    expect(s.tiers).toEqual({ BRONZE: 2, SILVER: 1, GOLD: 1, PLATINUM: 1 });
  });

  it('given several in progress, when summarized, then next is the one closest to its next tier', () => {
    const s = summarizeAwards({ far: a(2), close: a(13), gold: a(20) });
    expect(s.next).toMatchObject({ id: 'close', count: 13, threshold: 15, nextTier: 'SILVER', left: 2 });
    expect(s.next?.pct).toBeCloseTo(13 / 15);
  });

  it('given nothing earned yet, when summarized, then next is a first award at 0 of 1, never a hidden secret', () => {
    const s = summarizeAwards({ secret: a(0, { isSecret: true }), plain: a(0) });
    expect(s.next).toMatchObject({ id: 'plain', count: 0, threshold: 1, nextTier: 'BRONZE', left: 1, pct: 0 });
  });

  it('given every award maxed, when summarized, then nothing is next', () => {
    expect(summarizeAwards({ p: a(300), q: a(999) }).next).toBeNull();
  });

  it('given a tie in progress, when summarized, then fewer steps left wins, then the id breaks the tie', () => {
    expect(summarizeAwards({ b: a(1), a: a(1) }).next?.id).toBe('a');
  });
});
