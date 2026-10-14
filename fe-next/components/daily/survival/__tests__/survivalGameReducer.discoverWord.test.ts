import { describe, it, expect } from 'vitest';
import { survivalGameReducer, createInitialState } from '../survivalGameReducer';
import { INITIAL_LIFE } from '../constants';
import type { WordDiscovery } from '../types';

const found = (word: string, lifeGained: number, tokensGained = 1): WordDiscovery => ({ word, lifeGained, tokensGained, timestamp: 1 });

describe('survivalGameReducer DISCOVER_WORD', () => {
  it('given life drained while the word was being checked, then the reward adds to the life the player has now', () => {
    let state = { ...createInitialState(), lifePoints: 50 };
    state = survivalGameReducer(state, { type: 'DRAIN_LIFE', payload: { drainRate: 3 } });
    state = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: found('CAT', 10) } });
    expect(state.lifePoints).toBe(57);
  });

  it('given two words checked at the same time, then both rewards count', () => {
    let state = { ...createInitialState(), lifePoints: 40 };
    state = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: found('CAT', 10) } });
    state = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: found('DOGS', 12) } });
    expect(state.lifePoints).toBe(62);
    expect(state.discoveredWords.map((d) => d.word)).toEqual(['CAT', 'DOGS']);
  });

  it('never fills life past the cap', () => {
    let state = { ...createInitialState(), lifePoints: INITIAL_LIFE - 2 };
    state = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: found('CAT', 10) } });
    expect(state.lifePoints).toBe(INITIAL_LIFE);
  });

  it('given the same word lands twice, then it is paid once', () => {
    let state = { ...createInitialState(), lifePoints: 40 };
    state = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: found('CAT', 10, 2) } });
    const again = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: found('CAT', 10, 2) } });
    expect(again).toBe(state);
    expect(again.clueTokens).toBe(2);
  });
});
