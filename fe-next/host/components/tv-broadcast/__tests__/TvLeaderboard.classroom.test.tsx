/**
 * The classroom projector's live standings.
 *
 * A free-for-all classroom round gets the big, animated top-N board
 * (LiveClassroomLeaderboard) instead of the arcade card list. Team rounds keep
 * their team-coloured cards, and Word Hunt keeps the cards that carry lives.
 */
import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvLeaderboard from '../TvLeaderboard';

vi.mock('framer-motion', () => ({
  m: { div: ({ children, className }: any) => <div className={className}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LayoutGroup: ({ children }: any) => <>{children}</>,
}));
vi.mock('../TvPlayerCard', () => ({
  default: ({ username }: { username: string }) => <div data-testid={`card-${username}`}>{username}</div>,
}));
vi.mock('../TvGapIndicator', () => ({ default: () => null }));
vi.mock('@/components/education/duels/LiveClassroomLeaderboard', () => ({
  default: (p: { leaderboard: { username: string; score: number }[]; variant: string; topN?: number; gameMode?: string }) => (
    <div
      data-testid="live-classroom-board"
      data-variant={p.variant}
      data-mode={p.gameMode}
      data-top={p.topN}
      data-rows={p.leaderboard.map((r) => `${r.username}:${r.score}`).join(',')}
    />
  ),
}));

const t = (key: string) => key;
const players = [
  { username: 'bo', score: 20, wordCount: 2 },
  { username: 'ana', score: 30, wordCount: 3 },
];

describe('TvLeaderboard — classroom projector', () => {
  it('renders the animated classroom board for a free-for-all classroom round, fed the server scores', () => {
    render(<TvLeaderboard players={players} classroom gameMode="classic" t={t} />);
    const board = screen.getByTestId('live-classroom-board');
    expect(board).toHaveAttribute('data-variant', 'projector');
    expect(board).toHaveAttribute('data-mode', 'classic');
    expect(board.getAttribute('data-rows')).toBe('ana:30,bo:20');
    expect(screen.queryByTestId('card-ana')).toBeNull();
  });

  it('keeps the arcade cards outside a classroom', () => {
    render(<TvLeaderboard players={players} gameMode="classic" t={t} />);
    expect(screen.queryByTestId('live-classroom-board')).toBeNull();
    expect(screen.getByTestId('card-ana')).toBeInTheDocument();
  });

  it('keeps the cards (they carry lives) for a classroom Word Hunt', () => {
    render(<TvLeaderboard players={players} classroom gameMode="word-hunt" t={t} />);
    expect(screen.queryByTestId('live-classroom-board')).toBeNull();
  });

  it('keeps the team-coloured cards for a classroom team battle', () => {
    render(
      <TvLeaderboard
        players={players}
        classroom
        gameMode="classic"
        teams={[{ id: 0, memberNames: ['ana'] }, { id: 1, memberNames: ['bo'] }] as any}
        t={t}
      />
    );
    expect(screen.queryByTestId('live-classroom-board')).toBeNull();
  });
});
