/**
 * survivalGameReducer - RESTORE_LIFE action tests
 * Backs the rewarded-ad extra-life flow: grant a fresh life pool
 * (clamped to [0, INITIAL_LIFE]) without touching other state.
 */

import { survivalGameReducer, createInitialState } from '../survivalGameReducer';
import { INITIAL_LIFE } from '../constants';

describe('survivalGameReducer - RESTORE_LIFE', () => {
  it('sets lifePoints to payload amount when within bounds', () => {
    const state = { ...createInitialState(), lifePoints: 0 };
    const next = survivalGameReducer(state, {
      type: 'RESTORE_LIFE',
      payload: { amount: 50 },
    });
    expect(next.lifePoints).toBe(50);
  });

  it('clamps to INITIAL_LIFE ceiling', () => {
    const state = { ...createInitialState(), lifePoints: 10 };
    const next = survivalGameReducer(state, {
      type: 'RESTORE_LIFE',
      payload: { amount: INITIAL_LIFE + 25 },
    });
    expect(next.lifePoints).toBe(INITIAL_LIFE);
  });

  it('clamps to zero floor', () => {
    const state = { ...createInitialState(), lifePoints: 20 };
    const next = survivalGameReducer(state, {
      type: 'RESTORE_LIFE',
      payload: { amount: -5 },
    });
    expect(next.lifePoints).toBe(0);
  });

  it('does not mutate unrelated state', () => {
    const state = {
      ...createInitialState(),
      lifePoints: 0,
      clueTokens: 7,
      formedWord: 'HELLO',
    };
    const next = survivalGameReducer(state, {
      type: 'RESTORE_LIFE',
      payload: { amount: 50 },
    });
    expect(next.clueTokens).toBe(7);
    expect(next.formedWord).toBe('HELLO');
  });
});
