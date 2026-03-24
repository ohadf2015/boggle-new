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

    it('should maintain streak within 36h grace period (play day+1 late evening)', () => {
      const after1 = updateStreak(baseState, '2026-03-14');
      // Skipping exactly 1 day is still consecutive with grace period
      const after2 = updateStreak(after1, '2026-03-15');
      expect(after2.currentStreak).toBe(2);
    });

    it('should maintain streak with 2-day gap (grace period)', () => {
      const after1 = updateStreak(baseState, '2026-03-14');
      const after2 = updateStreak(after1, '2026-03-16'); // 2-day gap — within grace
      expect(after2.currentStreak).toBe(2);
    });

    it('should reset streak when 3+ days gap', () => {
      const after1 = updateStreak(baseState, '2026-03-14');
      const after3 = updateStreak(after1, '2026-03-17'); // 3-day gap — beyond grace
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
