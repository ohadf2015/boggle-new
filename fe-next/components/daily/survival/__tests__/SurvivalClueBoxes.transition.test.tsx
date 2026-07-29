/**
 * Integration test for yellow letter persistence during feedback overlay transition
 *
 * Bug: Yellow letters disappear after feedback overlay dismisses
 * Fix: Changed AnimatePresence mode from "wait" to "sync" and removed dynamic key
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue } from '../types';

// Mock framer-motion to make tests synchronous
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('SurvivalClueBoxes - Transition Tests', () => {
  const defaultProps = {
    currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
    targetWord: 'APPLE',
    attempts: [] as { word: string; feedback: LetterFeedback[]; timestamp: number }[],
    accumulatedClues: new Map<number, AccumulatedClue>(),
    revealedLetters: new Set<number>(),
    knownLetters: new Set<string>(),
    latestAttemptFeedback: null as LetterFeedback[] | null,
    showFeedbackOverlay: false,
    isClueGaining: false,
    skipAnimations: true,
    gameDir: 'ltr' as const,
    t: (key: string) => key,
  };

  it('should persist yellow letter when transitioning from overlay to hint boxes', () => {
    const feedback: LetterFeedback[] = [
      { letter: 'P', position: 0, feedback: 'yellow' },
      { letter: 'X', position: 1, feedback: 'gray' },
      { letter: 'X', position: 2, feedback: 'gray' },
      { letter: 'X', position: 3, feedback: 'gray' },
      { letter: 'X', position: 4, feedback: 'gray' },
    ];

    const attempts = [
      {
        word: 'PXXXX',
        feedback,
        timestamp: Date.now(),
      },
    ];

    // Step 1: Render with overlay showing (simulating right after guess)
    const { rerender } = render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        latestAttemptFeedback={feedback}
        showFeedbackOverlay={true}
      />
    );

    // During overlay, should show feedback letters
    expect(screen.getByText('P')).toBeInTheDocument();

    // Step 2: Transition to hint boxes (overlay dismisses)
    rerender(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        latestAttemptFeedback={feedback}
        showFeedbackOverlay={false}
      />
    );

    // After overlay dismisses, yellow letter should STILL be visible
    expect(screen.getByText('P')).toBeInTheDocument();

    // Verify it has yellow styling
    const yellowBox = screen.getByText('P').closest('div');
    expect(yellowBox).toHaveClass('bg-neo-yellow');
  });

  it('should maintain yellow letters across multiple rerender cycles', () => {
    const feedback: LetterFeedback[] = [
      { letter: 'L', position: 0, feedback: 'yellow' },
      { letter: 'E', position: 1, feedback: 'yellow' },
      { letter: 'X', position: 2, feedback: 'gray' },
      { letter: 'X', position: 3, feedback: 'gray' },
      { letter: 'X', position: 4, feedback: 'gray' },
    ];

    const attempts = [
      {
        word: 'LEXXX',
        feedback,
        timestamp: Date.now(),
      },
    ];

    // Start with overlay
    const { rerender } = render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        latestAttemptFeedback={feedback}
        showFeedbackOverlay={true}
      />
    );

    // Transition to hint boxes
    rerender(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        latestAttemptFeedback={feedback}
        showFeedbackOverlay={false}
      />
    );

    // Multiple yellow letters should persist
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();

    // Rerender again (simulating React updates)
    rerender(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        latestAttemptFeedback={null}
        showFeedbackOverlay={false}
      />
    );

    // Yellow letters should still be visible
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('should replace yellow with green when correct position found after transition', () => {
    const yellowFeedback: LetterFeedback[] = [
      { letter: 'P', position: 0, feedback: 'yellow' },
      { letter: 'X', position: 1, feedback: 'gray' },
      { letter: 'X', position: 2, feedback: 'gray' },
      { letter: 'X', position: 3, feedback: 'gray' },
      { letter: 'X', position: 4, feedback: 'gray' },
    ];

    const greenFeedback: LetterFeedback[] = [
      { letter: 'A', position: 0, feedback: 'green' },
      { letter: 'P', position: 1, feedback: 'green' },
      { letter: 'X', position: 2, feedback: 'gray' },
      { letter: 'X', position: 3, feedback: 'gray' },
      { letter: 'X', position: 4, feedback: 'gray' },
    ];

    const attempts = [
      { word: 'PXXXX', feedback: yellowFeedback, timestamp: Date.now() - 1000 },
      { word: 'APXXX', feedback: greenFeedback, timestamp: Date.now() },
    ];

    // Show feedback overlay for second attempt
    const { rerender } = render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        latestAttemptFeedback={greenFeedback}
        showFeedbackOverlay={true}
      />
    );

    // Transition to hint boxes
    rerender(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        latestAttemptFeedback={greenFeedback}
        showFeedbackOverlay={false}
      />
    );

    // Position 0 should show 'A' (green from second attempt)
    const aBox = screen.getByText('A').closest('div');
    expect(aBox).toHaveClass('bg-neo-lime');

    // Position 1 should show 'P' (green from second attempt)
    const pBox = screen.getByText('P').closest('div');
    expect(pBox).toHaveClass('bg-neo-lime');
  });
});
