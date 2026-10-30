import { describe, it, expect, beforeEach } from 'vitest';
import {
  startWordWheelRun, recordWordWheelRunProgress, getUnfinishedWordWheelRun, clearWordWheelRun,
  markWordWheelResultSubmitted,
} from '../wordWheelRun';
import {
  saveWordWheelResult, getWordWheelResultForDate, hasEverPlayedWordWheel,
} from '../storage';

const DATE = '2026-11-05';
const base = {
  puzzleNumber: 1, puzzleDate: DATE, language: 'en' as const, centerLetter: 'A', wordsFound: ['CAT'],
  totalPossible: 0, score: 12, timeSeconds: 120, streakDays: 0, completedAt: '2026-11-05T10:00:00Z',
};

beforeEach(() => localStorage.clear());

describe('word wheel run marker', () => {
  it('a started run with no result comes back with what was found', () => {
    startWordWheelRun('en', DATE);
    recordWordWheelRunProgress('en', DATE, { wordsFound: ['CAT', 'TACK'], score: 42 });
    expect(getUnfinishedWordWheelRun('en', DATE)).toMatchObject({ wordsFound: ['CAT', 'TACK'], score: 42 });
  });

  it('starting a run does not make the player look like a returning wheel player', () => {
    startWordWheelRun('en', DATE);
    expect(hasEverPlayedWordWheel('en')).toBe(false);
  });

  it('saving the result clears the marker', () => {
    startWordWheelRun('en', DATE);
    saveWordWheelResult(base);
    expect(getUnfinishedWordWheelRun('en', DATE)).toBeNull();
  });

  it('progress is ignored when no run was started', () => {
    recordWordWheelRunProgress('en', DATE, { wordsFound: ['CAT'], score: 12 });
    expect(getUnfinishedWordWheelRun('en', DATE)).toBeNull();
  });

  it('clearWordWheelRun removes it', () => {
    startWordWheelRun('en', DATE);
    clearWordWheelRun('en', DATE);
    expect(getUnfinishedWordWheelRun('en', DATE)).toBeNull();
  });
});

describe('submitted flag', () => {
  it('new results start unsubmitted, and can be marked', () => {
    saveWordWheelResult(base);
    expect(getWordWheelResultForDate('en', DATE)?.submittedToServer).toBe(false);
    markWordWheelResultSubmitted('en', DATE);
    expect(getWordWheelResultForDate('en', DATE)?.submittedToServer).toBe(true);
  });

  it('a result synced from the server is saved as submitted', () => {
    saveWordWheelResult(base, { submitted: true });
    expect(getWordWheelResultForDate('en', DATE)?.submittedToServer).toBe(true);
  });
});
