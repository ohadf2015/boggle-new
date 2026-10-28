import { describe, it, expect } from 'vitest';
import { recordFoundWord } from '../blastFoundWords';

describe('recordFoundWord', () => {
  const start = { wordsFound: ['cat'], bestWord: 'cat' };

  it('adds a real word and keeps the longest as best', () => {
    expect(recordFoundWord(start, 'house', false)).toEqual({ wordsFound: ['cat', 'house'], bestWord: 'house' });
    expect(recordFoundWord(start, 'at', false)).toEqual({ wordsFound: ['cat', 'at'], bestWord: 'cat' });
  });

  it('keeps a cascade cluster out of the word list and the best word', () => {
    expect(recordFoundWord(start, '[O×3]', true)).toEqual(start);
  });

  it('never mutates the previous state', () => {
    const prev = { wordsFound: ['cat'], bestWord: 'cat' };
    recordFoundWord(prev, 'house', false);
    expect(prev).toEqual({ wordsFound: ['cat'], bestWord: 'cat' });
  });
});
