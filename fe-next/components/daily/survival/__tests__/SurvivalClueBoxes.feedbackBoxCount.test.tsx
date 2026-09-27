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
import { render, screen, act } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import { GRAY_LETTER_FADE_DELAY } from '../constants';
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

    // Gray letters initially flash (visible before fade timer fires)
    expect(allBoxes[0]).toHaveTextContent('C'); // C is gray but visible initially
    expect(allBoxes[1]).toHaveTextContent('A'); // A is yellow (clue)
    expect(allBoxes[2]).toHaveTextContent('T'); // T is gray but visible initially

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
    const allBoxes = screen.getAllByText(/^[A-Z?]$/);
    expect(allBoxes).toHaveLength(4);

    // Green letters shown, gray letters initially flash before fading
    expect(allBoxes[0]).toHaveTextContent('C'); // green
    expect(allBoxes[1]).toHaveTextContent('A'); // green
    expect(allBoxes[2]).toHaveTextContent('S'); // gray (visible before fade)
    expect(allBoxes[3]).toHaveTextContent('T'); // gray (visible before fade)
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

    // Green letter shown with neo-lime styling
    const wBox = screen.getByText('W').closest('div');
    expect(wBox).toHaveClass('bg-neo-lime');

    // Gray letter initially flashes with navy styling (before fade timer)
    const aBox = screen.getByText('A').closest('div');
    expect(aBox).toHaveClass('bg-neo-navy-light');

    // Yellow letter shown with neo-yellow styling
    const rBox = screen.getByText('R').closest('div');
    expect(rBox).toHaveClass('bg-neo-yellow');
  });

  it('should fade gray letters to "?" after delay while keeping green/yellow visible', () => {
    vi.useFakeTimers();
    const targetWord = 'WORLD';
    const feedback: LetterFeedback[] = [
      { letter: 'W', position: 0, feedback: 'green' },
      { letter: 'A', position: 1, feedback: 'gray' },
      { letter: 'R', position: 2, feedback: 'yellow' },
      { letter: 'X', position: 3, feedback: 'gray' },
      { letter: 'Y', position: 4, feedback: 'gray' },
    ];

    render(<SurvivalClueBoxes {...createProps(targetWord, feedback, true)} />);

    // Initially gray letters are visible
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();

    // After fade delay, gray letters become '?'
    act(() => { vi.advanceTimersByTime(GRAY_LETTER_FADE_DELAY); });

    // Gray letters should now be '?'
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.queryByText('X')).not.toBeInTheDocument();

    // Green and yellow letters should persist
    expect(screen.getByText('W')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
