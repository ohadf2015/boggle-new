/**
 * Daily Challenge Storage Tests
 *
 * Tests for localStorage operations, specifically win/loss status tracking
 */

import { getWordHuntStatusToday, getTodaysWordHuntResult, saveWordHuntResult, hasPlayedWordWheel, getWordWheelResultForDate } from '../storage';
import { getDailyChallengeDate } from '../dateUtils';
import { WORD_HUNT_STORAGE_KEY } from '../constants';
import type { WordHuntResult } from '../types';
import type { Language } from '@/types';

// Mock the storage helpers
vi.mock('@/utils/storageHelpers', () => ({
  getJsonFromLocalStorage: vi.fn(),
  saveJsonToLocalStorage: vi.fn(),
  removeFromLocalStorage: vi.fn(),
  getFromLocalStorage: vi.fn(),
}));

// Mock date utilities to return a consistent date
vi.mock('../dateUtils', () => ({
  getDailyChallengeDate: vi.fn(() => '2025-01-20'),
}));

// Mock streak utilities
vi.mock('../streaks', () => ({
  updateDailyStreak: vi.fn(() => ({
    currentStreak: 1,
    longestStreak: 1,
    lastPlayedDate: '2025-01-20',
    totalDailiesCompleted: 1,
  })),
}));

import { getJsonFromLocalStorage, saveJsonToLocalStorage, getFromLocalStorage } from '@/utils/storageHelpers';
// vi.mock hoists above, so these are already mocked vi.fn() instances

describe('getWordHuntStatusToday', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user has not played today', () => {
    it('should return null when no stored result exists', () => {
      // GIVEN - No result stored for today
      getJsonFromLocalStorage.mockReturnValue(null);

      // WHEN - Checking status for today
      const result = getWordHuntStatusToday('en' as Language);

      // THEN - Should return null
      expect(result).toBeNull();
    });
  });

  describe('when user has won today', () => {
    it('should return { solved: true } when user solved the puzzle', () => {
      // GIVEN - A stored result where user won
      const storedResult = {
        date: '2025-01-20',
        puzzleNumber: 123,
        result: {
          puzzleNumber: 123,
          puzzleDate: '2025-01-20',
          language: 'en',
          solved: true,
          attemptsUsed: 3,
          targetWord: 'HELLO',
          attempts: [],
          wordsDiscovered: [],
          lifeRemaining: 2,
          clueTokensEarned: 0,
          clueTokensSpent: 0,
          hintsUnlocked: 0,
          efficiencyScore: 85,
          streakDays: 5,
          completedAt: '2025-01-20T10:00:00Z',
        },
        completedAt: '2025-01-20T10:00:00Z',
        submittedToServer: true,
      };
      getJsonFromLocalStorage.mockReturnValue(storedResult);

      // WHEN - Checking status for today
      const result = getWordHuntStatusToday('en' as Language);

      // THEN - Should return solved: true
      expect(result).toEqual({ solved: true });
    });
  });

  describe('when user has lost today', () => {
    it('should return { solved: false } when user failed the puzzle', () => {
      // GIVEN - A stored result where user lost
      const storedResult = {
        date: '2025-01-20',
        puzzleNumber: 123,
        result: {
          puzzleNumber: 123,
          puzzleDate: '2025-01-20',
          language: 'en',
          solved: false,
          attemptsUsed: 10,
          targetWord: 'HELLO',
          attempts: [],
          wordsDiscovered: [],
          lifeRemaining: 0,
          clueTokensEarned: 0,
          clueTokensSpent: 0,
          hintsUnlocked: 0,
          efficiencyScore: 0,
          streakDays: 0,
          completedAt: '2025-01-20T10:00:00Z',
        },
        completedAt: '2025-01-20T10:00:00Z',
        submittedToServer: true,
      };
      getJsonFromLocalStorage.mockReturnValue(storedResult);

      // WHEN - Checking status for today
      const result = getWordHuntStatusToday('en' as Language);

      // THEN - Should return solved: false
      expect(result).toEqual({ solved: false });
    });
  });

  describe('storage key construction', () => {
    it('should use correct storage key format for English', () => {
      // GIVEN - Mocked storage and mocked date
      getJsonFromLocalStorage.mockReturnValue(null);
      const mockDate = (getDailyChallengeDate as jest.Mock)();

      // WHEN - Checking status for English
      getWordHuntStatusToday('en' as Language);

      // THEN - Should construct correct key with language and date
      expect(getJsonFromLocalStorage).toHaveBeenCalledWith(
        `${WORD_HUNT_STORAGE_KEY}_en_${mockDate}`,
        null
      );
    });

    it('should use correct storage key format for Hebrew', () => {
      // GIVEN - Mocked storage and mocked date
      getJsonFromLocalStorage.mockReturnValue(null);
      const mockDate = (getDailyChallengeDate as jest.Mock)();

      // WHEN - Checking status for Hebrew
      getWordHuntStatusToday('he' as Language);

      // THEN - Should construct correct key with language and date
      expect(getJsonFromLocalStorage).toHaveBeenCalledWith(
        `${WORD_HUNT_STORAGE_KEY}_he_${mockDate}`,
        null
      );
    });
  });

  describe('validation of stored data', () => {
    it('should return null for invalid attemptsUsed (less than 1)', () => {
      // GIVEN - A stored result with invalid attemptsUsed
      const storedResult = {
        date: '2025-01-20',
        puzzleNumber: 123,
        result: {
          solved: true,
          attemptsUsed: 0, // Invalid - should be at least 1
        },
        completedAt: '2025-01-20T10:00:00Z',
      };
      getJsonFromLocalStorage.mockReturnValue(storedResult);

      // WHEN - Checking status for today
      const result = getWordHuntStatusToday('en' as Language);

      // THEN - Should return null (invalid data discarded)
      expect(result).toBeNull();
    });

    it('should return null for invalid attemptsUsed (greater than 10)', () => {
      // GIVEN - A stored result with invalid attemptsUsed
      const storedResult = {
        date: '2025-01-20',
        puzzleNumber: 123,
        result: {
          solved: false,
          attemptsUsed: 15, // Invalid - should be max 10
        },
        completedAt: '2025-01-20T10:00:00Z',
      };
      getJsonFromLocalStorage.mockReturnValue(storedResult);

      // WHEN - Checking status for today
      const result = getWordHuntStatusToday('en' as Language);

      // THEN - Should return null (invalid data discarded)
      expect(result).toBeNull();
    });
  });
});

