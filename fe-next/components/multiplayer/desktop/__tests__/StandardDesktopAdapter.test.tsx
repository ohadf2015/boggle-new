import { render, screen } from '@testing-library/react';
import { StandardDesktopAdapter } from '../StandardDesktopAdapter';

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
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    // 'CAT' appears in WordsLadder and as MyStatsCard's best word
    expect(screen.getAllByText('CAT').length).toBeGreaterThanOrEqual(1);
  });

  it('mounts inside MultiplayerDesktopShell', () => {
    const { container } = render(<StandardDesktopAdapter {...mkProps()} />);
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });
});
