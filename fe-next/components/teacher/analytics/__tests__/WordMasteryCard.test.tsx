/**
 * WordMasteryCard — the Teacher Pro "Word Mastery" card. Renders from
 * useWordMasteryTrend; every string goes through t() so tests see raw keys.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { WordMasteryCard } from '../WordMasteryCard';
import { useWordMasteryTrend } from '@/hooks/useWordMasteryTrend';
import type { ClassMastery } from '@/lib/education/wordMasteryTrend';

vi.mock('@/hooks/useWordMasteryTrend');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      let result = key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
      }
      return result;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

const mockRefresh = vi.fn();

function mastery(overrides: Partial<ClassMastery> = {}): ClassMastery {
  return {
    students: [],
    classStuckWords: [],
    sessionsAnalyzed: 0,
    rowsSkipped: 0,
    ...overrides,
  };
}

const useHook = vi.mocked(useWordMasteryTrend);

describe('WordMasteryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading indicator while fetching', () => {
    useHook.mockReturnValue({ mastery: null, isLoading: true, error: null, refresh: mockRefresh });

    render(<WordMasteryCard classroomId="class-1" />);

    expect(screen.getByTestId('word-mastery-loading')).toBeInTheDocument();
  });

  it('renders an error with a working retry', () => {
    useHook.mockReturnValue({
      mastery: null,
      isLoading: false,
      error: new Error('boom'),
      refresh: mockRefresh,
    });

    render(<WordMasteryCard classroomId="class-1" />);

    expect(screen.getByTestId('word-mastery-error')).toBeInTheDocument();
    fireEvent.click(screen.getByText('education.analytics.retry'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state when there are no evidence sessions', () => {
    useHook.mockReturnValue({
      mastery: mastery({ sessionsAnalyzed: 0 }),
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(<WordMasteryCard classroomId="class-1" />);

    expect(screen.getByTestId('word-mastery-empty')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.wordMastery.emptyTitle')).toBeInTheDocument();
  });

  it('counts mastered/improving/stuck words across every student', () => {
    useHook.mockReturnValue({
      mastery: mastery({
        sessionsAnalyzed: 4,
        students: [
          {
            studentId: 'stu-1',
            masteredCount: 1,
            stuckWords: ['fox'],
            words: [
              { word: 'cat', display: 'cat', attempts: 2, correct: 2, firstSeen: '', lastSeen: '', lastCorrect: true, trend: 'mastered' },
              { word: 'dog', display: 'dog', attempts: 2, correct: 1, firstSeen: '', lastSeen: '', lastCorrect: true, trend: 'improving' },
              { word: 'fox', display: 'fox', attempts: 2, correct: 0, firstSeen: '', lastSeen: '', lastCorrect: false, trend: 'stuck' },
            ],
          },
          {
            studentId: 'stu-2',
            masteredCount: 0,
            stuckWords: ['fox'],
            words: [
              { word: 'fox', display: 'fox', attempts: 2, correct: 0, firstSeen: '', lastSeen: '', lastCorrect: false, trend: 'stuck' },
            ],
          },
        ],
        classStuckWords: [{ word: 'fox', display: 'fox', studentsStuck: 2, studentsWithEvidence: 2 }],
      }),
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(<WordMasteryCard classroomId="class-1" />);

    expect(screen.getByTestId('word-mastery-mastered')).toHaveTextContent('1');
    expect(screen.getByTestId('word-mastery-improving')).toHaveTextContent('1');
    expect(screen.getByTestId('word-mastery-stuck')).toHaveTextContent('2');

    const chip = screen.getByTestId('stuck-word-chip');
    expect(chip).toHaveTextContent('fox');
    expect(chip).toHaveTextContent('education.analytics.wordMastery.studentsStuck');
  });

  it('shows the reteach-empty message when nothing is stuck', () => {
    useHook.mockReturnValue({
      mastery: mastery({ sessionsAnalyzed: 3, students: [], classStuckWords: [] }),
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    render(<WordMasteryCard classroomId="class-1" />);

    expect(screen.getByText('education.analytics.wordMastery.reteachEmpty')).toBeInTheDocument();
  });

  it('sends the top stuck words to onCreateReviewLesson', () => {
    useHook.mockReturnValue({
      mastery: mastery({
        sessionsAnalyzed: 3,
        classStuckWords: [
          { word: 'fox', display: 'fox', studentsStuck: 3, studentsWithEvidence: 3 },
          { word: 'owl', display: 'owl', studentsStuck: 2, studentsWithEvidence: 3 },
        ],
      }),
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
    const onCreateReviewLesson = vi.fn();

    render(<WordMasteryCard classroomId="class-1" onCreateReviewLesson={onCreateReviewLesson} />);

    fireEvent.click(screen.getByText('education.analytics.createReviewLesson'));
    expect(onCreateReviewLesson).toHaveBeenCalledWith(['fox', 'owl']);
  });
});
