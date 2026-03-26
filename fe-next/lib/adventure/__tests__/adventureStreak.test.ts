import {
  updateStreak,
  getStreakMultiplier,
  type AdventureStreakState,
} from '../adventureStreak';

describe('adventureStreak', () => {
  const baseState: AdventureStreakState = {
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedAt: null,
    freezesUsedThisWeek: 0,
    lastFreezeWeek: null,
  };

  /** Helper: ISO string offset from a base timestamp by hours */
  function hoursAfter(base: string, hours: number): string {
    return new Date(new Date(base).getTime() + hours * 3600_000).toISOString();
  }

  describe('updateStreak — 36h grace period', () => {
    it('should start streak at 1 on first play', () => {
      const result = updateStreak(baseState, '2026-03-14T10:00:00Z');
      expect(result.currentStreak).toBe(1);
    });

    it('should increment streak when playing 24h later', () => {
      const t0 = '2026-03-14T10:00:00Z';
      const after1 = updateStreak(baseState, t0);
      const after2 = updateStreak(after1, hoursAfter(t0, 24));
      expect(after2.currentStreak).toBe(2);
    });

    it('should maintain streak when playing 35h later (within 36h grace)', () => {
      const t0 = '2026-03-14T10:00:00Z';
      const after1 = updateStreak(baseState, t0);
      const after2 = updateStreak(after1, hoursAfter(t0, 35));
      expect(after2.currentStreak).toBe(2);
    });

    it('should break streak when playing 37h later (beyond 36h grace)', () => {
      const t0 = '2026-03-14T10:00:00Z';
      const after1 = updateStreak(baseState, t0);
      const after2 = updateStreak(after1, hoursAfter(t0, 37));
      // No freeze available on streak of 1 with 0 freezes — reset
      expect(after2.currentStreak).toBe(1);
    });

    it('should not increment if played within 1 hour (same session)', () => {
      const t0 = '2026-03-14T10:00:00Z';
      const after1 = updateStreak(baseState, t0);
      const same = updateStreak(after1, hoursAfter(t0, 0.5));
      expect(same.currentStreak).toBe(1);
      expect(same).toBe(after1); // same reference — no change
    });

    it('should track best streak across resets', () => {
      let state = baseState;
      const t0 = '2026-03-14T10:00:00Z';
      state = updateStreak(state, t0);
      state = updateStreak(state, hoursAfter(t0, 24));
      state = updateStreak(state, hoursAfter(t0, 48));
      expect(state.bestStreak).toBe(3);
      // 72h gap — beyond grace, freeze auto-consumed
      state = updateStreak(state, hoursAfter(t0, 120));
      expect(state.currentStreak).toBe(3); // freeze preserved
      expect(state.freezesUsedThisWeek).toBe(1);
      // Another big gap — freeze already used this week → reset
      state = updateStreak(state, hoursAfter(t0, 192));
      expect(state.currentStreak).toBe(1);
      expect(state.bestStreak).toBe(3);
    });
  });

  describe('updateStreak — streak freeze', () => {
    it('should auto-consume freeze when streak would break (>36h gap)', () => {
      const state: AdventureStreakState = {
        ...baseState,
        currentStreak: 5,
        bestStreak: 5,
        lastPlayedAt: '2026-03-14T10:00:00Z',
      };
      // 48h later — beyond 36h grace, but freeze available
      const result = updateStreak(state, hoursAfter(state.lastPlayedAt!, 48));
      expect(result.currentStreak).toBe(5); // preserved, not incremented
      expect(result.freezesUsedThisWeek).toBe(1);
    });

    it('should reset streak on second miss in same week (no freeze left)', () => {
      const state: AdventureStreakState = {
        ...baseState,
        currentStreak: 5,
        bestStreak: 5,
        lastPlayedAt: '2026-03-14T10:00:00Z',
        freezesUsedThisWeek: 1,
        lastFreezeWeek: '2026-03-14T10:00:00Z',
      };
      // 48h later — beyond grace, freeze already used this week
      const result = updateStreak(state, hoursAfter(state.lastPlayedAt!, 48));
      expect(result.currentStreak).toBe(1);
    });

    it('should reset freeze count when a new week starts', () => {
      const state: AdventureStreakState = {
        ...baseState,
        currentStreak: 5,
        bestStreak: 5,
        lastPlayedAt: '2026-03-14T10:00:00Z',
        freezesUsedThisWeek: 1,
        lastFreezeWeek: '2026-03-08T10:00:00Z', // >7 days ago
      };
      // 48h later — freeze count resets because lastFreezeWeek was >7 days ago
      const result = updateStreak(state, hoursAfter(state.lastPlayedAt!, 48));
      expect(result.currentStreak).toBe(5); // freeze available again
      expect(result.freezesUsedThisWeek).toBe(1);
    });

    it('should not use freeze for streak of 0', () => {
      const result = updateStreak(baseState, '2026-03-17T10:00:00Z');
      expect(result.currentStreak).toBe(1);
      expect(result.freezesUsedThisWeek).toBe(0);
    });
  });

  describe('getStreakMultiplier', () => {
    it('should return 1.0 for no streak', () => {
      expect(getStreakMultiplier(0)).toBe(1.0);
    });

    it('should scale up to 2.0 at 7 days', () => {
      expect(getStreakMultiplier(7)).toBeCloseTo(2.0);
    });

    it('should cap at 2.0', () => {
      expect(getStreakMultiplier(30)).toBe(2.0);
    });

    it('should increase monotonically', () => {
      for (let i = 1; i < 10; i++) {
        expect(getStreakMultiplier(i)).toBeGreaterThanOrEqual(getStreakMultiplier(i - 1));
      }
    });
  });
});
