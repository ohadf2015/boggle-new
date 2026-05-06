import { render, screen } from '@testing-library/react';
import { BlastMPLeaderboard } from '../BlastMPLeaderboard';

vi.mock('@/hooks/gameState/selectors', () => ({
  useBlastOpponentActivity: () => [],
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ userId, customAvatar }: { userId?: string; customAvatar?: unknown }) => (
    <span data-testid="avatar" data-uid={userId} data-has-custom={customAvatar ? 'true' : 'false'} />
  ),
}));

const mkLeaderboard = (overrides: object[] = []) => [
  { username: 'Alice', score: 300, ...overrides[0] },
  { username: 'Bob', score: 200, ...overrides[1] },
  { username: 'Carol', score: 100, ...overrides[2] },
];

describe('BlastMPLeaderboard', () => {
  it('renders an avatar per player', () => {
    render(<BlastMPLeaderboard leaderboard={mkLeaderboard()} username="Alice" />);
    expect(screen.getAllByTestId('avatar')).toHaveLength(3);
  });

  it('uses username as avatar userId seed', () => {
    render(<BlastMPLeaderboard leaderboard={mkLeaderboard()} username="Alice" />);
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars.some(a => a.getAttribute('data-uid') === 'Bob')).toBe(true);
  });

  it('passes customAvatar to Avatar when provided', () => {
    const lb = [
      { username: 'Alice', score: 300, avatar: { customAvatar: { parts: [] } as never } },
    ];
    render(<BlastMPLeaderboard leaderboard={lb} username="Bob" />);
    expect(screen.getByTestId('avatar').getAttribute('data-has-custom')).toBe('true');
  });
});
