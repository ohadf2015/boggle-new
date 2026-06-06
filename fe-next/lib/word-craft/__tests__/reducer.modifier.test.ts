import { describe, it, expect } from 'vitest';
import { wordCraftReducer, buildInitialState } from '../useWordCraftGame';
import { rollModifier } from '../modifiers';

describe('wordCraftReducer modifier', () => {
  it('rolls the per-game modifier deterministically from the seed at init', () => {
    const state = buildInitialState({ seed: 7, locale: 'en' });
    expect(state.modifier).toBe(rollModifier(7));
  });

  it('re-rolls the modifier on RESET (play again with a fresh seed)', () => {
    const start = buildInitialState({ seed: 7, locale: 'en' });
    const next = wordCraftReducer(start, { type: 'RESET', seed: 8, locale: 'en', boardSize: 15 });
    expect(next.modifier).toBe(rollModifier(8));
  });

  it('keeps the modifier stable across ordinary actions', () => {
    const start = buildInitialState({ seed: 7, locale: 'en' });
    const after = wordCraftReducer(start, { type: 'USE_CLUE' });
    expect(after.modifier).toBe(start.modifier);
  });
});
