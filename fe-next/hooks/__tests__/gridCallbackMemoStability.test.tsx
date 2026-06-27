import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { memo, useCallback, useState } from 'react';

/**
 * Responsiveness regression guard (end-to-end).
 *
 * InGameScreen re-renders ~1/s during play because remainingTime/timerValue are
 * props (the timer ticks). The game grid (GridComponent) is memo'd, so it should
 * NOT re-render on those ticks — UNLESS a callback prop it receives changes
 * reference. handleWordChange/handleSingleTap derive from useMPStuckCoach /
 * useTapToDragGuidance; when those hooks returned a fresh object literal each
 * render, the derived callbacks churned and broke the grid's memo, re-rendering
 * all 16 tiles every second (the stutter this fix removes).
 *
 * This test reproduces that exact chain with minimal stand-ins and asserts the
 * memo'd "grid" does NOT re-render when only the timer changes. It FAILS if the
 * hooks stop returning a stable reference (i.e. if the useMemo fix regresses).
 */

// Mock storage so the real hooks run in jsdom.
vi.mock('../../utils/posthogEngagement', () => ({
  trackMpStuckCoachShown: vi.fn(),
  trackMpStuckCoachOutcome: vi.fn(),
}));
vi.mock('../../utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => true,
  markGuidanceShown: vi.fn(),
}));

import { useMPStuckCoach } from '../useMPStuckCoach';
import { useTapToDragGuidance } from '../useTapToDragGuidance';

let gridRenders = 0;
const FakeGrid = memo(function FakeGrid(_props: {
  onWordChange: (w: string, n: number) => void;
  onSingleTapDetected: (c: { row: number; col: number; letter: string }) => void;
}) {
  gridRenders++;
  return null;
});

function Harness({ tick }: { tick: number }) {
  // Same shape as InGameScreen: hooks feed useCallback deps that feed the grid.
  const stuckCoach = useMPStuckCoach({
    active: true,
    isClassic: true,
    totalGamesPlayed: 0,
    isDesktop: false,
  });
  const tapDragGuidance = useTapToDragGuidance();

  const onWordChange = useCallback(
    (_w: string, _n: number) => stuckCoach.markDragStart(),
    [stuckCoach]
  );
  const onSingleTapDetected = useCallback(
    (cell: { row: number; col: number; letter: string }) => {
      stuckCoach.markTap();
      tapDragGuidance.handleSingleTapDetected(cell);
    },
    [stuckCoach, tapDragGuidance]
  );

  // tick stands in for the per-second timer prop that forces parent re-renders.
  return (
    <div data-tick={tick}>
      <FakeGrid onWordChange={onWordChange} onSingleTapDetected={onSingleTapDetected} />
    </div>
  );
}

describe('grid callback memo stability (timer-tick responsiveness)', () => {
  it('memo\'d grid does NOT re-render when only the timer ticks', () => {
    gridRenders = 0;
    const { rerender } = render(<Harness tick={0} />);
    expect(gridRenders).toBe(1); // initial mount

    // Simulate 5 timer ticks (parent re-renders, coach/tutorial state unchanged).
    for (let t = 1; t <= 5; t++) rerender(<Harness tick={t} />);

    // With stable hook returns, the grid's callback props keep their refs, so the
    // memo holds — zero extra renders despite 5 parent re-renders.
    expect(gridRenders).toBe(1);
  });
});
