/**
 * Design-system color contract for SurvivalClueBoxes.
 * Green/yellow feedback cells must use neo-lime/neo-yellow, not generic Tailwind.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { AccumulatedClue } from '../types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, ...domProps } = props as Record<string, unknown>;
      return <div {...(domProps as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const BASE_PROPS = {
  currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
  targetWord: 'APPLE',
  attempts: [] as ReturnType<typeof Array<{ word: string; feedback: LetterFeedback[]; timestamp: number }>>,
  accumulatedClues: new Map<number, AccumulatedClue>(),
  revealedLetters: new Set<number>(),
  knownLetters: new Set<string>(),
  latestAttemptFeedback: null as LetterFeedback[] | null,
  showFeedbackOverlay: false,
  isClueGaining: false,
  skipAnimations: true,
  gameDir: 'ltr' as const,
  t: (k: string) => k,
};

describe('SurvivalClueBoxes — design system color contract', () => {
  it('FeedbackOverlay green letter uses bg-neo-lime', () => {
    const feedback: LetterFeedback[] = [
      { letter: 'A', position: 0, feedback: 'green' },
      { letter: 'P', position: 1, feedback: 'gray' },
      { letter: 'P', position: 2, feedback: 'gray' },
      { letter: 'L', position: 3, feedback: 'gray' },
      { letter: 'E', position: 4, feedback: 'gray' },
    ];
    render(<SurvivalClueBoxes
      {...BASE_PROPS}
      latestAttemptFeedback={feedback}
      showFeedbackOverlay
      attempts={[{ word: 'APPLE', feedback, timestamp: 0 }]}
    />);
    const greenBox = screen.getByText('A').closest('[class]') as HTMLElement;
    expect(greenBox?.className).toContain('bg-neo-lime');
    expect(greenBox?.className).not.toContain('bg-green-');
  });

  it('FeedbackOverlay yellow letter uses bg-neo-yellow', () => {
    const feedback: LetterFeedback[] = [
      { letter: 'X', position: 0, feedback: 'gray' },
      { letter: 'A', position: 1, feedback: 'yellow' },
      { letter: 'X', position: 2, feedback: 'gray' },
      { letter: 'X', position: 3, feedback: 'gray' },
      { letter: 'X', position: 4, feedback: 'gray' },
    ];
    render(<SurvivalClueBoxes
      {...BASE_PROPS}
      latestAttemptFeedback={feedback}
      showFeedbackOverlay
      attempts={[{ word: 'XAXXX', feedback, timestamp: 0 }]}
    />);
    const yellowBox = screen.getByText('A').closest('[class]') as HTMLElement;
    expect(yellowBox?.className).toContain('bg-neo-yellow');
    expect(yellowBox?.className).not.toContain('bg-yellow-');
  });

  it('HintBoxes accumulated green clue uses bg-neo-lime', () => {
    const clues = new Map<number, AccumulatedClue>([[0, { letter: 'A', type: 'green' }]]);
    render(<SurvivalClueBoxes
      {...BASE_PROPS}
      accumulatedClues={clues}
    />);
    const greenBox = screen.getByText('A').closest('[class]') as HTMLElement;
    expect(greenBox?.className).toContain('bg-neo-lime');
    expect(greenBox?.className).not.toContain('bg-green-');
  });

  it('HintBoxes accumulated yellow clue uses bg-neo-yellow', () => {
    const clues = new Map<number, AccumulatedClue>([[1, { letter: 'P', type: 'yellow' }]]);
    render(<SurvivalClueBoxes
      {...BASE_PROPS}
      accumulatedClues={clues}
    />);
    const yellowBox = screen.getByText('P').closest('[class]') as HTMLElement;
    expect(yellowBox?.className).toContain('bg-neo-yellow');
    expect(yellowBox?.className).not.toContain('bg-yellow-');
  });
});
