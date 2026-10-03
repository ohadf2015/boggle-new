import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fireRankConfetti = vi.fn();
const playRoundEndCue = vi.fn(() => null);

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: (...args: unknown[]) => fireRankConfetti(...args),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: (...args: unknown[]) => playRoundEndCue(...args),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));

import { WinnerSpotlight } from '../WinnerSpotlight';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

describe('WinnerSpotlight — honest about what the round was', () => {
  beforeEach(() => {
    fireRankConfetti.mockClear();
    playRoundEndCue.mockClear();
  });
  afterEach(cleanup);

  it('Given the top score is zero, Then it never says winner and fires no confetti or sting', () => {
    render(<WinnerSpotlight winner={{ username: 'Zoe', score: 0 }} active t={t} />);
    const bar = screen.getByTestId('winner-spotlight');
    expect(bar).toHaveAttribute('data-outcome', 'zero');
    expect(screen.queryByText(/winnerBanner/)).toBeNull();
    expect(screen.getByText('eduLive.results.zeroTitle')).toBeInTheDocument();
    expect(fireRankConfetti).not.toHaveBeenCalled();
    expect(playRoundEndCue).not.toHaveBeenCalled();
    expect(screen.queryByTestId('winner-mascot-video')).toBeNull();
  });

  it('Given a solo round, Then it names the player as a solo run, not a winner', () => {
    render(<WinnerSpotlight winner={{ username: 'Zoe', score: 130 }} outcome="solo" active t={t} />);
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-outcome', 'solo');
    expect(screen.getByText('eduLive.results.soloTitle')).toBeInTheDocument();
    expect(screen.queryByText(/winnerBanner/)).toBeNull();
    expect(screen.getByText('Zoe')).toBeInTheDocument();
  });

  it('Given a tie, Then it names every leader', () => {
    render(
      <WinnerSpotlight
        winner={{ username: 'Maya', score: 90 }}
        outcome="tie"
        leaders={['Maya', 'Leo']}
        active
        t={t}
      />
    );
    expect(screen.getByText('eduLive.results.tieTitle')).toBeInTheDocument();
    expect(screen.getByTestId('winner-names')).toHaveTextContent('Maya');
    expect(screen.getByTestId('winner-names')).toHaveTextContent('Leo');
  });

  it('Given a real winner, Then the existing celebration still fires once', () => {
    render(<WinnerSpotlight winner={{ username: 'Maya', score: 140 }} outcome="winner" active t={t} />);
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-outcome', 'winner');
    expect(fireRankConfetti).toHaveBeenCalledTimes(1);
  });
});
