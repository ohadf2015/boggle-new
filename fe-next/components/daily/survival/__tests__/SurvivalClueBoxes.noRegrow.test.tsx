import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue } from '../types';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, initial, animate: _a, exit: _e, transition: _t, whileHover: _h, whileTap: _w, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-initial={JSON.stringify(initial ?? null)} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const base = {
  currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
  targetWord: 'APPLE',
  attempts: [] as { word: string; feedback: LetterFeedback[]; timestamp: number }[],
  revealedLetters: new Set<number>(),
  knownLetters: new Set<string>(),
  isClueGaining: false,
  skipAnimations: false,
  gameDir: 'ltr' as const,
  t: (key: string) => key,
};
const feedback: LetterFeedback[] = 'AXXXX'.split('').map((letter, position) => ({ letter, position, feedback: position === 0 ? 'green' : 'gray' }));

describe('SurvivalClueBoxes after a guess', () => {
  it('Given the clue row returns from the feedback flash, Then only the newly revealed box pops and the rest stay put', () => {
    const { rerender } = render(
      <SurvivalClueBoxes {...base} accumulatedClues={new Map()} latestAttemptFeedback={null} showFeedbackOverlay={false} />,
    );
    rerender(<SurvivalClueBoxes {...base} accumulatedClues={new Map()} latestAttemptFeedback={feedback} showFeedbackOverlay />);
    const clues = new Map<number, AccumulatedClue>([[0, { letter: 'A', type: 'green' } as AccumulatedClue]]);
    rerender(<SurvivalClueBoxes {...base} accumulatedClues={clues} latestAttemptFeedback={feedback} showFeedbackOverlay={false} />);

    expect(screen.getByTestId('clue-box-0').getAttribute('data-initial')).not.toBe('false');
    expect(screen.getByTestId('clue-box-0').parentElement!.getAttribute('data-initial')).toBe('false');
    for (const i of [1, 2, 3, 4]) {
      expect(screen.getByTestId(`clue-box-${i}`).getAttribute('data-initial')).toBe('false');
    }
  });
});
