/**
 * Live warning when formed word length matches target length.
 *
 * UX: players don't realize submitting a same-length word consumes a try.
 * When matchesTargetLength=true, SurvivalClueBoxes must render a visible
 * label keyed to `wordHunt.survival.matchesTargetWarning` and apply the
 * warning ring class so the connection action→try is obvious pre-submit.
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

describe('SurvivalClueBoxes - matchesTargetLength warning', () => {
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

  it('renders warning label when matchesTargetLength is true', () => {
    render(<SurvivalClueBoxes {...baseProps} matchesTargetLength={true} />);
    expect(screen.getByTestId('match-target-warning')).toBeInTheDocument();
    expect(screen.getByTestId('match-target-warning')).toHaveTextContent(
      'wordHunt.survival.matchesTargetWarning'
    );
  });

  it('does not render warning when matchesTargetLength is false', () => {
    render(<SurvivalClueBoxes {...baseProps} matchesTargetLength={false} />);
    expect(screen.queryByTestId('match-target-warning')).not.toBeInTheDocument();
  });

  it('does not render warning when feedback overlay is active', () => {
    render(
      <SurvivalClueBoxes
        {...baseProps}
        showFeedbackOverlay={true}
        latestAttemptFeedback={[{ letter: 'A', position: 0, feedback: 'gray' }]}
        matchesTargetLength={true}
      />
    );
    expect(screen.queryByTestId('match-target-warning')).not.toBeInTheDocument();
  });
});
