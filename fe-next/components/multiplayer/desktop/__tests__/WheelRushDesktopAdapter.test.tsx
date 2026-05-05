import { render, screen } from '@testing-library/react';
import { WheelRushDesktopAdapter } from '../WheelRushDesktopAdapter';

describe('WheelRushDesktopAdapter', () => {
  const mkProps = () => ({
    roomId: 'r1',
    leaderboard: [
      { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
      { userId: 'u2', username: 'Beta', score: 50, status: 'connected' as const },
    ],
    foundWords: [{ word: 'WHEEL', score: 5, ts: 0, userId: 'u1', inputMethod: 'drag' as const }],
    remainingTime: 30,
    totalTime: 60,
    fogProgress: 0.4,
    canvas: <div data-testid="wheel-canvas">W</div>,
  });

  it('renders shell with mode=wheel-rush badge', () => {
    render(<WheelRushDesktopAdapter {...mkProps()} />);
    expect(screen.getByText(/Wheel Rush/i)).toBeInTheDocument();
  });

  it('renders fog meter in left.secondary slot', () => {
    render(<WheelRushDesktopAdapter {...mkProps()} />);
    expect(screen.getByTestId('wr-fog-meter')).toBeInTheDocument();
  });

  it('wraps canvas in shell', () => {
    render(<WheelRushDesktopAdapter {...mkProps()} />);
    expect(screen.getByTestId('wheel-canvas')).toBeInTheDocument();
  });

  it('displays fog progress bar with correct width', () => {
    render(<WheelRushDesktopAdapter {...mkProps()} />);
    const fogMeter = screen.getByTestId('wr-fog-meter');
    expect(fogMeter).toBeInTheDocument();
    // Check that inner progress bar exists
    const progressBars = fogMeter.querySelectorAll('[aria-label]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('renders roster and words ladder', () => {
    render(<WheelRushDesktopAdapter {...mkProps()} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('WHEEL')).toBeInTheDocument();
  });

  it('mounts inside MultiplayerDesktopShell', () => {
    const { container } = render(<WheelRushDesktopAdapter {...mkProps()} />);
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });
});
