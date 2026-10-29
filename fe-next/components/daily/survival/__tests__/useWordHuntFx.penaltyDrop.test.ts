import { describe, it, expect } from 'vitest';
import { isPenaltyDrop } from '../useWordHuntFx';
import { LIFE_DRAIN_RATE, NOT_IN_DICTIONARY_PENALTY, INVALID_WORD_PENALTY } from '../constants';

describe('isPenaltyDrop', () => {
  it('Given the once-a-second drain tick, Then no screen shock fires over the board', () => {
    expect(isPenaltyDrop(LIFE_DRAIN_RATE)).toBe(false);
    expect(isPenaltyDrop(LIFE_DRAIN_RATE * 0.7)).toBe(false);
  });

  it('Given a rejected-word penalty, Then the shock fires', () => {
    expect(isPenaltyDrop(NOT_IN_DICTIONARY_PENALTY)).toBe(true);
    expect(isPenaltyDrop(INVALID_WORD_PENALTY)).toBe(true);
  });
});
