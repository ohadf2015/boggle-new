import { describe, expect, it } from 'vitest';
import { MAX_STUDY_CARDS, buildStudyCards, parseStudyCards } from '../studyCards';

describe('buildStudyCards', () => {
  it('pairs each game word with the definition the teacher wrote, in game order', () => {
    const rows = [[{ word: 'Xylem', definition: 'Carries water up a plant', hint: 'tube' }, { word: 'stomata', definition: 'Leaf pores' }]];
    expect(buildStudyCards(['stomata', 'xylem'], rows)).toEqual([
      { word: 'stomata', definition: 'Leaf pores' },
      { word: 'xylem', definition: 'Carries water up a plant', hint: 'tube' },
    ]);
  });

  it('keeps plain-string lessons as bare word cards', () => {
    expect(buildStudyCards(['star', 'moon'], [['STAR', 'MOON']])).toEqual([{ word: 'star' }, { word: 'moon' }]);
  });

  it('falls back to the lesson words when the game list is empty', () => {
    expect(buildStudyCards([], [[{ word: 'river', definition: 'Flowing water' }, 'cat']])).toEqual([
      { word: 'river', definition: 'Flowing water' },
      { word: 'cat' },
    ]);
  });

  it('drops blanks and duplicates, clips long text and caps the deck', () => {
    const long = 'x'.repeat(1000);
    const words = ['a', 'A', ' ', ...Array.from({ length: 60 }, (_, i) => `w${i}`)];
    const cards = buildStudyCards(words, [[{ word: 'a', definition: long }]]);
    expect(cards).toHaveLength(MAX_STUDY_CARDS);
    expect(cards[0].word).toBe('a');
    expect(cards[0].definition!.length).toBeLessThanOrEqual(240);
    expect(cards.filter((c) => c.word.toLowerCase() === 'a')).toHaveLength(1);
  });

  it('survives junk rows', () => {
    expect(buildStudyCards(['sun'], [null, 7, [{ nope: 1 }, { word: 5 }]])).toEqual([{ word: 'sun' }]);
  });
});

describe('parseStudyCards', () => {
  it('keeps well-formed cards and drops the rest', () => {
    expect(parseStudyCards([{ word: 'sun', definition: 'Star', hint: 3 }, { word: '' }, 'moon', null])).toEqual([
      { word: 'sun', definition: 'Star' },
    ]);
  });

  it('treats a non-array as no deck', () => {
    expect(parseStudyCards(undefined)).toEqual([]);
  });
});
