/**
 * Design-system color contract for SurvivalClueBoxes.
 * Green stays emerald (lime means "good word" on the Hunt board), every coloured
 * fill takes black ink, and an empty cell is a dashed slot.
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
  it('FeedbackOverlay green letter uses bg-emerald-400', () => {
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
    expect(greenBox?.className).toContain('bg-emerald-400');
    expect(greenBox?.className).not.toContain('bg-green-');
  });

  it('FeedbackOverlay yellow letter uses bg-amber-400', () => {
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
    expect(yellowBox?.className).toContain('bg-amber-400');
    expect(yellowBox?.className).not.toContain('bg-yellow-');
  });

  it('HintBoxes accumulated green clue uses bg-emerald-400', () => {
    const clues = new Map<number, AccumulatedClue>([[0, { letter: 'A', type: 'green' }]]);
    render(<SurvivalClueBoxes
      {...BASE_PROPS}
      accumulatedClues={clues}
    />);
    const greenBox = screen.getByText('A').closest('[class]') as HTMLElement;
    expect(greenBox?.className).toContain('bg-emerald-400');
    expect(greenBox?.className).not.toContain('bg-green-');
  });

  it('HintBoxes accumulated yellow clue uses bg-amber-400', () => {
    const clues = new Map<number, AccumulatedClue>([[1, { letter: 'P', type: 'yellow' }]]);
    render(<SurvivalClueBoxes
      {...BASE_PROPS}
      accumulatedClues={clues}
    />);
    const yellowBox = screen.getByText('P').closest('[class]') as HTMLElement;
    expect(yellowBox?.className).toContain('bg-amber-400');
    expect(yellowBox?.className).not.toContain('bg-yellow-');
  });

  it('green and yellow cells take black ink, never white', () => {
    const clues = new Map<number, AccumulatedClue>([
      [0, { letter: 'A', type: 'green' }],
      [1, { letter: 'P', type: 'yellow' }],
    ]);
    render(<SurvivalClueBoxes {...BASE_PROPS} accumulatedClues={clues} />);
    for (const idx of [0, 1]) {
      const box = screen.getByTestId(`clue-box-${idx}`);
      expect(box.className).toContain('text-neo-black');
      expect(box.className).not.toContain('text-neo-white');
    }
  });

  it('empty clue cell is a visible dashed slot', () => {
    render(<SurvivalClueBoxes {...BASE_PROPS} />);
    const box = screen.getByTestId('clue-box-0');
    expect(box.className).toContain('border-dashed');
    expect(box.className).not.toContain('border-neo-cream/25');
  });
});
