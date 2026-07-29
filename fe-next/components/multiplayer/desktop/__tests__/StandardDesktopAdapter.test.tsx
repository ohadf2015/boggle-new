import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { StandardDesktopAdapter } from '../StandardDesktopAdapter';

// Count how many times CircularTimer's React component re-renders.
// We don't actually exercise the SVG circle — just confirm that the
// 1-Hz `remainingTime` change isn't churning the rest of the shell.
const ladderRenderCount = vi.fn();
const rosterRenderCount = vi.fn();

vi.mock('../WordsLadder', () => ({
  WordsLadder: (props: { words: unknown[] }) => {
    ladderRenderCount();
    return <div data-testid="words-ladder-mock" data-count={(props.words as unknown[]).length} />;
  },
}));

vi.mock('../RosterRail', () => ({
  RosterRail: (props: { players: unknown[] }) => {
    rosterRenderCount();
    return <div data-testid="roster-rail-mock" data-count={(props.players as unknown[]).length} />;
  },
}));

describe('StandardDesktopAdapter', () => {
  const mkProps = () => ({
    roomId: 'r1',
    leaderboard: [
      { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
      { userId: 'u2', username: 'Beta', score: 50, status: 'connected' as const },
    ],
    foundWords: [{ word: 'CAT', score: 3, ts: 0, userId: 'u1' }],
    remainingTime: 90,
    totalTime: 180,
    canvas: <div data-testid="canvas">C</div>,
  });

  it('renders shell with all required slots', () => {
    render(<StandardDesktopAdapter {...mkProps()} />);
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('roster-rail-mock')).toBeInTheDocument();
    expect(screen.getByTestId('words-ladder-mock')).toBeInTheDocument();
  });

  it('mounts inside MultiplayerDesktopShell', () => {
    const { container } = render(<StandardDesktopAdapter {...mkProps()} />);
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });

  it('does NOT re-render roster/ladder when only remainingTime ticks', () => {
    ladderRenderCount.mockClear();
    rosterRenderCount.mockClear();
    const base = mkProps();
    const { rerender } = render(<StandardDesktopAdapter {...base} />);
    const ladderInitial = ladderRenderCount.mock.calls.length;
    const rosterInitial = rosterRenderCount.mock.calls.length;

    // Simulate three 1Hz timer ticks — remainingTime decrements, nothing else changes
    rerender(<StandardDesktopAdapter {...base} remainingTime={89} />);
    rerender(<StandardDesktopAdapter {...base} remainingTime={88} />);
    rerender(<StandardDesktopAdapter {...base} remainingTime={87} />);

    expect(ladderRenderCount.mock.calls.length).toBe(ladderInitial);
    expect(rosterRenderCount.mock.calls.length).toBe(rosterInitial);
  });
});
