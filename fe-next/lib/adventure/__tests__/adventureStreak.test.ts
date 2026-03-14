import {
  updateStreak,
  getStreakMultiplier,
  type AdventureStreakState,
} from '../adventureStreak';

describe('adventureStreak', () => {
  const baseState: AdventureStreakState = {
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
  };

  describe('updateStreak', () => {
    it('should start streak at 1 on first play', () => {
      const result = updateStreak(baseState, '2026-03-14');
      expect(result.currentStreak).toBe(1);
    });

    it('should increment streak on consecutive day', () => {
      const after1 = updateStreak(baseState, '2026-03-14');
      const after2 = updateStreak(after1, '2026-03-15');
      expect(after2.currentStreak).toBe(2);
    });

    it('should reset streak on skipped day', () => {
      const after1 = updateStreak(baseState, '2026-03-14');
      const after3 = updateStreak(after1, '2026-03-16'); // skipped 03-15
      expect(after3.currentStreak).toBe(1);
    });

    it('should not increment on same day', () => {
      const after1 = updateStreak(baseState, '2026-03-14');
      const same = updateStreak(after1, '2026-03-14');
      expect(same.currentStreak).toBe(1);
    });

    it('should track best streak', () => {
      let state = baseState;
      state = updateStreak(state, '2026-03-14');
      state = updateStreak(state, '2026-03-15');
      state = updateStreak(state, '2026-03-16');
      expect(state.bestStreak).toBe(3);
      // Reset
      state = updateStreak(state, '2026-03-20');
      expect(state.currentStreak).toBe(1);
      expect(state.bestStreak).toBe(3); // best preserved
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
