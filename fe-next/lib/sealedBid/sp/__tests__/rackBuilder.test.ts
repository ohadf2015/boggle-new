import { describe, it, expect } from 'vitest';
import { wordFromChosen, toDisplay } from '../rackBuilder';

describe('wordFromChosen', () => {
  it('maps chosen tile indices to letters in pick order', () => {
    // rack TRAINED = T0 R1 A2 I3 N4 E5 D6 → pick R,E,T,A,I,N = RETAIN
    expect(wordFromChosen('TRAINED', [1, 5, 0, 2, 3, 4])).toBe('RETAIN');
  });

  it('returns empty string for no chosen tiles', () => {
    expect(wordFromChosen('TRAINED', [])).toBe('');
  });

  it('addresses tiles by index so duplicate letters stay distinct', () => {
    // rack LETTER has two T (idx 2,3) and two E (idx 1,4)
    expect(wordFromChosen('LETTER', [0, 1, 2, 2])).toBe('LETT'); // same index twice still resolves
    expect(wordFromChosen('LETTER', [2, 3])).toBe('TT');
  });

  it('ignores out-of-range indices defensively', () => {
    expect(wordFromChosen('CAT', [0, 9, 1])).toBe('CA');
  });
});

describe('toDisplay', () => {
  it('applies Hebrew final (sofit) letters to the last character', () => {
    expect(toDisplay('שלומ')).toBe('שלום');
    expect(toDisplay('כלבימ')).toBe('כלבים');
    expect(toDisplay('פרחימ')).toBe('פרחים');
  });

  it('is a no-op for words that need no sofit conversion', () => {
    expect(toDisplay('ארוחה')).toBe('ארוחה');
    expect(toDisplay('RETAIN')).toBe('RETAIN');
    expect(toDisplay('')).toBe('');
  });
});
