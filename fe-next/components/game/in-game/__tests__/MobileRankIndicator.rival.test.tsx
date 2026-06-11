import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileRankIndicator } from '../components/MobileRankIndicator';

// Reduced-motion + framer wrappers → plain passthroughs so we assert on content.
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
}));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const t = (k: string) => k;

describe('MobileRankIndicator — closest player chip', () => {
  it('shows the rival I am chasing (nearest player ahead) with the score gap', () => {
    const leaderboard = [
      { username: 'Maya', score: 50 },
      { username: 'Me', score: 38 },
      { username: 'Sam', score: 20 },
    ];
    render(<MobileRankIndicator leaderboard={leaderboard} currentUsername="Me" t={t} />);

    const chip = screen.getByTestId('mobile-rival-chip');
    // Closest by |Δ|: Maya (+12) beats Sam (−18) → I am chasing Maya.
    expect(chip).toHaveTextContent('Maya');
    expect(chip).toHaveTextContent('12');
    expect(chip).toHaveTextContent('multiplayer.rival.ahead');
  });

  it('shows the nearest chaser (player behind) when I am leading', () => {
    const leaderboard = [
      { username: 'Me', score: 50 },
      { username: 'Maya', score: 44 },
      { username: 'Sam', score: 10 },
    ];
    render(<MobileRankIndicator leaderboard={leaderboard} currentUsername="Me" t={t} />);

    const chip = screen.getByTestId('mobile-rival-chip');
    expect(chip).toHaveTextContent('Maya');
    expect(chip).toHaveTextContent('6');
    expect(chip).toHaveTextContent('multiplayer.rival.behind');
  });

  it('marks a tie when the closest rival has my exact score', () => {
    const leaderboard = [
      { username: 'Me', score: 30 },
      { username: 'Lee', score: 30 },
    ];
    render(<MobileRankIndicator leaderboard={leaderboard} currentUsername="Me" t={t} />);

    const chip = screen.getByTestId('mobile-rival-chip');
    expect(chip).toHaveTextContent('Lee');
    expect(chip).toHaveTextContent('multiplayer.rival.tied');
  });

  it('renders nothing (no pill, no chip) when the player is solo', () => {
    const leaderboard = [{ username: 'Me', score: 30 }];
    const { container } = render(
      <MobileRankIndicator leaderboard={leaderboard} currentUsername="Me" t={t} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('mobile-rival-chip')).toBeNull();
  });
});
