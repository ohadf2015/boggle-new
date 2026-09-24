import { describe, it, expect } from 'vitest';
import {
  lessonWordHits,
  workshopStarsFor,
  summarizeWorkshop,
  WORKSHOP_STARS_EXACT,
  WORKSHOP_STARS_CONTAINS,
} from '../workshopLessonBonus';

describe('lessonWordHits', () => {
  it('GIVEN an UPPERCASE dictionary word equal to a lowercase lesson word WHEN matched THEN it is an exact hit', () => {
    const hits = lessonWordHits(['TEACHER'], ['teacher', 'puzzle'], 'en');
    expect(hits).toEqual([{ placed: 'TEACHER', lessonWord: 'TEACHER', kind: 'exact' }]);
  });

  it('GIVEN a placed word that CONTAINS a lesson word WHEN matched THEN it is a contains hit on that lesson word', () => {
    const hits = lessonWordHits(['TEACHERS'], ['teacher'], 'en');
    expect(hits).toEqual([{ placed: 'TEACHERS', lessonWord: 'TEACHER', kind: 'contains' }]);
  });

  it('GIVEN a two-letter lesson word WHEN a longer word contains it THEN it does NOT count (too cheap)', () => {
    expect(lessonWordHits(['GOAT'], ['go'], 'en')).toEqual([]);
    expect(lessonWordHits(['GO'], ['go'], 'en')).toEqual([{ placed: 'GO', lessonWord: 'GO', kind: 'exact' }]);
  });

  it('GIVEN a Hebrew lesson word with a final form WHEN the board spells it with the regular letter THEN it matches', () => {
    // Word Craft tiles carry only regular letters: שלום is spelled שלומ on the board.
    const hits = lessonWordHits(['שלומ'], ['שָׁלוֹם'], 'he');
    expect(hits).toHaveLength(1);
    expect(hits[0].kind).toBe('exact');
  });

  it('GIVEN a Spanish accented lesson word WHEN the board spells it unaccented THEN it matches', () => {
    expect(lessonWordHits(['CAMION'], ['camión'], 'es')[0]?.kind).toBe('exact');
  });

  it('GIVEN several placed words and duplicate lesson words WHEN matched THEN each placed word yields at most one hit, exact preferred', () => {
    const hits = lessonWordHits(['CAT', 'CATS', 'DOG'], ['cat', 'Cat', 'cats'], 'en');
    expect(hits).toEqual([
      { placed: 'CAT', lessonWord: 'CAT', kind: 'exact' },
      { placed: 'CATS', lessonWord: 'CATS', kind: 'exact' },
    ]);
  });

  it('GIVEN empty or junk input WHEN matched THEN no hits and no throw', () => {
    expect(lessonWordHits([], ['cat'], 'en')).toEqual([]);
    expect(lessonWordHits(['CAT'], [], 'en')).toEqual([]);
    expect(lessonWordHits(['CAT'], ['', '  '], 'en')).toEqual([]);
  });
});

describe('workshopStarsFor', () => {
  it('pays more for an exact lesson word than for a word that contains one', () => {
    expect(workshopStarsFor([{ placed: 'A', lessonWord: 'A', kind: 'exact' }])).toBe(WORKSHOP_STARS_EXACT);
    expect(workshopStarsFor([{ placed: 'AB', lessonWord: 'A', kind: 'contains' }])).toBe(WORKSHOP_STARS_CONTAINS);
    expect(WORKSHOP_STARS_EXACT).toBeGreaterThan(WORKSHOP_STARS_CONTAINS);
  });
});

describe('summarizeWorkshop', () => {
  it('GIVEN the player history WHEN summarized THEN lesson words are unique canonical, bot moves ignored, stars summed', () => {
    const summary = summarizeWorkshop(
      [
        { who: 'player', words: ['TEACHER'] },
        { who: 'bot', words: ['PUZZLE'] },
        { who: 'player', words: ['TEACHERS', 'AT'] },
      ],
      ['teacher', 'puzzle'],
      'en',
    );
    expect(summary.lessonWordsFound).toEqual(['TEACHER']);
    expect(summary.stars).toBe(WORKSHOP_STARS_EXACT + WORKSHOP_STARS_CONTAINS);
    expect(summary.hits).toBe(2);
  });
});
