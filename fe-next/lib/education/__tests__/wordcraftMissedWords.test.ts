import { beforeEach, describe, expect, it } from 'vitest';
import {
  missedReviewHref,
  queueMissedForReview,
  saveWordCraftMisses,
  wordCraftMissedLessonWords,
} from '../wordcraftMissedWords';
import { buildReviewRun, collectReviewCandidates, reviewKey } from '../missedWordsReview';
import { loadLeitnerState } from '../missedWordsLeitnerStore';

const NOW = 1_700_000_000_000;

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

describe('queueMissedForReview', () => {
  it('puts each missed word in box 1, due now, keyed the way the review deck reads it', () => {
    const state = queueMissedForReview({ [reviewKey('L1', 'bird')]: { box: 4, due: NOW + 9e9, lapses: 0 } }, 'L1', ['bird', 'fish'], NOW);
    expect(state[reviewKey('L1', 'bird')]).toEqual({ box: 1, due: NOW, lapses: 1 });
    expect(state[reviewKey('L1', 'fish')]).toEqual({ box: 1, due: NOW, lapses: 1 });
  });

  it('makes the missed words lead the next review run', () => {
    const lessons = [{ id: 'L1', name: 'Pets', language: 'en' as const, words: ['cat', 'dog', 'bird', 'fish', 'frog'].map((word) => ({ word })) }];
    const candidates = collectReviewCandidates(lessons, []);
    const state = queueMissedForReview({}, 'L1', ['frog', 'fish'], NOW);
    const run = buildReviewRun(candidates, state, NOW, 'L1', 7);
    expect(run.slice(0, 2).map((c) => c.word).sort()).toEqual(['fish', 'frog']);
  });
});

describe('saveWordCraftMisses', () => {
  beforeEach(() => localStorage.clear());

  it('writes the misses to this student only', () => {
    saveWordCraftMisses('student-a', 'L1', ['bird'], NOW);
    expect(loadLeitnerState('student-a')[reviewKey('L1', 'bird')]?.box).toBe(1);
    expect(loadLeitnerState('student-b')).toEqual({});
  });

  it('keeps what the student already had in review', () => {
    saveWordCraftMisses('student-a', 'L1', ['bird'], NOW);
    saveWordCraftMisses('student-a', 'L2', ['fish'], NOW);
    const state = loadLeitnerState('student-a');
    expect(Object.keys(state).sort()).toEqual([reviewKey('L1', 'bird'), reviewKey('L2', 'fish')].sort());
  });

  it('does not throw when storage is unavailable', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota');
    };
    try {
      expect(() => saveWordCraftMisses('student-a', 'L1', ['bird'], NOW)).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('missedReviewHref', () => {
  it('opens the review on this lesson in the current locale', () => {
    expect(missedReviewHref('he', 'abc 1')).toBe('/he/student/review?lesson=abc%201');
  });
});
