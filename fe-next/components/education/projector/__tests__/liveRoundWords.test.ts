import { describe, it, expect } from 'vitest';
import { LIVE_FEED_MAX, emptyLiveRoundWords, foldLiveWords, lessonWordSet, maskWord } from '../liveRoundWords';

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

describe('foldLiveWords — the live feed', () => {
  it('Given words arrive, Then the feed lists them newest first with their finder and a stable id', () => {
    let s = foldLiveWords(emptyLiveRoundWords(), [{ username: 'Maya', word: 'cat' }, { username: 'Leo', word: 'house' }], lesson);
    s = foldLiveWords(s, [{ username: 'Noa', word: 'dog' }], lesson);
    expect(s.recent.map((r) => r.username)).toEqual(['Noa', 'Leo', 'Maya']);
    expect(new Set(s.recent.map((r) => r.id)).size).toBe(3);
  });

  it('Given a lesson word, Then its feed entry is marked as a lesson word', () => {
    const s = foldLiveWords(emptyLiveRoundWords(), [{ username: 'Leo', word: 'House' }, { username: 'Maya', word: 'cat' }], lesson);
    expect(s.recent.find((r) => r.username === 'Leo')?.lesson).toBe(true);
    expect(s.recent.find((r) => r.username === 'Maya')?.lesson).toBe(false);
  });

  it('Given more words than the feed holds, Then only the newest are kept', () => {
    const many = Array.from({ length: LIVE_FEED_MAX + 5 }, (_, i) => ({ username: `P${i}`, word: 'cat' }));
    const s = foldLiveWords(emptyLiveRoundWords(), many, lesson);
    expect(s.recent).toHaveLength(LIVE_FEED_MAX);
    expect(s.recent[0].username).toBe(`P${LIVE_FEED_MAX + 4}`);
  });

  it('Given the host plays, Then the host never shows in the feed', () => {
    const s = foldLiveWords(emptyLiveRoundWords(), [{ username: 'Ms', word: 'cat' }], lesson, 'Ms');
    expect(s.recent).toEqual([]);
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

describe('foldLiveWords — Hebrew lesson words written with niqqud', () => {
  it('GIVEN a vowelled Hebrew list WHEN a student finds the plain word off the board THEN the projector counts it', () => {
    const lesson = lessonWordSet(['לֶחֶם', 'מַיִם', 'חָלָב'], 'he');
    const s = foldLiveWords(emptyLiveRoundWords(), [{ username: 'Noa', word: 'לחמ' }, { username: 'Ido', word: 'מים' }], lesson, undefined, 'he');
    expect(s.lessonFound).toHaveLength(2);
    expect(lesson.size).toBe(3);
  });
});
