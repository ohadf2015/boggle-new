/**
 * BlastHUD — top-bar showing score, moves, wave, tile-clear progress, and the
 * 90% wave goal. Layout must be reflow-stable: chips that show/hide reserve
 * space, columns have fixed widths, no shift when buff/combo state changes.
 *
 * Pins (2026-04-29 polish pass):
 *  - 90% goal marker visible on progress bar
 *  - Progress label shows current/target ratio so the goal is unmissable
 *  - Buff chip slot is reserved even when no buff is active (no width shift)
 *  - Combo badge slot is reserved (fixed width) regardless of streak presence
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../BlastComboStreakBadge', () => ({
  BlastComboStreakBadge: () => <div data-testid="combo-streak-badge" />,
}));

import { BlastHUD } from '../BlastHUD';

const t = (key: string) => key;

const baseProps = {
  score: 0,
  wordsFoundCount: 0,
  movesRemaining: 10,
  totalMoves: 12,
  waveNumber: 1,
  tilesCleared: 0,
  totalTiles: 64,
  onQuit: vi.fn(),
  t,
};

describe('BlastHUD — 90% wave goal clarity', () => {
  it('renders the 90% target marker on the progress bar', () => {
    render(<BlastHUD {...baseProps} tilesCleared={32} />);
    expect(screen.getByTestId('blast-progress-target-marker')).toBeDefined();
  });

  it('shows progress as "current / target%" so the goal is explicit', () => {
    render(<BlastHUD {...baseProps} tilesCleared={45} totalTiles={100} />);
    const label = screen.getByTestId('blast-progress-label');
    expect(label.textContent).toContain('45');
    expect(label.textContent).toContain('90');
  });

  it('flips to lime gradient only after the 90% goal is met', () => {
    const { rerender } = render(<BlastHUD {...baseProps} tilesCleared={89} totalTiles={100} />);
    expect(screen.getByTestId('blast-progress-fill').getAttribute('data-goal-met')).toBe('false');

    rerender(<BlastHUD {...baseProps} tilesCleared={90} totalTiles={100} />);
    expect(screen.getByTestId('blast-progress-fill').getAttribute('data-goal-met')).toBe('true');
  });
});

describe('BlastHUD — layout stability (no shift)', () => {
  it('reserves the buff chip slot even when no buff is active', () => {
    render(<BlastHUD {...baseProps} activeBuff={null} />);
    expect(screen.getByTestId('blast-buff-slot')).toBeDefined();
  });

  it('keeps the buff slot in the same place when a buff appears', () => {
    const { rerender } = render(<BlastHUD {...baseProps} activeBuff={null} />);
    const slotEmpty = screen.getByTestId('blast-buff-slot');
    const wEmpty = slotEmpty.className;

    rerender(<BlastHUD {...baseProps} activeBuff="bomb" />);
    const slotFilled = screen.getByTestId('blast-buff-slot');
    expect(slotFilled.className).toBe(wEmpty);
  });

  it('reserves the combo badge slot even when no streak is provided', () => {
    render(<BlastHUD {...baseProps} comboStreak={undefined} comboStreakArcRef={undefined} />);
    expect(screen.getByTestId('blast-combo-slot')).toBeDefined();
  });
});

describe('BlastHUD — score/moves/wave smoke', () => {
  it('renders the wave badge', () => {
    render(<BlastHUD {...baseProps} waveNumber={3} />);
    expect(screen.getByLabelText(/blast\.wave 3/)).toBeDefined();
  });

  it('renders moves remaining', () => {
    render(<BlastHUD {...baseProps} movesRemaining={4} />);
    expect(screen.getByText('4')).toBeDefined();
  });
});

describe('BlastHUD — Lucky Boost (DDA visibility)', () => {
  it('hides the Lucky Boost chip when ddaBoostActive=false', () => {
    render(<BlastHUD {...baseProps} ddaBoostActive={false} />);
    expect(screen.queryByTestId('blast-lucky-boost-chip')).toBeNull();
  });

  it('shows the Lucky Boost chip when ddaBoostActive=true', () => {
    render(<BlastHUD {...baseProps} ddaBoostActive={true} />);
    expect(screen.getByTestId('blast-lucky-boost-chip')).toBeDefined();
  });

  it('hides by default when prop omitted (backward compat)', () => {
    render(<BlastHUD {...baseProps} />);
    expect(screen.queryByTestId('blast-lucky-boost-chip')).toBeNull();
  });
});
