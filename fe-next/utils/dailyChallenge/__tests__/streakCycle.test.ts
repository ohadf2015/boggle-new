/**
 * Streak cycle — the 7 day-slots behind the streak week row.
 *
 * This is a ROLLING cycle anchored on `cycleStart` (the server's weekly-chest
 * cycle), NOT a Monday-start calendar week. That distinction matters: on a
 * calendar week a player who starts on a Thursday would reach day 7 of their
 * streak still holding a locked chest and a 4/7 row, which is the opposite of
 * the reward the row is supposed to promise.
 */
import { describe, it, expect } from 'vitest';
import { buildStreakCycle, CYCLE_LENGTH } from '../streakCycle';

describe('buildStreakCycle', () => {
  it('always returns exactly seven slots, last one the chest', () => {
    const days = buildStreakCycle({ cycleStart: '2026-09-03', completedDates: [], today: '2026-09-03' });
    expect(days).toHaveLength(CYCLE_LENGTH);
    expect(days.filter(d => d.isChestSlot)).toHaveLength(1);
    expect(days[CYCLE_LENGTH - 1].isChestSlot).toBe(true);
  });

  it('runs consecutive UTC dates forward from cycleStart', () => {
    // 2026-09-03 is a Thursday — the reference screenshot's Th Fr Sa Su Mo Tu We.
    const days = buildStreakCycle({ cycleStart: '2026-09-03', completedDates: [], today: '2026-09-03' });
    expect(days.map(d => d.iso)).toEqual([
      '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06',
      '2026-09-07', '2026-09-08', '2026-09-09',
    ]);
  });

  it('crosses a month boundary without skipping a day', () => {
    const days = buildStreakCycle({ cycleStart: '2026-09-28', completedDates: [], today: '2026-09-28' });
    expect(days.map(d => d.iso)).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01',
      '2026-10-02', '2026-10-03', '2026-10-04',
    ]);
  });

  it('marks only the dates the server says were completed', () => {
    const days = buildStreakCycle({
      cycleStart: '2026-09-03',
      completedDates: ['2026-09-03', '2026-09-04', '2026-09-06'],
      today: '2026-09-06',
    });
    expect(days.map(d => d.done)).toEqual([true, true, false, true, false, false, false]);
  });

  it('separates today from the days still to come', () => {
    const days = buildStreakCycle({ cycleStart: '2026-09-03', completedDates: [], today: '2026-09-05' });
    expect(days.map(d => d.isToday)).toEqual([false, false, true, false, false, false, false]);
    expect(days.map(d => d.isFuture)).toEqual([false, false, false, true, true, true, true]);
  });

  describe('guest fallback (no server cycle)', () => {
    // Guests never hit /api/daily/weekly-chest/status, so `cycleStart` is ''.
    // The row must still be honest, derived from the local streak count alone.
    it('anchors the cycle so that today is the streak-th day of it', () => {
      const days = buildStreakCycle({
        cycleStart: '',
        completedDates: [],
        today: '2026-09-05',
        currentStreak: 3,
      });
      // A 3-day streak ending today ⇒ cycle started two days ago.
      expect(days[0].iso).toBe('2026-09-03');
      expect(days.map(d => d.done)).toEqual([true, true, true, false, false, false, false]);
      expect(days[2].isToday).toBe(true);
    });

    it('wraps a streak longer than a cycle back to the start of a fresh cycle', () => {
      // Day 15 is the first day of the third cycle, not the 15th slot.
      const days = buildStreakCycle({
        cycleStart: '',
        completedDates: [],
        today: '2026-09-05',
        currentStreak: 15,
      });
      expect(days[0].iso).toBe('2026-09-05');
      expect(days.map(d => d.done)).toEqual([true, false, false, false, false, false, false]);
    });

    it('shows an empty row for a player with no streak at all', () => {
      const days = buildStreakCycle({
        cycleStart: '',
        completedDates: [],
        today: '2026-09-05',
        currentStreak: 0,
      });
      expect(days.every(d => !d.done)).toBe(true);
      expect(days[0].isToday).toBe(true);
    });
  });

  it('ignores completed dates that fall outside this cycle', () => {
    const days = buildStreakCycle({
      cycleStart: '2026-09-03',
      completedDates: ['2026-08-01', '2026-09-04'],
      today: '2026-09-04',
    });
    expect(days.filter(d => d.done).map(d => d.iso)).toEqual(['2026-09-04']);
  });
});
