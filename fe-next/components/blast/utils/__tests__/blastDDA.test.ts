import {
  createDDAState,
  updateDDA,
  getDDASpawnModifier,
  isDDABoostActive,
  DDA_BOOST_PERCENT,
  DDA_REDUCE_PERCENT,
  type BlastDDAState,
} from '../blastDDA';

describe('isDDABoostActive', () => {
  it('returns false at start', () => {
    expect(isDDABoostActive(createDDAState())).toBe(false);
  });

  it('returns false after 1 fail', () => {
    const s = updateDDA(createDDAState(), 'fail');
    expect(isDDABoostActive(s)).toBe(false);
  });

  it('returns true after 2 consecutive fails', () => {
    let s = updateDDA(createDDAState(), 'fail');
    s = updateDDA(s, 'fail');
    expect(isDDABoostActive(s)).toBe(true);
  });

  it('returns false after a success resets the streak', () => {
    let s = updateDDA(createDDAState(), 'fail');
    s = updateDDA(s, 'fail');
    expect(isDDABoostActive(s)).toBe(true);
    s = updateDDA(s, 'success');
    expect(isDDABoostActive(s)).toBe(false);
  });
});

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

    it('returns DDA_BOOST_PERCENT (+0.15) after 2 consecutive fails', () => {
      let state = createDDAState();
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(DDA_BOOST_PERCENT);
    });

    it('returns DDA_BOOST_PERCENT after more than 2 consecutive fails', () => {
      let state = createDDAState();
      for (let i = 0; i < 5; i++) state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(DDA_BOOST_PERCENT);
    });

    it('does not boost after only 1 consecutive fail', () => {
      let state = createDDAState();
      state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('does not reduce even at high success rate (penalty removed)', () => {
      let state = createDDAState();
      // 5 successes = 100% success rate — should still return 0
      for (let i = 0; i < 5; i++) state = updateDDA(state, 'success');
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('returns 0 when exactly 4/5 results are success (no penalty)', () => {
      let state = createDDAState();
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('returns 0 for all-success window (penalty removed)', () => {
      let state = createDDAState();
      for (let i = 0; i < 5; i++) state = updateDDA(state, 'success');
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('returns 0 for fewer than 5 results at high success rate', () => {
      let state = createDDAState();
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      expect(getDDASpawnModifier(state)).toBe(0);
    });

    it('boosts after 2+ fails regardless of recent success rate', () => {
      let state = createDDAState();
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'fail');
      state = updateDDA(state, 'fail');
      expect(getDDASpawnModifier(state)).toBe(DDA_BOOST_PERCENT);
    });

    it('returns 0 after a single fail following successes', () => {
      let state = createDDAState();
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'success');
      state = updateDDA(state, 'fail');
      // consecutiveFails = 1 (not >= 2)
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
