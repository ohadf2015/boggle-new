import { render, screen } from '@testing-library/react';
import { BlastDesktopAdapter } from '../BlastDesktopAdapter';

describe('BlastDesktopAdapter', () => {
  const mkProps = () => ({
    roomId: 'r1',
    leaderboard: [
      { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
      { userId: 'u2', username: 'Beta', score: 50, status: 'connected' as const },
    ],
    foundWords: [{ word: 'BLAST', score: 5, ts: 0, userId: 'u1' }],
    remainingTime: 90,
    totalTime: 180,
    canvas: <div data-testid="blast-canvas">B</div>,
  });

  it('renders shell with mode=blast badge', () => {
    render(<BlastDesktopAdapter {...mkProps()} />);
    expect(screen.getByTestId('blast-mode-badge')).toBeInTheDocument();
    expect(screen.getByTestId('blast-canvas')).toBeInTheDocument();
  });

  it('mounts inside MultiplayerDesktopShell', () => {
    const { container } = render(<BlastDesktopAdapter {...mkProps()} />);
    expect(container.querySelector('[data-mp-shell]')).toBeInTheDocument();
  });

  it('hides the keyboard hint strip once the player has found a word', () => {
    render(<BlastDesktopAdapter {...mkProps()} />); // mkProps foundWords has 1 entry
    expect(screen.queryByTestId('kb-hint-submit')).not.toBeInTheDocument();
  });

  it('shows the keyboard hint strip before any word is found', () => {
    render(<BlastDesktopAdapter {...mkProps()} foundWords={[]} />);
    expect(screen.getByTestId('kb-hint-submit')).toBeInTheDocument();
  });
});
