import { describe, it, expect } from 'vitest';
import { selectImprovementSummary } from './selectImprovementSummary';
import type { XpGainedData, LevelUpData } from '@/types/components';

const xp = (over: Partial<XpGainedData> = {}): XpGainedData => ({
  xpEarned: 120,
  xpBreakdown: { gameCompletion: 20, scoreXp: 80, winBonus: 20, achievementXp: 0 },
  newTotalXp: 500,
  newLevel: 5,
  ...over,
});

const streak = { currentStreak: 3, bestStreak: 5, isNewMilestone: false, previousStreak: 2 };

describe('selectImprovementSummary', () => {
  it('returns null when nothing reliable to show (guest: no xp, no streak)', () => {
    expect(selectImprovementSummary({ xp: null, levelUp: null, streak: null })).toBeNull();
  });

  it('surfaces xp earned and a derived level + progress percent from total xp', () => {
    const s = selectImprovementSummary({ xp: xp(), levelUp: null, streak: null })!;
    expect(s).not.toBeNull();
    expect(s.xpEarned).toBe(120);
    expect(s.level).toBe(5);
    expect(s.levelProgressPct).toBeGreaterThanOrEqual(0);
    expect(s.levelProgressPct).toBeLessThanOrEqual(100);
  });

  it('flags leveledUp only when levelsGained > 0', () => {
    const noLevel: LevelUpData = { oldLevel: 5, newLevel: 5, levelsGained: 0, newTitles: [] };
    const up: LevelUpData = { oldLevel: 4, newLevel: 5, levelsGained: 1, newTitles: ['Wordsmith'] };
    expect(selectImprovementSummary({ xp: xp(), levelUp: noLevel, streak: null })!.leveledUp).toBe(false);
    const s = selectImprovementSummary({ xp: xp(), levelUp: up, streak: null })!;
    expect(s.leveledUp).toBe(true);
    expect(s.newTitle).toBe('Wordsmith');
  });

  it('surfaces streak when >= 2 even with no xp (still meaningful)', () => {
    const s = selectImprovementSummary({ xp: null, levelUp: null, streak })!;
    expect(s).not.toBeNull();
    expect(s.streak).toBe(3);
    expect(s.xpEarned).toBe(0);
  });

  it('ignores a streak of 1 (not meaningful), returns null if that is all there is', () => {
    const lone = { ...streak, currentStreak: 1 };
    expect(selectImprovementSummary({ xp: null, levelUp: null, streak: lone })).toBeNull();
  });

  it('does not invent xp: xpEarned is 0 when xp is null', () => {
    const s = selectImprovementSummary({ xp: null, levelUp: null, streak });
    expect(s?.xpEarned).toBe(0);
    expect(s?.level).toBeUndefined();
  });

  it('clamps a negative/zero xpEarned to 0 and still shows level progress', () => {
    const s = selectImprovementSummary({ xp: xp({ xpEarned: -5 }), levelUp: null, streak: null })!;
    expect(s.xpEarned).toBe(0);
    expect(s.level).toBe(5);
  });
});
