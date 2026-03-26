/**
 * useSpacedRepetition Hook Tests
 *
 * Tests for the spaced repetition schedule management hook.
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSpacedRepetition } from './useSpacedRepetition';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// Mock fetch (spaced rep now syncs with DB)
global.fetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ reviews: [] }) })
) as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useSpacedRepetition', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('initializes review schedule for new words', async () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple', 'banana', 'cherry'], 'lesson-1')
      , { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(Object.keys(result.current.reviewSchedule)).toContain('apple');
      expect(Object.keys(result.current.reviewSchedule)).toContain('banana');
      expect(Object.keys(result.current.reviewSchedule)).toContain('cherry');
    });

    it('creates initial review data with correct word', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      , { wrapper: createWrapper() });

      const appleData = result.current.reviewSchedule['apple'];
      expect(appleData).toBeDefined();
      expect(appleData.word).toBe('apple');
      expect(appleData.easeFactor).toBe(2.5);
      expect(appleData.repetitions).toBe(0);
    });

    it('isLoading starts true then resolves to false after DB sync', async () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      , { wrapper: createWrapper() });
      // Initially true (DB fetch in progress)
      expect(result.current.isLoading).toBe(true);
      // Resolves after DB fetch completes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('wordsForToday', () => {
    it('includes all new words (due today)', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple', 'banana'], 'lesson-1')
      , { wrapper: createWrapper() });

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
      , { wrapper: createWrapper() });

      expect(result.current.wordsForToday).not.toContain('apple');
    });
  });

  describe('recordReview', () => {
    it('updates the review schedule after recording a review', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      , { wrapper: createWrapper() });

      const initialRepetitions = result.current.reviewSchedule['apple'].repetitions;

      act(() => {
        result.current.recordReview('apple', 5);
      });

      expect(result.current.reviewSchedule['apple'].repetitions).toBe(initialRepetitions + 1);
    });

    it('persists updated schedule to localStorage', () => {
      const { result } = renderHook(() =>
        useSpacedRepetition(['apple'], 'lesson-1')
      , { wrapper: createWrapper() });

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
      , { wrapper: createWrapper() });

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
      , { wrapper: createWrapper() });

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
      , { wrapper: createWrapper() });

      expect(result.current.reviewSchedule['apple'].easeFactor).toBe(2.1);
      expect(result.current.reviewSchedule['apple'].repetitions).toBe(2);
    });

    it('uses different localStorage key per lessonId', () => {
      renderHook(() => useSpacedRepetition(['apple'], 'lesson-A'), { wrapper: createWrapper() });
      renderHook(() => useSpacedRepetition(['apple'], 'lesson-B'), { wrapper: createWrapper() });

      const calls = localStorageMock.getItem.mock.calls.map(c => c[0]);
      expect(calls).toContain('sr_schedule_lesson-A');
      expect(calls).toContain('sr_schedule_lesson-B');
    });

    it('handles corrupt localStorage gracefully', () => {
      localStorageMock.setItem('sr_schedule_lesson-bad', 'not-valid-json{{{');

      expect(() => {
        renderHook(() => useSpacedRepetition(['apple'], 'lesson-bad'), { wrapper: createWrapper() });
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
      , { wrapper: createWrapper() });

      expect(result.current.reviewSchedule['newword']).toBeDefined();
      expect(result.current.reviewSchedule['newword'].repetitions).toBe(0);
    });
  });
});
