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

// Ladders: first_lesson 1/3/10/25, lesson_collector 3/10/25/50, level_climber 5/10/25/50, practice_veteran 10/50/200/500, xp_collector 500+.
describe('summarizeAwards', () => {
  it('given no achievements, when summarized, then everything is zero and nothing is next', () => {
    const s = summarizeAwards({});
    expect(s).toMatchObject({ earned: 0, total: 0, next: null });
    expect(s.tiers).toEqual({ BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 });
  });

  it('given mixed counts, when summarized, then earned and per-tier counts follow each award ladder', () => {
    const s = summarizeAwards({ xp_collector: a(0), first_lesson: a(1), lesson_collector: a(10), level_climber: a(25), practice_veteran: a(500) });
    expect(s.earned).toBe(4);
    expect(s.total).toBe(5);
    expect(s.tiers).toEqual({ BRONZE: 1, SILVER: 1, GOLD: 1, PLATINUM: 1 });
  });

  it('given several in progress, when summarized, then next is the one closest to its next tier', () => {
    const s = summarizeAwards({ first_lesson: a(0), lesson_collector: a(2), practice_veteran: a(9) });
    expect(s.next).toMatchObject({ id: 'practice_veteran', count: 9, threshold: 10, nextTier: 'BRONZE', left: 1 });
    expect(s.next?.pct).toBeCloseTo(0.9);
  });

  it('given nothing earned yet, when summarized, then next is a first award at 0, never a hidden secret', () => {
    const s = summarizeAwards({ first_lesson: a(0, { isSecret: true }), lesson_collector: a(0) });
    expect(s.next).toMatchObject({ id: 'lesson_collector', count: 0, threshold: 3, nextTier: 'BRONZE', left: 3, pct: 0 });
  });

  it('given every award maxed, when summarized, then nothing is next', () => {
    expect(summarizeAwards({ first_lesson: a(25), practice_veteran: a(999) }).next).toBeNull();
  });

  it('given a tie in progress, when summarized, then fewer steps left wins, then the id breaks the tie', () => {
    expect(summarizeAwards({ lesson_collector: a(1), first_lesson: a(1) }).next?.id).toBe('first_lesson');
  });
});

describe('summarizeAwards with the real per-award ladders', () => {
  it('given xp_collector at 264, when summarized, then it is judged on its own ladder, not 1/15/75/300', () => {
    const s = summarizeAwards({ xp_collector: a(264), first_lesson: a(0) });
    expect(s.tiers.PLATINUM).toBe(0);
    expect(s.earned).toBe(0);
    const xp = s.nexts.find((n) => n.id === 'xp_collector');
    expect(xp).toMatchObject({ count: 264, threshold: 500, nextTier: 'BRONZE' });
  });

  it('given first_lesson at 3, when summarized, then silver is earned (3) and gold (10) is next', () => {
    const s = summarizeAwards({ first_lesson: a(3) });
    expect(s.tiers.SILVER).toBe(1);
    expect(s.next).toMatchObject({ id: 'first_lesson', threshold: 10, nextTier: 'GOLD', left: 7 });
  });

  it('given awards the server never grants, when summarized, then they are neither counted nor offered as next', () => {
    const s = summarizeAwards({ boss_slayer: a(0), word_master: a(0), speed_demon: a(0), first_lesson: a(0) });
    expect(s.total).toBe(1);
    expect(s.nexts.map((n) => n.id)).toEqual(['first_lesson']);
  });

  it('given a tier the student already holds in an award no longer granted, when summarized, then it still counts', () => {
    const s = summarizeAwards({ legacy_award: a(1), first_lesson: a(0) });
    expect(s.total).toBe(2);
    expect(s.earned).toBe(1);
  });

  it('given many in progress, when summarized, then up to three are offered, closest first', () => {
    const s = summarizeAwards({ first_lesson: a(0), lesson_collector: a(2), practice_veteran: a(9), level_climber: a(4), xp_collector: a(100) });
    expect(s.nexts.map((n) => n.id)).toEqual(['practice_veteran', 'level_climber', 'lesson_collector']);
  });
});
