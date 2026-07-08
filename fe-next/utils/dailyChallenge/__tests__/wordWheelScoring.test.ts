import { describe, it, expect } from 'vitest';
import { scoreWord } from '../wordWheelScoring';

describe('scoreWord', () => {
  it('scales up with word length', () => {
    expect(scoreWord('CAT')).toBeLessThan(scoreWord('CANE'));
    expect(scoreWord('CANE')).toBeLessThan(scoreWord('PUZZLE'));
  });

  it('scores nothing for words below the minimum length', () => {
    expect(scoreWord('AT')).toBe(0);
  });
});
