/**
 * Short-landscape compaction for the Word Hunt MP clue boxes.
 *
 * BUG: at wide-but-short viewports (e.g. 1530×695) the vertical compaction
 * only kicked in at `max-height:560px`, so the full-size clue boxes ate the
 * column height and squished the grid — the board felt cluttered and selected
 * tiles (which scale up) overlapped their neighbours.
 *
 * FIX: WordHuntGameLayout detects the wide-short band and passes `compact`,
 * which forces the small tile + tight-spacing treatment regardless of the
 * `max-height:560px` media query. SP daily survival never passes `compact`,
 * so its behaviour is unchanged.
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

describe('SurvivalClueBoxes - compact (short landscape)', () => {
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

  it('renders small clue tiles (no large w-10/w-11 sizing) when compact', () => {
    render(<SurvivalClueBoxes {...baseProps} compact />);
    const tiles = screen.getAllByText('?');
    expect(tiles.length).toBeGreaterThan(0);
    for (const tile of tiles) {
      expect(tile.className).not.toContain('w-10');
      expect(tile.className).not.toContain('w-11');
    }
  });

  it('keeps the large clue tiles when not compact (SP default)', () => {
    render(<SurvivalClueBoxes {...baseProps} />);
    const tiles = screen.getAllByText('?');
    // 5-letter word → w-10 base size in the default (non-compact) branch.
    expect(tiles.some((el) => el.className.includes('w-10'))).toBe(true);
  });

  it('collapses the reserved warning slot when compact', () => {
    render(<SurvivalClueBoxes {...baseProps} compact />);
    const slot = screen.getByTestId('match-target-warning-slot');
    expect(slot.className).toContain('hidden');
  });
});
