import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordGuestRound,
  getGuestProgress,
  percentileFromBoard,
  quickCoinsFor,
  quickXpFor,
} from '../guestProgress';

describe('quick play guest progression', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('accumulates rank points and pending rewards across rounds', () => {
    recordGuestRound({ mode: 'wheel-rush', scorePct: 18 });
    const after = recordGuestRound({ mode: 'classic', scorePct: 40 });

    expect(after.points).toBe(58);
    expect(after.coinsPending).toBe(quickCoinsFor(18) + quickCoinsFor(40));
    expect(after.xpPending).toBe(quickXpFor(18) + quickXpFor(40));
    expect(after.history).toEqual([40, 18]);
    expect(after.bestByMode).toEqual({ 'wheel-rush': 18, classic: 40 });
    expect(getGuestProgress().points).toBe(58);
  });

  it('keeps a per-mode best rather than the latest score', () => {
    recordGuestRound({ mode: 'blast', scorePct: 62 });
    const after = recordGuestRound({ mode: 'blast', scorePct: 31 });
    expect(after.bestByMode.blast).toBe(62);
  });

  it('counts a day streak only for consecutive local days', () => {
    const d1 = new Date(2026, 7, 16, 20, 0);
    const d2 = new Date(2026, 7, 17, 9, 0);
    const d3 = new Date(2026, 7, 17, 23, 0);
    const d5 = new Date(2026, 7, 19, 9, 0);

    expect(recordGuestRound({ mode: 'classic', scorePct: 10 }, d1).dayStreak).toBe(1);
    expect(recordGuestRound({ mode: 'classic', scorePct: 10 }, d2).dayStreak).toBe(2);
    // second round the same day must not inflate the streak
    expect(recordGuestRound({ mode: 'classic', scorePct: 10 }, d3).dayStreak).toBe(2);
    // a skipped day resets it
    expect(recordGuestRound({ mode: 'classic', scorePct: 10 }, d5).dayStreak).toBe(1);
  });

  it('derives a percentile from the public board instead of reporting 0', () => {
    const board = [{ bestScorePct: 90 }, { bestScorePct: 50 }, { bestScorePct: 20 }, { bestScorePct: 5 }];
    expect(percentileFromBoard(60, board)).toBe(75);
    expect(percentileFromBoard(4, board)).toBe(0);
    expect(percentileFromBoard(95, board)).toBe(100);
    expect(percentileFromBoard(60, [])).toBe(0);
  });
});
