import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastMPLeaderboard } from '../BlastMPLeaderboard';

// Opponent-activity bus — default to no activity for deterministic rendering.
const activityMock = vi.fn(() => [] as unknown[]);
vi.mock('@/hooks/gameState/selectors', () => ({
  useBlastOpponentActivity: () => activityMock(),
}));

const t = (k: string) => ({ 'blast.you': 'YOU', 'blast.live': 'LIVE' })[k] ?? k;

const LB = [
  { username: 'alice', score: 1200 },
  { username: 'bob', score: 800 },
  { username: 'carol', score: 450 },
  { username: 'dave', score: 300 },
  { username: 'erin', score: 90 },
];

describe('BlastMPLeaderboard', () => {
  beforeEach(() => activityMock.mockReturnValue([]));

  it('renders nothing for an empty leaderboard', () => {
    const { container } = render(<BlastMPLeaderboard leaderboard={[]} username="bob" t={t} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows each visible player score (not zero)', () => {
    render(<BlastMPLeaderboard leaderboard={LB.slice(0, 3)} username="bob" t={t} />);
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('labels the current player with the YOU tag', () => {
    render(<BlastMPLeaderboard leaderboard={LB.slice(0, 3)} username="bob" t={t} />);
    expect(screen.getByText('YOU')).toBeInTheDocument();
  });

  it('always shows the current player even when outside the top slice, with true rank', () => {
    // erin is rank 5 of 5 — must still appear with her score + rank #5
    render(<BlastMPLeaderboard leaderboard={LB} username="erin" t={t} />);
    expect(screen.getByText('YOU')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('marks the leader (#1) row distinctly', () => {
    const { container } = render(<BlastMPLeaderboard leaderboard={LB} username="bob" t={t} />);
    // Leader pill carries a data flag the others don't.
    expect(container.querySelector('[data-leader="true"]')).toBeTruthy();
  });
});
