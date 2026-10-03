import { describe, it, expect } from 'vitest';
import { emptyLiveRoundWords, foldLiveWords, maskWord } from '../liveRoundWords';

const lesson = new Set(['house', 'water', 'light']);

describe('foldLiveWords — the host panel reads the room without spoiling it', () => {
  it('Given a longer word arrives, Then it becomes the word of the round with its finder', () => {
    let s = foldLiveWords(emptyLiveRoundWords(), [{ username: 'Maya', word: 'cat' }], lesson);
    s = foldLiveWords(s, [{ username: 'Leo', word: 'planet' }], lesson);
    expect(s.best).toEqual({ word: 'planet', username: 'Leo' });
  });

  it('Given an equal-length word arrives later, Then the first finder keeps the spot', () => {
    let s = foldLiveWords(emptyLiveRoundWords(), [{ username: 'Maya', word: 'stone' }], lesson);
    s = foldLiveWords(s, [{ username: 'Leo', word: 'river' }], lesson);
    expect(s.best?.username).toBe('Maya');
  });

  it('Given lesson words in any case, Then each is counted once, lowercased', () => {
    const s = foldLiveWords(
      emptyLiveRoundWords(),
      [
        { username: 'Maya', word: 'HOUSE' },
        { username: 'Leo', word: 'house' },
        { username: 'Noa', word: 'Water' },
      ],
      lesson
    );
    expect(s.lessonFound).toEqual(['house', 'water']);
  });

  it('Given the host appears in the feed, Then the host never takes the spot', () => {
    const s = foldLiveWords(emptyLiveRoundWords(), [{ username: 'Ms. Free', word: 'enormous' }], lesson, 'Ms. Free');
    expect(s.best).toBeNull();
  });

  it('does not mutate the previous state', () => {
    const start = emptyLiveRoundWords();
    foldLiveWords(start, [{ username: 'Maya', word: 'house' }], lesson);
    expect(start.lessonFound).toEqual([]);
    expect(start.best).toBeNull();
  });
});

describe('maskWord — a teaser, not an answer key', () => {
  it('shows only the first letter and keeps the length', () => {
    expect(maskWord('planet')).toEqual(['P', '', '', '', '', '']);
  });
  it('handles an empty word', () => {
    expect(maskWord('')).toEqual([]);
  });
});
