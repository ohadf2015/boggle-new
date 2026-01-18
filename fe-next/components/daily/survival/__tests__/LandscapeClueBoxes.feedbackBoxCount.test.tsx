/**
 * Test for landscape clue boxes feedback box count
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
import { SurvivalLandscapeLayout } from '../SurvivalLandscapeLayout';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';

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

// Mock dialog component
jest.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: () => null,
}));

// Mock GridComponent
jest.mock('@/components/GridComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-grid" />,
}));

// Mock WordFeedbackToast
jest.mock('../../WordFeedbackToast', () => ({
  WordFeedbackToast: () => null,
}));

// Mock SwipeTipTooltip
jest.mock('@/components/game/SwipeTipTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

describe('LandscapeClueBoxes - Feedback Box Count', () => {
  const createProps = (targetWord: string, feedback: LetterFeedback[] | null, showOverlay: boolean) => ({
    grid: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']] as [string[], string[], string[]],
    isGameOver: false,
    isProtected: false,
    eliminatedLetters: new Set<string>(),
    onWordSubmit: jest.fn(),
    onWordChange: jest.fn(),
    highlightedPath: [],
    lifePoints: 100,
    isLifeGaining: false,
    attempts: feedback ? [{
      word: feedback.map(f => f.letter).join(''),
      feedback,
      timestamp: Date.now(),
    }] : [],
    liveScore: 0,
    lastScoreIncrement: null,
    isScoreAnimating: false,
    currentHint: {
      level: 0,
      hint: targetWord.split('').map(() => '_').join(' '),
      revealed: 0,
      unlockCost: 0,
    },
    targetWord,
    accumulatedClues: new Map(),
    revealedLetters: new Set<number>(),
    gameDir: 'ltr' as const,
    latestAttemptFeedback: feedback,
    showFeedbackOverlay: showOverlay,
    knownLetters: new Set<string>(),
    skipAnimations: true,
    showQuitConfirm: false,
    onQuitClick: jest.fn(),
    onQuitConfirm: jest.fn(),
    onQuitCancel: jest.fn(),
    feedbackType: null,
    feedbackMessage: '',
    onCloseToast: jest.fn(),
    showSwipeTip: false,
    onDismissSwipeTip: jest.fn(),
    activeNotifications: [],
    onDismissNotification: jest.fn(),
    t: (key: string) => key,
  });

  it('should show same number of boxes as target word length when submitted word is shorter', () => {
    // Target word is 5 letters (WORLD), submitted word is 3 letters (CAT)
    const targetWord = 'WORLD';
    const feedback: LetterFeedback[] = [
      { letter: 'C', position: 0, feedback: 'gray' },
      { letter: 'A', position: 1, feedback: 'gray' },
      { letter: 'T', position: 2, feedback: 'gray' },
    ];

    render(<SurvivalLandscapeLayout {...createProps(targetWord, feedback, true)} />);

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

    render(<SurvivalLandscapeLayout {...createProps(targetWord, feedback, true)} />);

    // Should show 4 boxes (target word length), not 6 (submitted word length)
    const allBoxes = screen.getAllByText(/^[A-Z]$/);
    expect(allBoxes).toHaveLength(4);

    // Should only show first 4 letters of submitted word
    expect(allBoxes[0]).toHaveTextContent('C');
    expect(allBoxes[1]).toHaveTextContent('A');
    expect(allBoxes[2]).toHaveTextContent('S');
    expect(allBoxes[3]).toHaveTextContent('T');
  });
});
