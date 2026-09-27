/**
 * Single-row guard for the Word Hunt clue tiles.
 *
 * BUG: the clue tile rows used `flex-wrap`, so a 7-letter target (the max daily
 * target length) overflowed the panel width on narrow phones and wrapped its
 * last tile onto a second row. That doubled the clue-box height and shifted the
 * whole layout below it — visibly "jumpy" and ugly (see daily Word Hunt report).
 *
 * FIX: the tile rows never wrap (`flex-nowrap`). Tile size + gap are tuned so a
 * full 7-tile row fits one line even on the narrowest phones.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { AccumulatedClue } from '../types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const baseProps = {
  currentHint: { level: 0, hint: '_ _ _ _ _ _ _', revealed: 0, unlockCost: 0 },
  targetWord: '???????',
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

describe('SurvivalClueBoxes - clue tiles stay on one row (no wrap)', () => {
  it('hint-box row never wraps for a 7-letter target', () => {
    render(<SurvivalClueBoxes {...baseProps} />);
    const row = screen.getAllByText('?')[0].parentElement as HTMLElement;
    expect(row.className).toContain('flex-nowrap');
    expect(row.className).not.toContain('flex-wrap');
  });

  it('feedback-overlay row never wraps for a 7-letter target', () => {
    const feedback: LetterFeedback[] = [
      { letter: 'A', feedback: 'green', position: 0 },
      { letter: 'B', feedback: 'gray', position: 1 },
      { letter: 'C', feedback: 'yellow', position: 2 },
      { letter: 'D', feedback: 'gray', position: 3 },
      { letter: 'E', feedback: 'gray', position: 4 },
      { letter: 'F', feedback: 'gray', position: 5 },
      { letter: 'G', feedback: 'green', position: 6 },
    ];
    render(
      <SurvivalClueBoxes
        {...baseProps}
        latestAttemptFeedback={feedback}
        showFeedbackOverlay
      />
    );
    const tile = screen.getByText('A');
    const row = tile.parentElement as HTMLElement;
    expect(row.className).toContain('flex-nowrap');
    expect(row.className).not.toContain('flex-wrap');
  });
});
