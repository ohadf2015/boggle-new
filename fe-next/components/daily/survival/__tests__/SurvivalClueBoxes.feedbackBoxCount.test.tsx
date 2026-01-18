/**
 * Test for feedback overlay box count
 *
 * Bug: When a player submits a word of different length than target,
 * the feedback overlay shows boxes equal to submitted word length
 * instead of target word length.
 *
 * Expected: Always show boxes equal to target word length (from hint),
 * filling submitted letters into their positions and showing '?' for remaining.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue } from '../types';

// Mock framer-motion to make tests synchronous
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('SurvivalClueBoxes - Feedback Box Count', () => {
  const createProps = (targetWord: string, feedback: LetterFeedback[] | null, showOverlay: boolean) => ({
    currentHint: {
      level: 0,
      hint: targetWord.split('').map(() => '_').join(' '),
      revealed: 0,
      unlockCost: 0,
    },
    targetWord,
    attempts: feedback ? [{
      word: feedback.map(f => f.letter).join(''),
      feedback,
      timestamp: Date.now(),
    }] : [],
    accumulatedClues: new Map<number, AccumulatedClue>(),
    revealedLetters: new Set<number>(),
    knownLetters: new Set<string>(),
    latestAttemptFeedback: feedback,
    showFeedbackOverlay: showOverlay,
    isClueGaining: false,
    isProtected: false,
    skipAnimations: true,
    gameDir: 'ltr' as const,
    t: (key: string) => key,
  });

  it('should show same number of boxes as target word length when submitted word is shorter', () => {
    // Target word is 5 letters (APPLE), submitted word is 3 letters (CAT)
    const targetWord = 'APPLE';
    const feedback: LetterFeedback[] = [
      { letter: 'C', position: 0, feedback: 'gray' },
      { letter: 'A', position: 1, feedback: 'yellow' }, // A exists in APPLE
      { letter: 'T', position: 2, feedback: 'gray' },
    ];

    render(<SurvivalClueBoxes {...createProps(targetWord, feedback, true)} />);

    // Should show 5 boxes (target word length), not 3 (submitted word length)
    const allBoxes = screen.getAllByText(/^[A-Z?]$/);
    expect(allBoxes).toHaveLength(5);

    // First 3 boxes should show submitted letters
    expect(allBoxes[0]).toHaveTextContent('C');
    expect(allBoxes[1]).toHaveTextContent('A');
    expect(allBoxes[2]).toHaveTextContent('T');

    // Remaining 2 boxes should show '?' placeholder
    expect(allBoxes[3]).toHaveTextContent('?');
    expect(allBoxes[4]).toHaveTextContent('?');
  });

  it('should show same number of boxes as target word length when submitted word is longer', () => {
    // Target word is 4 letters (CAKE), submitted word is 6 letters (CASTLE)
    const targetWord = 'CAKE';
    const feedback: LetterFeedback[] = [
      { letter: 'C', position: 0, feedback: 'green' },
      { letter: 'A', position: 1, feedback: 'green' },
      { letter: 'S', position: 2, feedback: 'gray' },
      { letter: 'T', position: 3, feedback: 'gray' },
      { letter: 'L', position: 4, feedback: 'gray' },
      { letter: 'E', position: 5, feedback: 'gray' },
    ];

    render(<SurvivalClueBoxes {...createProps(targetWord, feedback, true)} />);

    // Should show 4 boxes (target word length), not 6 (submitted word length)
    const allBoxes = screen.getAllByText(/^[A-Z]$/);
    expect(allBoxes).toHaveLength(4);

    // Should only show first 4 letters of submitted word
    expect(allBoxes[0]).toHaveTextContent('C');
    expect(allBoxes[1]).toHaveTextContent('A');
    expect(allBoxes[2]).toHaveTextContent('S');
    expect(allBoxes[3]).toHaveTextContent('T');
  });

  it('should show all boxes when submitted word matches target word length', () => {
    // Both target and submitted are 5 letters
    const targetWord = 'APPLE';
    const feedback: LetterFeedback[] = [
      { letter: 'A', position: 0, feedback: 'green' },
      { letter: 'P', position: 1, feedback: 'green' },
      { letter: 'P', position: 2, feedback: 'green' },
      { letter: 'L', position: 3, feedback: 'green' },
      { letter: 'E', position: 4, feedback: 'green' },
    ];

    render(<SurvivalClueBoxes {...createProps(targetWord, feedback, true)} />);

    const allBoxes = screen.getAllByText(/^[A-Z]$/);
    expect(allBoxes).toHaveLength(5);
  });

  it('should apply correct feedback colors to positions within target word length', () => {
    // Target word is 5 letters, submitted is 3 letters
    const targetWord = 'WORLD';
    const feedback: LetterFeedback[] = [
      { letter: 'W', position: 0, feedback: 'green' },
      { letter: 'A', position: 1, feedback: 'gray' },
      { letter: 'R', position: 2, feedback: 'yellow' },
    ];

    render(<SurvivalClueBoxes {...createProps(targetWord, feedback, true)} />);

    const wBox = screen.getByText('W').closest('div');
    expect(wBox).toHaveClass('bg-green-500');

    const aBox = screen.getByText('A').closest('div');
    expect(aBox).toHaveClass('bg-gray-400');

    const rBox = screen.getByText('R').closest('div');
    expect(rBox).toHaveClass('bg-yellow-500');
  });
});
