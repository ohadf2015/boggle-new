/**
 * Tests for removing yellow letters from clue boxes when letter is found in correct position
 *
 * Bug: When a yellow letter (e.g., P at position 0) is later found in its correct green position
 * (e.g., P at positions 1 and 2 for target APPLE), the yellow clue at position 0 should be
 * removed (replaced with "?") and the letter should be removed from knownLetters.
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

describe('SurvivalClueBoxes - Yellow Letter Removal When Found Green', () => {
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

  it('should remove yellow letter from clue box when letter is found in correct position', () => {
    // Target: APPLE (P's are at positions 1 and 2)
    // Guess 1: PXXXX - Yellow P at position 0 (P is in word but not at position 0)
    // Guess 2: XPPXX - Green P at positions 1 and 2 (correct positions)
    //
    // After guess 2, the yellow P at position 0 should be REMOVED because we now know
    // where all the P's are (positions 1 and 2). The P at position 0 was wrong.

    const attempts = [
      {
        word: 'PXXXX',
        feedback: [
          { letter: 'P', position: 0, feedback: 'yellow' as const }, // P in wrong spot
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 2000,
      },
      {
        word: 'XPPXX',
        feedback: [
          { letter: 'X', position: 0, feedback: 'gray' as const },
          { letter: 'P', position: 1, feedback: 'green' as const }, // First P found!
          { letter: 'P', position: 2, feedback: 'green' as const }, // Second P found!
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 1000,
      },
    ];

    // After finding both P's, they should be in accumulatedClues as green
    const accumulatedClues = new Map<number, AccumulatedClue>([
      [1, { letter: 'P', type: 'green' }],
      [2, { letter: 'P', type: 'green' }],
    ]);

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        accumulatedClues={accumulatedClues}
        knownLetters={new Set<string>()} // P removed from knownLetters since all found
        showFeedbackOverlay={false}
      />
    );

    // Position 0 should show "?" NOT "P" - because the yellow P was at the wrong spot
    // and we've now found where all the P's are (positions 1 and 2)
    const position0Box = screen.getAllByText(/[?PAX]/)[0]; // First box
    // Check that position 0 is NOT showing P (since we found both P's elsewhere)

    // Find all boxes and check position 0 specifically
    const allBoxes = screen.getAllByRole('generic').filter(el =>
      el.classList.contains('bg-neo-yellow') ||
      el.classList.contains('bg-neo-lime') ||
      el.classList.contains('bg-neo-black')
    );

    // Position 1 and 2 should show green P's
    expect(screen.getAllByText('P')).toHaveLength(2); // Only 2 P's (at positions 1 and 2)

    // Position 0 should show "?" (since yellow P should be removed)
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks.length).toBeGreaterThanOrEqual(1); // At least position 0 should have ?

    // Specifically verify position 0 doesn't have a yellow P
    // Get all elements with P and verify none have yellow background at position 0
    const pElements = screen.getAllByText('P');
    pElements.forEach(pEl => {
      const box = pEl.closest('div');
      // All P's should be green (in correct positions), not yellow
      expect(box).toHaveClass('bg-neo-lime');
      expect(box).not.toHaveClass('bg-neo-yellow');
    });
  });

  it('should keep yellow letter when not all occurrences are found as green', () => {
    // Target: APPLE (P's are at positions 1 and 2)
    // Guess 1: PXXXX - Yellow P at position 0
    // Guess 2: XPXXX - Green P at position 1 only (one P found, one still missing)
    //
    // Yellow P at position 0 should REMAIN because we haven't found all P's yet

    const attempts = [
      {
        word: 'PXXXX',
        feedback: [
          { letter: 'P', position: 0, feedback: 'yellow' as const },
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 2000,
      },
      {
        word: 'XPXXX',
        feedback: [
          { letter: 'X', position: 0, feedback: 'gray' as const },
          { letter: 'P', position: 1, feedback: 'green' as const }, // Only one P found
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 1000,
      },
    ];

    // Only one P in accumulatedClues
    const accumulatedClues = new Map<number, AccumulatedClue>([
      [1, { letter: 'P', type: 'green' }],
    ]);

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        accumulatedClues={accumulatedClues}
        knownLetters={new Set<string>(['P'])} // P still in knownLetters (one more to find)
        showFeedbackOverlay={false}
      />
    );

    // Position 0 SHOULD still show yellow P (because there's still one P to find)
    // Position 1 should show green P
    // Note: P also appears in the knownLetters section (small badge), so we check the clue boxes specifically
    const clueBoxes = screen.getAllByText('P').filter(el => {
      const box = el.closest('div');
      // Filter to only clue boxes (larger, have w-10 or w-11 class)
      return box?.classList.contains('w-10') || box?.classList.contains('w-11');
    });
    expect(clueBoxes).toHaveLength(2); // Yellow P at 0, green P at 1

    // Find the yellow P (should be at position 0)
    const yellowP = clueBoxes.find(el => el.closest('div')?.classList.contains('bg-neo-yellow'));
    expect(yellowP).toBeDefined();

    // Find the green P (should be at position 1)
    const greenP = clueBoxes.find(el => el.closest('div')?.classList.contains('bg-neo-lime'));
    expect(greenP).toBeDefined();
  });

  it('should remove yellow letter when single occurrence is found as green', () => {
    // Target: APPLE (A is at position 0 only - single occurrence)
    // Guess 1: XAXXX - Yellow A at position 1 (A is in word but not at position 1)
    // Guess 2: AXXXX - Green A at position 0 (correct position)
    //
    // Yellow A at position 1 should be REMOVED

    const attempts = [
      {
        word: 'XAXXX',
        feedback: [
          { letter: 'X', position: 0, feedback: 'gray' as const },
          { letter: 'A', position: 1, feedback: 'yellow' as const }, // A in wrong spot
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 2000,
      },
      {
        word: 'AXXXX',
        feedback: [
          { letter: 'A', position: 0, feedback: 'green' as const }, // A found at correct position
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 1000,
      },
    ];

    const accumulatedClues = new Map<number, AccumulatedClue>([
      [0, { letter: 'A', type: 'green' }],
    ]);

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        accumulatedClues={accumulatedClues}
        knownLetters={new Set<string>()} // A removed since found
        showFeedbackOverlay={false}
      />
    );

    // Only ONE A should be displayed (the green one at position 0)
    const aElements = screen.getAllByText('A');
    expect(aElements).toHaveLength(1);

    // The A should be green
    const aBox = aElements[0].closest('div');
    expect(aBox).toHaveClass('bg-neo-lime');
    expect(aBox).not.toHaveClass('bg-neo-yellow');

    // Position 1 should show "?" (yellow A removed)
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks.length).toBeGreaterThanOrEqual(3); // Positions 1, 2, 3, 4 should be ?
  });
});
