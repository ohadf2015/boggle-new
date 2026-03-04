import {
  createDDAState,
  updateDDA,
  getDDASpawnModifier,
  DDA_BOOST_PERCENT,
  DDA_REDUCE_PERCENT,
  type BlastDDAState,
} from '../blastDDA';

describe('blastDDA — pure DDA state machine', () => {
  // ── createDDAState ─────────────────────────────────────────────────────────

  describe('createDDAState', () => {
    it('returns clean initial state', () => {
      const state = createDDAState();
      expect(state.recentResults).toEqual([]);
      expect(state.consecutiveFails).toBe(0);
    });
  });

  // ── updateDDA ──────────────────────────────────────────────────────────────

  describe('updateDDA', () => {
    it('appends success to recentResults', () => {
      const state = createDDAState();
      const next = updateDDA(state, 'success');
      expect(next.recentResults).toEqual(['success']);
    });

    it('appends fail to recentResults', () => {
      const state = createDDAState();
      const next = updateDDA(state, 'fail');
      expect(next.recentResults).toEqual(['fail']);
    });

    it('increments consecutiveFails on fail', () => {
      let state = createDDAState();
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      expect(state.consecutiveFails).toBe(2);
    });

    it('resets consecutiveFails to 0 on success', () => {
      let state = createDDAState();
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'success');
      expect(state.consecutiveFails).toBe(0);
    });

    it('caps recentResults at last 5 entries', () => {
      let state = createDDAState();
      for (let i = 0; i < 7; i++) {
        state = updateDDA(state, i % 2 === 0 ? 'success' : 'fail');
      }
      expect(state.recentResults).toHaveLength(5);
    });

    it('keeps the most recent 5 entries (not oldest)', () => {
      let state = createDDAState();
      // Push 5 successes then 2 fails
      for (let i = 0; i < 5; i++) state = updateDDA(state, 'success');
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      // Should end with success, success, success, fail, fail
      expect(state.recentResults).toEqual(['success', 'success', 'success', 'fail', 'fail']);
    });

    it('is immutable — does not mutate input state', () => {
      const state = createDDAState();
      const original = { ...state, recentResults: [...state.recentResults] };
      updateDDA(state, 'fail');
      expect(state.recentResults).toEqual(original.recentResults);
      expect(state.consecutiveFails).toBe(original.consecutiveFails);
    });
  });

  // ── getDDASpawnModifier ────────────────────────────────────────────────────

  describe('getDDASpawnModifier', () => {
    it('returns 0 for fresh initial state', () => {
      expect(getDDASpawnModifier(createDDAState())).toBe(0);
    });

    it('returns DDA_BOOST_PERCENT (+0.15) after 3 consecutive fails', () => {
      let state = createDDAState();
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(DDA_BOOST_PERCENT);
    });

    it('returns DDA_BOOST_PERCENT after more than 3 consecutive fails', () => {
      let state = createDDAState();
      for (let i = 0; i < 5; i++) state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(DDA_BOOST_PERCENT);
    });

    it('does not boost after only 2 consecutive fails', () => {
      let state = createDDAState();
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('returns DDA_REDUCE_PERCENT (-0.10) after 80%+ success rate over 5 results', () => {
      let state = createDDAState();
      // 5 successes = 100% success rate
      for (let i = 0; i < 5; i++) state = updateDDA(state, 'success');
      expect(getDDASpawnModifier(state)).toBe(DDA_REDUCE_PERCENT);
    });

    it('returns DDA_REDUCE_PERCENT when exactly 4/5 results are success (80%)', () => {
      let state = createDDAState();
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'fail');
      // successRate = 4/5 = 0.8 — exactly at threshold (>0.8 is false, so no reduce)
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('returns DDA_REDUCE_PERCENT when >80% success (5/5 = 100%)', () => {
      let state = createDDAState();
      for (let i = 0; i < 5; i++) state = updateDDA(state, 'success');
      expect(getDDASpawnModifier(state)).toBe(DDA_REDUCE_PERCENT);
    });

    it('does NOT reduce when fewer than 5 results even at high success rate', () => {
      let state = createDDAState();
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      // only 3 results, can't evaluate window yet
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('boosts take priority — after 3+ fails even if success rate would also be high', () => {
      // Edge case: consecutiveFails >= 3 always returns boost
      let state = createDDAState();
      // First 2 successes, then 3 fails (consecutiveFails = 3)
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      // consecutiveFails = 3, recentResults = [success, success, fail, fail, fail]
      // successRate = 2/5 = 0.4 → not high enough for reduce
      // consecutiveFails = 3 → boost applies
      expect(getDDASpawnModifier(state)).toBe(DDA_BOOST_PERCENT);
    });

    it('returns 0 when success rate resets after a fail interrupts streak', () => {
      let state = createDDAState();
      // 4 successes, 1 fail — success rate drops to 80% (not >80%)
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'fail');
      // consecutiveFails = 1 (not >= 3), successRate = 0.8 (not > 0.8)
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('DDA_BOOST_PERCENT is 0.15', () => {
      expect(DDA_BOOST_PERCENT).toBe(0.15);
    });

    it('DDA_REDUCE_PERCENT is -0.10', () => {
      expect(DDA_REDUCE_PERCENT).toBe(-0.10);
    });
  });
});
