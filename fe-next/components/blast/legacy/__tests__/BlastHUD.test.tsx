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
import { render, screen, fireEvent } from '@testing-library/react';

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

describe('BlastHUD — wave goal clarity (no confusing percentage)', () => {
  // The "X% / 90%" label + 90% target marker confused players ("what is 90%?").
  // We removed the percentage chrome: the goal is now signalled purely by the
  // bar flipping lime + a ✓ when ≥90% cleared. The concrete X/Y cleared count
  // stays. The underlying goalMet (≥90%) logic is unchanged.
  it('does NOT render a 90% target marker', () => {
    render(<BlastHUD {...baseProps} tilesCleared={32} />);
    expect(screen.queryByTestId('blast-progress-target-marker')).toBeNull();
  });

  it('never shows the raw "/ 90%" percentage text', () => {
    render(<BlastHUD {...baseProps} tilesCleared={45} totalTiles={100} />);
    const label = screen.getByTestId('blast-progress-label');
    expect(label.textContent).not.toContain('90');
    expect(label.textContent).not.toContain('45%');
  });

  it('shows no ready mark below the goal, and a ✓ once the goal is met', () => {
    const { rerender } = render(<BlastHUD {...baseProps} tilesCleared={89} totalTiles={100} />);
    expect(screen.getByTestId('blast-progress-label').textContent).not.toContain('✓');
    rerender(<BlastHUD {...baseProps} tilesCleared={90} totalTiles={100} />);
    expect(screen.getByTestId('blast-progress-label').textContent).toContain('✓');
  });

  it('still shows the concrete X/Y cleared count', () => {
    render(<BlastHUD {...baseProps} tilesCleared={12} totalTiles={36} />);
    expect(screen.getByText(/12\/36/)).toBeDefined();
  });

  it('pops a "+N" indicator when more tiles get cleared (satisfying progress)', () => {
    const { rerender } = render(<BlastHUD {...baseProps} tilesCleared={5} totalTiles={36} />);
    expect(screen.queryByTestId('blast-clear-delta')).toBeNull();
    rerender(<BlastHUD {...baseProps} tilesCleared={9} totalTiles={36} />);
    const delta = screen.getByTestId('blast-clear-delta');
    expect(delta.textContent).toContain('4');
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

describe('BlastHUD — multiplayer timer (consolidated into HUD)', () => {
  // The MP countdown used to float in a separate band below the HUD, crowding
  // the board. It now lives inline in the HUD top row (the slot that's empty in
  // MP since the wave chip is hidden), so the board gets its full height back.
  const mpProps = { ...baseProps, isMultiplayer: true, totalMoves: Infinity };

  it('renders the inline timer in MP showing MM:SS', () => {
    render(<BlastHUD {...mpProps} remainingTime={55} totalTime={90} />);
    const timer = screen.getByTestId('blast-mp-timer');
    expect(timer.textContent).toContain('0:55');
  });

  it('does not render the inline timer in single-player (no timer props)', () => {
    render(<BlastHUD {...baseProps} />);
    expect(screen.queryByTestId('blast-mp-timer')).toBeNull();
  });

  it('flags danger urgency when time is low', () => {
    render(<BlastHUD {...mpProps} remainingTime={4} totalTime={90} />);
    expect(screen.getByTestId('blast-mp-timer').getAttribute('data-urgency')).toBe('critical');
  });

  it('stays calm (normal urgency) with plenty of time left', () => {
    render(<BlastHUD {...mpProps} remainingTime={55} totalTime={90} />);
    expect(screen.getByTestId('blast-mp-timer').getAttribute('data-urgency')).toBe('normal');
  });

  it('hides the inline MP timer inside the desktop shell (the shell badge owns the only timer)', () => {
    // On desktop the BlastGame canvas is embedded in the 3-column shell, whose
    // left-rail badge already renders the (server-synced) countdown. Rendering
    // the HUD timer too produced two timers that drifted apart — suppress it.
    render(<BlastHUD {...mpProps} remainingTime={55} totalTime={90} isDesktopCanvas />);
    expect(screen.queryByTestId('blast-mp-timer')).toBeNull();
  });
});

describe('BlastHUD — labelled stat columns (clarity)', () => {
  it('labels the score column so the star number reads as SCORE', () => {
    render(<BlastHUD {...baseProps} score={1234} />);
    expect(screen.getByTestId('blast-score-label')).toBeDefined();
  });
});

describe('BlastHUD — exit uses the shared canonical exit button', () => {
  // Blast used to render a bare lucide <X> (reads as "dismiss"). It now reuses
  // the shared ExitRoomButton (DoorOpen) like every other game shell. Contract
  // that must survive the swap: labelled common.quit, fires onQuit, keeps testid.
  it('renders an exit affordance labelled common.quit', () => {
    render(<BlastHUD {...baseProps} />);
    expect(screen.getByLabelText('common.quit')).toBeInTheDocument();
  });

  it('fires onQuit when the exit button is clicked', () => {
    const onQuit = vi.fn();
    render(<BlastHUD {...baseProps} onQuit={onQuit} />);
    fireEvent.click(screen.getByLabelText('common.quit'));
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  it('preserves the blast-quit-btn test id', () => {
    render(<BlastHUD {...baseProps} />);
    expect(screen.getByTestId('blast-quit-btn')).toBeInTheDocument();
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

// Neo-brutalist polish: full-contrast text + full-opacity borders, no soft
// glows. Mirrors the Claude Design HUD mockup (.superdesign/claude-design/blast).
describe('BlastHUD — neo-brutalist contrast polish', () => {
  it('score label is full-contrast white (no opacity fade)', () => {
    render(<BlastHUD {...baseProps} score={1234} />);
    const label = screen.getByTestId('blast-score-label');
    expect(label.className).toContain('text-white');
    expect(label.className).not.toContain('text-white/70');
  });

  it('wave chip border is full-opacity cyan (not faded /40)', () => {
    render(<BlastHUD {...baseProps} waveNumber={3} />);
    const chip = screen.getByLabelText('blast.wave 3');
    expect(chip.className).toContain('border-neo-cyan');
    expect(chip.className).not.toContain('border-neo-cyan/40');
  });
});