describe('getTodaysWordHuntResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return full stored result when valid', () => {
    // GIVEN - A valid stored result
    const storedResult = {
      date: '2025-01-20',
      puzzleNumber: 123,
      result: {
        solved: true,
        attemptsUsed: 5,
      },
      completedAt: '2025-01-20T10:00:00Z',
    };
    getJsonFromLocalStorage.mockReturnValue(storedResult);

    // WHEN - Getting today's result
    const result = getTodaysWordHuntResult('en' as Language);

    // THEN - Should return the full result
    expect(result).toEqual(storedResult);
  });

  it('should return null when result has invalid attemptsUsed', () => {
    // GIVEN - A stored result with invalid attempts
    const storedResult = {
      date: '2025-01-20',
      puzzleNumber: 123,
      result: {
        solved: true,
        attemptsUsed: 0, // Invalid
      },
    };
    getJsonFromLocalStorage.mockReturnValue(storedResult);

    // WHEN - Getting today's result
    const result = getTodaysWordHuntResult('en' as Language);

    // THEN - Should return null
    expect(result).toBeNull();
  });
});

describe('hasPlayedWordWheel (date-parameterized)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when no result stored for given date', () => {
    (getFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(hasPlayedWordWheel('en' as Language, '2025-01-18')).toBe(false);
  });

  it('returns true when result exists for given date', () => {
    (getFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue('{}');
    expect(hasPlayedWordWheel('en' as Language, '2025-01-18')).toBe(true);
  });

  it('checks correct storage key for the specific date', () => {
    hasPlayedWordWheel('he' as Language, '2025-01-19');
    expect(getFromLocalStorage).toHaveBeenCalledWith('lexiclash_word_wheel_he_2025-01-19');
  });
});

describe('getWordWheelResultForDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no result stored', () => {
    (getJsonFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(null);
    expect(getWordWheelResultForDate('en' as Language, '2025-01-18')).toBeNull();
  });

  it('returns stored result for the given date', () => {
    const stored = { date: '2025-01-18', puzzleNumber: 20, result: { score: 42 } };
    (getJsonFromLocalStorage as ReturnType<typeof vi.fn>).mockReturnValue(stored);
    expect(getWordWheelResultForDate('en' as Language, '2025-01-18')).toEqual(stored);
  });
});
