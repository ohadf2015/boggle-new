/**
 * Guest practice progress — the on-device half of "no account needed".
 *
 * A student following a lesson link with no account has no `student_id`, so
 * every server-side progress row is closed to them. Rather than show them a
 * permanently blank scoreboard, the same three numbers the signed-in student
 * sees (sessions per mode, words met, mastery) are kept on the device, using
 * the storage helpers the rest of the app already uses for guest state.
 *
 * Device-bound on purpose. There is no merge on sign-in and this file must not
 * pretend otherwise.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  readGuestPractice,
  recordGuestPracticeStart,
  recordGuestPracticeResult,
  guestPracticeCounts,
  guestPracticeMastery,
  EMPTY_GUEST_PRACTICE,
} from '../practiceGuestProgress';

const LESSON = 'lesson-1';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('readGuestPractice', () => {
  it('starts empty rather than undefined', () => {
    expect(readGuestPractice(LESSON)).toEqual(EMPTY_GUEST_PRACTICE);
  });

  it('keeps two lessons apart', () => {
    recordGuestPracticeStart(LESSON, 'flashcard');
    expect(readGuestPractice('lesson-2').sessions.flashcard ?? 0).toBe(0);
  });

  it('survives corrupt storage instead of throwing at the student', () => {
    localStorage.setItem('lexiclash_guest_practice_lesson-1', '{not json');
    expect(readGuestPractice(LESSON)).toEqual(EMPTY_GUEST_PRACTICE);
  });
});

describe('recording a round', () => {
  it('counts a started session per mode', () => {
    recordGuestPracticeStart(LESSON, 'flashcard');
    recordGuestPracticeStart(LESSON, 'flashcard');
    recordGuestPracticeStart(LESSON, 'blitz');

    const record = readGuestPractice(LESSON);
    expect(record.sessions.flashcard).toBe(2);
    expect(record.sessions.blitz).toBe(1);
  });

  it('accumulates cards and de-duplicates the words met', () => {
    recordGuestPracticeResult(LESSON, {
      cardsReviewed: 4,
      cardsCorrect: 3,
      vocabularyWordsFound: ['banter', 'quorum'],
    });
    recordGuestPracticeResult(LESSON, {
      cardsReviewed: 2,
      cardsCorrect: 2,
      vocabularyWordsFound: ['BANTER', 'gambit'],
    });

    const record = readGuestPractice(LESSON);
    expect(record.cardsReviewed).toBe(6);
    expect(record.cardsCorrect).toBe(5);
    // Case-folded: a board that returns lowercase and a card deck that returns
    // the teacher's capitalisation are the same word met twice, not two words.
    expect(record.wordsFound.sort()).toEqual(['banter', 'gambit', 'quorum']);
  });

  it('stamps the last practice time so a streak has something to read', () => {
    recordGuestPracticeResult(LESSON, { cardsReviewed: 1, cardsCorrect: 1 });
    expect(readGuestPractice(LESSON).lastPracticeAt).not.toBeNull();
  });
});

describe('guestPracticeCounts', () => {
  it('maps onto the picker column names, so the tiles show plays', () => {
    recordGuestPracticeStart(LESSON, 'word_list');
    recordGuestPracticeStart(LESSON, 'solo_board');

    const counts = guestPracticeCounts(readGuestPractice(LESSON));
    expect(counts.word_list_views).toBe(1);
    expect(counts.solo_board_sessions).toBe(1);
    expect(counts.flashcard_sessions).toBe(0);
  });
});

describe('guestPracticeMastery', () => {
  it('is not_started with nothing done', () => {
    expect(guestPracticeMastery(readGuestPractice(LESSON), 5)).toBe('not_started');
  });

  it('never divides by zero on a lesson with no words', () => {
    expect(guestPracticeMastery({ ...EMPTY_GUEST_PRACTICE, cardsReviewed: 2, cardsCorrect: 2 }, 0))
      .toBe('not_started');
  });

  // Mirrors calculate_lesson_mastery (058): 60% word coverage + 40% accuracy,
  // thresholds 0.8 / 0.4 / >0. A guest and a signed-in student must not read
  // the same performance as two different words.
  it('reaches mastered on full coverage and full accuracy', () => {
    const record = {
      ...EMPTY_GUEST_PRACTICE,
      cardsReviewed: 5,
      cardsCorrect: 5,
      wordsFound: ['a', 'b', 'c', 'd', 'e'],
    };
    expect(guestPracticeMastery(record, 5)).toBe('mastered');
  });

  it('reads half the words with no cards as practicing', () => {
    const record = { ...EMPTY_GUEST_PRACTICE, wordsFound: ['a', 'b', 'c'] };
    // 3/4 * 0.6 = 0.45
    expect(guestPracticeMastery(record, 4)).toBe('practicing');
  });

  it('reads one word out of ten as started', () => {
    const record = { ...EMPTY_GUEST_PRACTICE, wordsFound: ['a'] };
    expect(guestPracticeMastery(record, 10)).toBe('started');
  });

  it('clamps coverage: finding more words than the lesson holds scores no higher', () => {
    // A solo board credits any real word the student traces, so `wordsFound`
    // can outrun the lesson's own list. Uncapped, that alone would read as
    // 'mastered' while the flashcard half was never touched.
    const overshoot = { ...EMPTY_GUEST_PRACTICE, wordsFound: ['a', 'b', 'c'] };
    const exact = { ...EMPTY_GUEST_PRACTICE, wordsFound: ['a', 'b'] };
    expect(guestPracticeMastery(overshoot, 2)).toBe(guestPracticeMastery(exact, 2));
    expect(guestPracticeMastery(overshoot, 2)).toBe('practicing');
  });
});
