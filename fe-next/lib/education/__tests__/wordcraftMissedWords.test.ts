import { describe, expect, it } from 'vitest';
import { missedReviewHref, wordCraftMissedLessonWords } from '../wordcraftMissedWords';

describe('wordCraftMissedLessonWords', () => {
  it('returns the dealt lesson words the player did not build, as the teacher typed them', () => {
    const missed = wordCraftMissedLessonWords({
      lessonWords: [' Cat ', 'dog', 'bird', 'fish'],
      dealt: ['CAT', 'DOG', 'BIRD', 'FISH'],
      built: ['DOG'],
      language: 'en',
    });
    expect(missed).toEqual(['Cat', 'bird', 'fish']);
  });

  it('never blames the student for a word the board could not deal', () => {
    const missed = wordCraftMissedLessonWords({
      lessonWords: ['cat', 'encyclopedia'],
      dealt: ['CAT'],
      built: [],
      language: 'en',
    });
    expect(missed).toEqual(['cat']);
  });

  it('matches Hebrew final forms so a built word is not reported missed', () => {
    const missed = wordCraftMissedLessonWords({
      lessonWords: ['שלום', 'ספר'],
      dealt: ['שלומ', 'ספר'],
      built: ['שלומ'],
      language: 'he',
    });
    expect(missed).toEqual(['ספר']);
  });

  it('dedupes and drops words the review deck cannot show', () => {
    const missed = wordCraftMissedLessonWords({
      lessonWords: ['cat', 'CAT', 'ice cream', 'a'],
      dealt: ['CAT', 'ICECREAM', 'A'],
      built: [],
      language: 'en',
    });
    expect(missed).toEqual(['cat']);
  });

  it('returns nothing when nothing was dealt (unsupported lesson language)', () => {
    expect(wordCraftMissedLessonWords({ lessonWords: ['cat'], dealt: [], built: [], language: 'en' })).toEqual([]);
  });
});

describe('missedReviewHref', () => {
  it('opens the review on this lesson in the current locale', () => {
    expect(missedReviewHref('he', 'abc 1')).toBe('/he/student/review?lesson=abc%201');
  });
});
