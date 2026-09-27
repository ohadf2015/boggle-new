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

  it('shows each visible player score (not zero), thousands-formatted', () => {
    render(<BlastMPLeaderboard leaderboard={LB.slice(0, 3)} username="bob" t={t} />);
    // Scores render with locale thousands separators (e.g. 1200 → "1,200").
    expect(screen.getByText((1200).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText((800).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText((450).toLocaleString())).toBeInTheDocument();
  });

  it('labels the current player with the YOU tag', () => {
    render(<BlastMPLeaderboard leaderboard={LB.slice(0, 3)} username="bob" t={t} />);
    expect(screen.getByText('YOU')).toBeInTheDocument();
  });

  it('always shows the current player even when outside the top slice, with true rank', () => {
    // erin is rank 5 of 5 — must still appear with her score + rank #5
    render(<BlastMPLeaderboard leaderboard={LB} username="erin" t={t} />);
    expect(screen.getByText('YOU')).toBeInTheDocument();
    expect(screen.getByText((90).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('marks the leader (#1) row distinctly', () => {
    const { container } = render(<BlastMPLeaderboard leaderboard={LB} username="bob" t={t} />);
    // Leader pill carries a data flag the others don't.
    expect(container.querySelector('[data-leader="true"]')).toBeTruthy();
  });

  it('shows a competitive gap badge on the YOU pill when trailing (points to catch)', () => {
    // bob (800) trails alice (1200) by 400.
    const { container } = render(<BlastMPLeaderboard leaderboard={LB} username="bob" t={t} />);
    const gap = container.querySelector('[data-testid="blast-mp-gap"]');
    expect(gap).toBeTruthy();
    expect(gap?.getAttribute('data-kind')).toBe('behind');
    expect(gap?.textContent).toContain('400');
  });

  it('shows the lead margin on the YOU pill when leading (#1)', () => {
    // alice (1200) leads bob (800) by 400.
    const { container } = render(<BlastMPLeaderboard leaderboard={LB} username="alice" t={t} />);
    const gap = container.querySelector('[data-testid="blast-mp-gap"]');
    expect(gap).toBeTruthy();
    expect(gap?.getAttribute('data-kind')).toBe('lead');
    expect(gap?.textContent).toContain('400');
  });

  it('renders no gap badge when alone on the board (no rival)', () => {
    const { container } = render(
      <BlastMPLeaderboard leaderboard={[{ username: 'solo', score: 100 }]} username="solo" t={t} />,
    );
    expect(container.querySelector('[data-testid="blast-mp-gap"]')).toBeNull();
  });

  it('gives the YOU pill stronger visual weight than rivals (thicker border)', () => {
    const { container } = render(<BlastMPLeaderboard leaderboard={LB} username="bob" t={t} />);
    const mePill = container.querySelector('[data-me="true"]');
    expect(mePill?.className).toContain('border-[3px]');
  });
});
