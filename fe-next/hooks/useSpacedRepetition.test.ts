/**
 * useSpacedRepetition Hook Tests
 *
 * Tests for the spaced repetition schedule management hook.
 */

import { renderHook, act } from '@testing-library/react';
import { useSpacedRepetition } from './useSpacedRepetition';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useSpacedRepetition', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes review schedule for new words', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple', 'banana', 'cherry'], 'lesson-1')
      );

      expect(result.current.isLoading).toBe(false);
      expect(Object.keys(result.current.reviewSchedule)).toContain('apple');
      expect(Object.keys(result.current.reviewSchedule)).toContain('banana');
      expect(Object.keys(result.current.reviewSchedule)).toContain('cherry');
    });

    it('creates initial review data with correct word', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      );

      const appleData = result.current.reviewSchedule['apple'];
      expect(appleData).toBeDefined();
      expect(appleData.word).toBe('apple');
      expect(appleData.easeFactor).toBe(2.5);
      expect(appleData.repetitions).toBe(0);
    });

    it('isLoading starts false (synchronous init from localStorage)', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('wordsForToday', () => {
    it('includes all new words (due today)', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple', 'banana'], 'lesson-1')
      );

      // New words are initialized with nextReviewDate = today
      expect(result.current.wordsForToday).toContain('apple');
      expect(result.current.wordsForToday).toContain('banana');
    });

    it('excludes words with future review dates', () => {
      // Pre-populate localStorage with a word that has a future date
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const storedSchedule = {
        apple: {
          word: 'apple',
          easeFactor: 2.5,
          interval: 10,
          repetitions: 2,
          nextReviewDate: future.toISOString().split('T')[0],
          lastReviewDate: new Date().toISOString().split('T')[0],
        },
      };
      localStorageMock.setItem('sr_schedule_lesson-2', JSON.stringify(storedSchedule));

      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-2')
      );

      expect(result.current.wordsForToday).not.toContain('apple');
    });
  });

  describe('recordReview', () => {
    it('updates the review schedule after recording a review', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      );

      const initialRepetitions = result.current.reviewSchedule['apple'].repetitions;

      act(() => {
        result.current.recordReview('apple', 5);
      });

      expect(result.current.reviewSchedule['apple'].repetitions).toBe(initialRepetitions + 1);
    });

    it('persists updated schedule to localStorage', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      );

      act(() => {
        result.current.recordReview('apple', 4);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sr_schedule_lesson-1',
        expect.any(String)
      );
    });

    it('removes word from wordsForToday after correct review', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      );

      // apple starts as due today
      expect(result.current.wordsForToday).toContain('apple');

      act(() => {
        result.current.recordReview('apple', 5);
      });

      // After review, interval advances so apple is no longer due today
      expect(result.current.wordsForToday).not.toContain('apple');
    });

    it('does nothing for unknown word', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      );

      const scheduleBefore = { ...result.current.reviewSchedule };

      act(() => {
        result.current.recordReview('nonexistent', 5);
      });

      expect(result.current.reviewSchedule).toEqual(scheduleBefore);
    });
  });

  describe('localStorage persistence', () => {
    it('loads existing schedule from localStorage on mount', () => {
      const storedSchedule = {
        apple: {
          word: 'apple',
          easeFactor: 2.1,
          interval: 6,
          repetitions: 2,
          nextReviewDate: new Date().toISOString().split('T')[0],
          lastReviewDate: '2026-02-19',
        },
      };
      localStorageMock.setItem('sr_schedule_lesson-3', JSON.stringify(storedSchedule));

      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-3')
      );

      expect(result.current.reviewSchedule['apple'].easeFactor).toBe(2.1);
      expect(result.current.reviewSchedule['apple'].repetitions).toBe(2);
    });

    it('uses different localStorage key per lessonId', () => {
      renderHook(() => useSpacedRepetition(['apple'], 'lesson-A'));
      renderHook(() => useSpacedRepetition(['apple'], 'lesson-B'));

      const calls = localStorageMock.getItem.mock.calls.map(c => c[0]);
      expect(calls).toContain('sr_schedule_lesson-A');
      expect(calls).toContain('sr_schedule_lesson-B');
    });

    it('handles corrupt localStorage gracefully', () => {
      localStorageMock.setItem('sr_schedule_lesson-bad', 'not-valid-json{{{');

      expect(() => {
        renderHook(() => useSpacedRepetition(['apple'], 'lesson-bad'));
      }).not.toThrow();
    });

    it('initializes new words not found in stored schedule', () => {
      const storedSchedule = {
        apple: {
          word: 'apple',
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date().toISOString().split('T')[0],
          lastReviewDate: new Date().toISOString().split('T')[0],
        },
      };
      localStorageMock.setItem('sr_schedule_lesson-4', JSON.stringify(storedSchedule));

      const { result } = renderHook(() =>
        useSpacedRepetition(['apple', 'newword'], 'lesson-4')
      );

      expect(result.current.reviewSchedule['newword']).toBeDefined();
      expect(result.current.reviewSchedule['newword'].repetitions).toBe(0);
    });
  });
});
