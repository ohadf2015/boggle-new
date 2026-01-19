/**
 * @jest-environment jsdom
 *
 * Test for Daily Buzz score overflow bug fix
 * Bug: Score can exceed 100 when displayed as "score/100"
 * Fix: Cap displayed score at MAX_DISPLAY_SCORE (100)
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BuzzResultsScreen from '../BuzzResultsScreen';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock confetti utils
jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

// Mock the useLanguage hook
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    dir: 'ltr',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'buzz.results.title': 'Challenge Complete',
        'buzz.yourScore': 'Your Score',
        'buzz.tapToCelebrate': 'Tap to celebrate',
        'buzz.correct': 'Correct',
        'buzz.total': 'Total',
        'results.time': 'Time',
        'buzz.results.reviewTitle': 'Challenge Review',
        'buzz.feedback.correct': 'Correct',
        'buzz.feedback.incorrect': 'Incorrect',
        'buzz.results.skipped': 'Skipped',
        'buzz.results.correctAnswer': 'Correct',
        'buzz.results.yourAnswer': 'Your Answer',
        'buzz.results.trending': 'Trending Today',
        'buzz.results.share': 'Share Results',
        'daily.copyToClipboard': 'Copy',
        'common.copied': 'Copied',
        'daily.home': 'Back',
        'buzz.results.perfect': 'Perfect Score!',
        'buzz.share.text': '📰🔥 Daily Buzz: {topic} | {score}/100 | Beat this? 🔥',
      };
      return translations[key] || key;
    },
    initialize: jest.fn(),
    isLoading: false,
  }),
}));

describe('BuzzResultsScreen - Score Overflow Bug', () => {
  const mockChallengeData = {
    id: 1,
    puzzleDate: '2026-01-19',
    language: 'en',
    trendingSummary: 'Test Trending Topic',
    challenges: [
      {
        type: 'scrambled' as const,
        prompt: 'Challenge 1',
        answer: 'ANSWER1',
        trendingContext: 'Context 1',
      },
      {
        type: 'fillBlank' as const,
        prompt: 'Challenge 2',
        answer: 'ANSWER2',
        trendingContext: 'Context 2',
      },
      {
        type: 'chain' as const,
        prompt: 'Challenge 3',
        answer: 'ANSWER3',
        trendingContext: 'Context 3',
      },
      {
        type: 'spotOn' as const,
        prompt: 'Challenge 4',
        answer: 'ANSWER4',
        trendingContext: 'Context 4',
      },
      {
        type: 'trio' as const,
        prompt: 'Challenge 5',
        answer: 'ANSWER5',
        trendingContext: 'Context 5',
      },
      {
        type: 'wordle' as const,
        prompt: 'Challenge 6',
        answer: 'WORD6',
        trendingContext: 'Context 6',
      },
    ],
  };

  /**
   * Test that score is properly capped at 100 when raw score exceeds it
   * Fix: displayedScore = Math.min(resultData.score, MAX_DISPLAY_SCORE)
   */
  it('should cap score at 100 when raw score exceeds 100 (6 challenges perfect)', () => {
    // 6 challenges × 20 points = 120 raw points (exceeds 100)
    const resultData = {
      score: 120, // Raw score exceeds 100
      challengesSolved: mockChallengeData.challenges.map((_, index) => ({
        challengeIndex: index,
        userAnswer: `ANSWER${index + 1}`,
        correct: true,
      })),
      completionTimeSeconds: 60,
    };

    render(
      <BuzzResultsScreen
        challengeData={mockChallengeData}
        resultData={resultData}
        onBack={jest.fn()}
      />
    );

    // After fix: Score should be capped at 100, showing "100/100"
    // NOT "120/100" which was the buggy behavior
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();

    // Verify the uncapped score (120) is NOT displayed
    expect(screen.queryByText('120')).not.toBeInTheDocument();
  });

  it('should cap score at 100 with 7 challenges (140 raw points)', () => {
    const challengeData = {
      ...mockChallengeData,
      challenges: [
        ...mockChallengeData.challenges,
        {
          type: 'scrambled' as const,
          prompt: 'Challenge 7',
          answer: 'ANSWER7',
          trendingContext: 'Context 7',
        },
      ],
    };

    // 7 challenges × 20 points = 140 raw points
    const resultData = {
      score: 140,
      challengesSolved: challengeData.challenges.map((_, index) => ({
        challengeIndex: index,
        userAnswer: `ANSWER${index + 1}`,
        correct: true,
      })),
      completionTimeSeconds: 90,
    };

    render(
      <BuzzResultsScreen
        challengeData={challengeData}
        resultData={resultData}
        onBack={jest.fn()}
      />
    );

    // After fix: Score should be capped at 100
    expect(screen.getByText('100')).toBeInTheDocument();

    // Verify the uncapped score (140) is NOT displayed
    expect(screen.queryByText('140')).not.toBeInTheDocument();
  });

  it('should display score correctly at exactly 100 with 5 challenges', () => {
    const challengeData = {
      ...mockChallengeData,
      challenges: mockChallengeData.challenges.slice(0, 5),
    };

    // 5 challenges × 20 points = 100 points (correct max)
    const resultData = {
      score: 100,
      challengesSolved: challengeData.challenges.map((_, index) => ({
        challengeIndex: index,
        userAnswer: `ANSWER${index + 1}`,
        correct: true,
      })),
      completionTimeSeconds: 75,
    };

    render(
      <BuzzResultsScreen
        challengeData={challengeData}
        resultData={resultData}
        onBack={jest.fn()}
      />
    );

    // This is already correct - shows "100/100"
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('should display score correctly when under 100 (partial score)', () => {
    // 6 challenges × 15 points (with hint) = 90 points (under 100)
    const resultData = {
      score: 90,
      challengesSolved: mockChallengeData.challenges.map((_, index) => ({
        challengeIndex: index,
        userAnswer: `ANSWER${index + 1}`,
        correct: true,
      })),
      completionTimeSeconds: 80,
    };

    render(
      <BuzzResultsScreen
        challengeData={mockChallengeData}
        resultData={resultData}
        onBack={jest.fn()}
      />
    );

    // Score under 100, display should remain unchanged
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('should handle edge case of score exactly at 100', () => {
    const resultData = {
      score: 100,
      challengesSolved: mockChallengeData.challenges.map((_, index) => ({
        challengeIndex: index,
        userAnswer: `ANSWER${index + 1}`,
        correct: true,
      })),
      completionTimeSeconds: 50,
    };

    render(
      <BuzzResultsScreen
        challengeData={mockChallengeData}
        resultData={resultData}
        onBack={jest.fn()}
      />
    );

    // Score at exactly 100 should display as "100/100"
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });
});
