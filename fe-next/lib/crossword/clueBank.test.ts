import { describe, it, expect } from 'vitest';
import { getClue, hasClue, clueBankSize } from './clueBank';

describe('clueBank', () => {
  it('has a substantial number of clues', () => {
    expect(clueBankSize()).toBeGreaterThan(800);
  });
  it('returns a non-empty clue for a common word in the bank', () => {
    // "ocean" is in COMMON_EN and very high frequency — must survive crafting.
    const c = getClue('ocean');
    expect(typeof c).toBe('string');
    expect((c ?? '').length).toBeGreaterThan(0);
  });
  it('reports membership via hasClue', () => {
    expect(hasClue('ocean')).toBe(true);
    expect(hasClue('zzzznotaword')).toBe(false);
  });
  it('returns undefined for unknown words', () => {
    expect(getClue('zzzznotaword')).toBeUndefined();
  });
});
