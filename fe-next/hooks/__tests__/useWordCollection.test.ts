import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWordCollection } from '../useWordCollection';
import * as spacedRepUtils from '@/lib/utils/spacedRepetition';

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

describe('useWordCollection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should return empty collection initially', () => {
    // GIVEN: no stored words
    // WHEN
    const { result } = renderHook(() => useWordCollection());

    // THEN
    expect(result.current.totalCollected).toBe(0);
    expect(result.current.words).toEqual([]);
    expect(result.current.dueForReview).toEqual([]);
    expect(result.current.masteredCount).toBe(0);
  });

  it('should collect a word with context', () => {
    // GIVEN: empty collection
    const { result } = renderHook(() => useWordCollection());

    // WHEN
    act(() => {
      result.current.collectWord('ephemeral', {
        foundInMode: 'classic',
        date: '2026-03-22',
      });
    });

    // THEN
    expect(result.current.totalCollected).toBe(1);
    expect(result.current.words).toHaveLength(1);
    expect(result.current.words[0].word).toBe('ephemeral');
  });

  it('should not duplicate already collected words', () => {
    // GIVEN: a word already collected
    const { result } = renderHook(() => useWordCollection());

    act(() => {
      result.current.collectWord('ephemeral', {
        foundInMode: 'classic',
        date: '2026-03-22',
      });
    });

    // WHEN: collect same word again
    act(() => {
      result.current.collectWord('ephemeral', {
        foundInMode: 'blast',
        date: '2026-03-22',
      });
    });

    // THEN
    expect(result.current.totalCollected).toBe(1);
  });

  it('should identify words due for review', () => {
    // GIVEN: a word with nextReviewDate in the past
    const { result } = renderHook(() => useWordCollection());

    act(() => {
      result.current.collectWord('serendipity', {
        foundInMode: 'classic',
        date: '2026-03-22',
      });
    });

    // THEN: newly added words are due immediately (nextReviewDate = today)
    expect(result.current.dueForReview.length).toBeGreaterThanOrEqual(1);
  });

  it('should review a word and update its schedule', () => {
    // GIVEN: a collected word
    const { result } = renderHook(() => useWordCollection());

    act(() => {
      result.current.collectWord('quixotic', {
        foundInMode: 'adventure',
        date: '2026-03-22',
      });
    });

    const beforeInterval = result.current.words[0].reviewData.interval;

    // WHEN: review with "I know it" (quality 5)
    act(() => {
      result.current.reviewWord('quixotic', 5);
    });

    // THEN: interval should remain 1 for first correct review (SM-2 rep=0->1, interval=1)
    expect(result.current.words[0].reviewData.repetitions).toBe(1);
  });

  it('should reset progress when review quality is low', () => {
    // GIVEN: a collected word reviewed once
    const { result } = renderHook(() => useWordCollection());

    act(() => {
      result.current.collectWord('eloquent', {
        foundInMode: 'classic',
        date: '2026-03-22',
      });
      result.current.reviewWord('eloquent', 5);
    });

    // WHEN: review with "forgot" (quality 0)
    act(() => {
      result.current.reviewWord('eloquent', 0);
    });

    // THEN: repetitions reset to 0
    expect(result.current.words[0].reviewData.repetitions).toBe(0);
  });

  it('should count mastered words (repetitions >= 5)', () => {
    // GIVEN: we need to mock a word with high repetitions
    const { result } = renderHook(() => useWordCollection());

    act(() => {
      result.current.collectWord('ubiquitous', {
        foundInMode: 'classic',
        date: '2026-03-22',
      });
    });

    // WHEN: simulate many successful reviews
    act(() => {
      // Review 5+ times to reach mastery
      for (let i = 0; i < 6; i++) {
        result.current.reviewWord('ubiquitous', 5);
      }
    });

    // THEN
    expect(result.current.masteredCount).toBe(1);
  });

  it('should persist to localStorage', () => {
    // GIVEN: empty collection
    const { result } = renderHook(() => useWordCollection());

    // WHEN
    act(() => {
      result.current.collectWord('persevere', {
        foundInMode: 'classic',
        date: '2026-03-22',
      });
    });

    // THEN: localStorage.setItem should have been called
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedKey = localStorageMock.setItem.mock.calls.find(
      (call: string[]) => call[0] === 'lexiclash_word_collection'
    );
    expect(savedKey).toBeTruthy();
  });

  it('should load persisted words on mount', () => {
    // GIVEN: words in localStorage
    const stored = [
      {
        word: 'tenacious',
        context: { foundInMode: 'classic', date: '2026-03-20' },
        reviewData: spacedRepUtils.createWordReviewData('tenacious'),
      },
    ];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(stored));

    // WHEN
    const { result } = renderHook(() => useWordCollection());

    // THEN
    expect(result.current.totalCollected).toBe(1);
    expect(result.current.words[0].word).toBe('tenacious');
  });
});
