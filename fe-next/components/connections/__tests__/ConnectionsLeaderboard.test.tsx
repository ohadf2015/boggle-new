import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionsLeaderboard from '../ConnectionsLeaderboard';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

// Avatar draws a deterministic RANDOM face when `customAvatar` is missing, so
// asserting "an avatar rendered" would pass on the bug. Expose the real
// component's data-avatar-type contract instead.
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ customAvatar }: { customAvatar?: unknown }) => (
    <div data-testid="row-avatar" data-avatar-type={customAvatar ? 'custom' : 'generated'} />
  ),
}));

const rows: LeaderboardRow[] = [
  { rank_position: 1, display_name: 'Bob', avatar_emoji: '🦊', avatar_color: '#f00', avatar_image: null, custom_avatar: { base: 'oval' } as never, score: 800, time_taken_seconds: 20, streak: 4, puzzles_solved: 5, language: 'he' },
  { rank_position: 2, display_name: 'Alice', avatar_emoji: '🐼', avatar_color: '#0f0', avatar_image: null, custom_avatar: null, score: 700, time_taken_seconds: 30, streak: 2, puzzles_solved: 5, language: 'he' },
];

describe('ConnectionsLeaderboard', () => {
  it('renders each row with name and score', () => {
    render(<ConnectionsLeaderboard rows={rows} ownRank={null} totalPlayers={2} streak={0} loading={false} />);
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('800')).toBeTruthy();
  });

  it('marks the caller\'s own row', () => {
    render(<ConnectionsLeaderboard rows={rows} ownRank={2} totalPlayers={2} streak={2} loading={false} />);
    const own = screen.getByTestId('leaderboard-row-2');
    expect(own.getAttribute('data-own')).toBe('true');
    const other = screen.getByTestId('leaderboard-row-1');
    expect(other.getAttribute('data-own')).toBe('false');
  });

  it('shows an empty state when there are no rows', () => {
    render(<ConnectionsLeaderboard rows={[]} ownRank={null} totalPlayers={0} streak={0} loading={false} />);
    expect(screen.getByText('connections.daily.empty')).toBeTruthy();
  });

  it('renders the player REAL avatar when they have one', () => {
    render(<ConnectionsLeaderboard rows={rows} ownRank={null} totalPlayers={2} streak={0} loading={false} />);
    const avatars = screen.getAllByTestId('row-avatar');
    expect(avatars).toHaveLength(2);
    expect(avatars[0].getAttribute('data-avatar-type')).toBe('custom');
    expect(avatars[1].getAttribute('data-avatar-type')).toBe('generated');
  });

  it('renders a loading state', () => {
    render(<ConnectionsLeaderboard rows={[]} ownRank={null} totalPlayers={0} streak={0} loading />);
    expect(screen.getByText('connections.daily.loading')).toBeTruthy();
  });
});
