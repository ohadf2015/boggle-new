/**
 * Layout-stability guard for the "matches target length" warning.
 *
 * BUG: submitting a target-length word in Word Hunt MP shifted the layout —
 * the warning row mounts/unmounts with no reserved height, so when it appears
 * (word reaches target length) and disappears (on submit) the clue box height
 * changes and the grid below jumps.
 *
 * FIX: the warning lives inside a permanently-rendered slot with a min-height
 * floor (mirroring the legend row in the same component). The slot is always
 * present so toggling the warning text never reflows siblings.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { AccumulatedClue } from '../types';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('SurvivalClueBoxes - warning reserved space (no layout shift)', () => {
  const baseProps = {
    currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
    targetWord: '?????',
    attempts: [],
    accumulatedClues: new Map<number, AccumulatedClue>(),
    revealedLetters: new Set<number>(),
    knownLetters: new Set<string>(),
    latestAttemptFeedback: null,
    showFeedbackOverlay: false,
    isClueGaining: false,
    skipAnimations: true,
    gameDir: 'ltr' as const,
    t: (key: string) => key,
  };

  it('always renders the reserved warning slot regardless of matchesTargetLength', () => {
    const { rerender } = render(
      <SurvivalClueBoxes {...baseProps} matchesTargetLength={false} />
    );
    // Slot present even when no warning is shown — reserves the height.
    expect(screen.getByTestId('match-target-warning-slot')).toBeInTheDocument();
    // No warning content yet.
    expect(screen.queryByTestId('match-target-warning')).not.toBeInTheDocument();

    rerender(<SurvivalClueBoxes {...baseProps} matchesTargetLength={true} />);
    // Same slot still present; now it holds the warning.
    expect(screen.getByTestId('match-target-warning-slot')).toBeInTheDocument();
    expect(screen.getByTestId('match-target-warning')).toBeInTheDocument();
  });

  it('reserved slot carries a min-height floor so it occupies space when empty', () => {
    render(<SurvivalClueBoxes {...baseProps} matchesTargetLength={false} />);
    const slot = screen.getByTestId('match-target-warning-slot');
    // The reserved floor (min-h-*) is what prevents the collapse-on-submit shift.
    expect(slot.className).toMatch(/min-h-/);
  });
});
