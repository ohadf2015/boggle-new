import { describe, it, expect } from 'vitest';
import { scoreWord, scoreRepeatWord, WORD_WHEEL_REPEAT_SCORE_FACTOR } from '../wordWheelScoring';

describe('scoreRepeatWord', () => {
  it('is a reduced fraction of the base word score', () => {
    expect(scoreRepeatWord('CANE')).toBe(Math.round(scoreWord('CANE') * WORD_WHEEL_REPEAT_SCORE_FACTOR));
  });

  it('is strictly less than the base score for a re-found word', () => {
    expect(scoreRepeatWord('PUZZLE')).toBeLessThan(scoreWord('PUZZLE'));
  });

  it('never scores zero even for the shortest valid word', () => {
    expect(scoreRepeatWord('CAT')).toBeGreaterThan(0);
  });
});
