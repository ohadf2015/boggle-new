import { survivalGameReducer, createInitialState } from '../survivalGameReducer';
import { INITIAL_LIFE } from '../constants';

const discovery = (word: string, lifeGained = 10) => ({ word, lifeGained, tokensGained: 1, timestamp: 1 });

describe('survivalGameReducer - DISCOVER_WORD', () => {
  it('given life drained while the word was being checked, when the word lands, then the reward is added to the current life', () => {
    const state = { ...createInitialState(), lifePoints: 40 };
    const next = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: discovery('CAT', 10) } });
    expect(next.lifePoints).toBe(50);
  });

  it('given a reward above the cap, when applied, then life stops at the maximum', () => {
    const state = { ...createInitialState(), lifePoints: 95 };
    const next = survivalGameReducer(state, { type: 'DISCOVER_WORD', payload: { discovery: discovery('CAT', 10) } });
    expect(next.lifePoints).toBe(INITIAL_LIFE);
  });

  it('given the word was already found, when it lands again, then nothing is rewarded twice', () => {
    const once = survivalGameReducer({ ...createInitialState(), lifePoints: 40 }, { type: 'DISCOVER_WORD', payload: { discovery: discovery('CAT') } });
    const twice = survivalGameReducer(once, { type: 'DISCOVER_WORD', payload: { discovery: discovery('CAT') } });
    expect(twice).toBe(once);
  });
});
