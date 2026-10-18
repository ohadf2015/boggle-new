import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { AccumulatedClue, TargetAttempt } from '../types';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const attempt: TargetAttempt = { word: 'HELLO', feedback: [], timestamp: 0, isDiscovery: false };

const base = {
  currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
  targetWord: 'WORLD',
  attempts: [attempt],
  accumulatedClues: new Map<number, AccumulatedClue>(),
  revealedLetters: new Set<number>(),
  knownLetters: new Set<string>(),
  latestAttemptFeedback: [{ letter: 'H', feedback: 'gray' }] as never,
  isClueGaining: false,
  skipAnimations: true,
  gameDir: 'ltr' as const,
  t: (key: string) => key,
};

describe('SurvivalClueBoxes legend stability', () => {
  // A legend that unmounts on release and mounts a sibling (AnimatePresence "sync" keeps the
  // exiting copy in flow) makes the panel jump ~50px and the board below shrink with it.
  it('keeps one legend node alive when the feedback overlay toggles', () => {
    const { rerender } = render(<SurvivalClueBoxes {...base} showFeedbackOverlay />);
    const before = screen.getByTestId('clue-legend');

    rerender(<SurvivalClueBoxes {...base} showFeedbackOverlay={false} />);

    expect(screen.getAllByTestId('clue-legend')).toHaveLength(1);
    expect(screen.getByTestId('clue-legend')).toBe(before);
  });

  it('reserves the legend row at its tallest so arriving clues never resize the board', () => {
    render(<SurvivalClueBoxes {...base} showFeedbackOverlay={false} />);
    expect(screen.getByTestId('clue-legend').parentElement?.className).toMatch(/cramped:min-h-\[\d+px\]/);
  });
});
