import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState, STARTING_CLUES } from '../useWordCraftGame';

describe('wordCraftReducer clues', () => {
  it('starts every game with 2 free clues', () => {
    expect(STARTING_CLUES).toBe(2);
    const state = buildInitialState({ seed: 1, locale: 'en' });
    expect(state.cluesRemaining).toBe(2);
  });

  it('USE_CLUE decrements and never goes below zero', () => {
    let state = buildInitialState({ seed: 1, locale: 'en' });
    state = wordCraftReducer(state, { type: 'USE_CLUE' });
    expect(state.cluesRemaining).toBe(1);
    state = wordCraftReducer(state, { type: 'USE_CLUE' });
    expect(state.cluesRemaining).toBe(0);
    state = wordCraftReducer(state, { type: 'USE_CLUE' });
    expect(state.cluesRemaining).toBe(0);
  });

  it('GRANT_CLUE adds a clue (e.g. after watching an ad)', () => {
    let state = buildInitialState({ seed: 1, locale: 'en' });
    state = wordCraftReducer(state, { type: 'USE_CLUE' });
    state = wordCraftReducer(state, { type: 'USE_CLUE' });
    expect(state.cluesRemaining).toBe(0);
    state = wordCraftReducer(state, { type: 'GRANT_CLUE' });
    expect(state.cluesRemaining).toBe(1);
  });

  it('RESET (play again) restores the 2 free clues', () => {
    let state = buildInitialState({ seed: 1, locale: 'en' });
    state = wordCraftReducer(state, { type: 'USE_CLUE' });
    state = wordCraftReducer(state, { type: 'USE_CLUE' });
    expect(state.cluesRemaining).toBe(0);
    state = wordCraftReducer(state, { type: 'RESET', seed: 2, locale: 'en', boardSize: 15 });
    expect(state.cluesRemaining).toBe(2);
  });
});
