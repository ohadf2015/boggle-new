import { describe, it, expect } from 'vitest';
import { isRussianWord } from '../russianWordLookup';

describe('isRussianWord', () => {
  it('given words in the list, when looked up, then they are found (first, middle, last entries)', () => {
    expect(isRussianWord('аарона')).toBe(true);
    expect(isRussianWord('кот')).toBe(true);
    expect(isRussianWord('ёршику')).toBe(true);
  });

  it('given a board spelling with е for ё, when looked up, then the ё entry still matches', () => {
    expect(isRussianWord('елка')).toBe(true);
    expect(isRussianWord('ёлка')).toBe(true);
  });

  it('given case differences or junk, when looked up, then it normalizes or rejects', () => {
    expect(isRussianWord('КОТ')).toBe(true);
    expect(isRussianWord('кттт')).toBe(false);
    expect(isRussianWord('cat')).toBe(false);
    expect(isRussianWord('')).toBe(false);
  });
});
