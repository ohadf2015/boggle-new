import { render, screen } from '@testing-library/react';
import { BlastHUD } from '../BlastHUD';

/**
 * One timer, one number.
 *
 * Inside the MP desktop shell the countdown is already rendered by the shell's
 * mode badge (ShellBadgeTimer). BlastHUD guards against drawing a second one via
 * `isDesktopCanvas`, but BlastStage was not forwarding the prop, so the HUD fell
 * back to `false` and rendered its own pill.
 *
 * That was not merely duplication: the two timers tick independently, so at
 * 1440x900 the ring read 44 while the pill read 0:43 in the same frame. A player
 * reading pressure off two disagreeing clocks is a correctness bug, not clutter.
 */
const baseProps = {
  score: 0,
  wordsFoundCount: 0,
  movesRemaining: 10,
  totalMoves: 10,
  waveNumber: 1,
  livesRemaining: 3,
  tilesCleared: 0,
  totalTiles: 36,
  onQuit: () => {},
  onShowHelp: () => {},
  isMultiplayer: true,
  remainingTime: 43,
  totalTime: 60,
  t: (k: string) => k,
} as never;

describe('BlastHUD countdown ownership', () => {
  it('renders its own countdown when it is the only timer (mobile / non-shell)', () => {
    render(<BlastHUD {...baseProps} isDesktopCanvas={false} />);
    expect(screen.getByText('0:43')).toBeInTheDocument();
  });

  it('yields the countdown to the shell badge inside the desktop canvas', () => {
    render(<BlastHUD {...baseProps} isDesktopCanvas />);
    expect(screen.queryByText('0:43')).toBeNull();
  });
});
