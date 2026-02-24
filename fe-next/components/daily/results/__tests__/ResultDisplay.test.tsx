/**
 * ResultDisplay Component Tests
 *
 * Tests for the score display in WordHunt daily challenge results.
 * Verifies that all scoring parameters are correctly used.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResultDisplay } from '../ResultDisplay';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';

// Mock framer-motion to render immediately
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

jest.mock('@/hooks/useCountUp', () => ({
  useCountUp: ({ target }: { target: number }) => target,
}));

jest.mock('@/utils/confettiUtils', () => ({
  fireConfetti: jest.fn(),
}));

jest.mock('@/shared/utils/wordNormalization', () => ({
  applyHebrewFinalLetters: (w: string) => w,
}));

describe('ResultDisplay Score Calculation', () => {
  describe('getScoreBreakdown', () => {
    it('should return 0 for unsolved puzzles', () => {
      const breakdown = getScoreBreakdown(100, 1, 20, false);
      expect(breakdown.total).toBe(0);
      expect(breakdown.speed).toBe(0);
      expect(breakdown.accuracy).toBe(0);
      expect(breakdown.exploration).toBe(0);
    });

    it('should calculate all components for solved puzzles', () => {
      // Perfect game: 100 life, 1 guess, 20 words
      const breakdown = getScoreBreakdown(100, 1, 20, true);
      expect(breakdown.speed).toBe(400);       // 100 * 4 = 400
      expect(breakdown.accuracy).toBe(400);    // 400 - (1-1) * 40 = 400
      expect(breakdown.exploration).toBe(200); // 20 * 10 = 200
      expect(breakdown.total).toBe(1000);
    });

    it('should calculate correct accuracy score for multiple guesses', () => {
      // 7 guesses: 400 - (7-1) * 40 = 400 - 240 = 160
      const breakdown = getScoreBreakdown(50, 7, 10, true);
      expect(breakdown.accuracy).toBe(160);
    });

    it('should NOT return accuracy score alone when other params are missing', () => {
      // If lifeRemaining and wordsFound are 0, only accuracy contributes
      // This was the bug: ResultDisplay wasn't receiving these props
      const breakdown = getScoreBreakdown(0, 7, 0, true);
      expect(breakdown.speed).toBe(0);
      expect(breakdown.exploration).toBe(0);
      expect(breakdown.accuracy).toBe(160);
      expect(breakdown.total).toBe(160); // Only accuracy score
    });

    it('should calculate total as sum of all components', () => {
      // 50 life: 50 * 4 = 200 speed
      // 3 guesses: 400 - (3-1) * 40 = 320 accuracy
      // 15 words: 15 * 10 = 150 exploration
      // Total: 200 + 320 + 150 = 670
      const breakdown = getScoreBreakdown(50, 3, 15, true);
      expect(breakdown.speed).toBe(200);
      expect(breakdown.accuracy).toBe(320);
      expect(breakdown.exploration).toBe(150);
      expect(breakdown.total).toBe(670);
    });
  });
});

describe('ResultDisplay Props Requirements', () => {
  it('should require lifeRemaining for accurate speed score', () => {
    // Default of 0 would give 0 speed score
    const withLife = getScoreBreakdown(50, 3, 10, true);
    const withoutLife = getScoreBreakdown(0, 3, 10, true);

    expect(withLife.speed).toBe(200);    // 50 * 4
    expect(withoutLife.speed).toBe(0);   // 0 * 4
    expect(withLife.total).toBeGreaterThan(withoutLife.total);
  });

  it('should require wordsDiscovered for accurate exploration score', () => {
    // Default of 0 would give 0 exploration score
    const withWords = getScoreBreakdown(50, 3, 10, true);
    const withoutWords = getScoreBreakdown(50, 3, 0, true);

    expect(withWords.exploration).toBe(100);    // 10 * 10
    expect(withoutWords.exploration).toBe(0);   // 0 * 10
    expect(withWords.total).toBeGreaterThan(withoutWords.total);
  });
});

const mockT = (key: string) => key;

describe('ResultDisplay Component', () => {
  const solvedProps = {
    solved: true,
    attemptsUsed: 3,
    targetWord: 'HELLO',
    streakDays: 5,
    language: 'en' as const,
    puzzleNumber: 42,
    countdown: '12:34:56',
    lifeRemaining: 60,
    wordsDiscovered: 8,
    t: mockT,
  };

  it('renders score hero with data-testid for solved puzzle', () => {
    render(<ResultDisplay {...solvedProps} />);
    expect(screen.getByTestId('score-hero')).toBeInTheDocument();
  });

  it('renders target word letters individually for animation', () => {
    render(<ResultDisplay {...solvedProps} targetWord="CAT" />);
    expect(screen.getByTestId('letter-C')).toBeInTheDocument();
    expect(screen.getByTestId('letter-A')).toBeInTheDocument();
    expect(screen.getByTestId('letter-T')).toBeInTheDocument();
  });

  it('renders puzzle number stamp badge', () => {
    render(<ResultDisplay {...solvedProps} />);
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('renders fail state without score hero', () => {
    render(<ResultDisplay {...solvedProps} solved={false} />);
    expect(screen.queryByTestId('score-hero')).not.toBeInTheDocument();
  });
});
