/**
 * Team colours on the live leaderboard.
 *
 * The tug-of-war says which side is ahead; this says which side each child is
 * on. Without it the bar is a scoreboard for two anonymous halves of the room —
 * which is what the teacher who reported "we weren't sure who was battling
 * whom" was actually looking at.
 */

import { vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvLeaderboard from '../TvLeaderboard';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className, style }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  LayoutGroup: ({ children }: any) => <>{children}</>,
}));

vi.mock('../TvPlayerCard', () => ({
  default: ({ username, teamId }: { username: string; teamId?: number | null }) => (
    <div data-testid={`card-${username}`} data-team={teamId ?? 'none'}>{username}</div>
  ),
}));

vi.mock('../TvGapIndicator', () => ({ default: () => null }));

const t = (key: string) => key;

const players = [
  { username: 'ana', score: 30, wordCount: 3 },
  { username: 'bo', score: 20, wordCount: 2 },
  { username: 'zed', score: 10, wordCount: 1 },
];

describe('TvLeaderboard team colours', () => {
  it('gives every player no team when the room is not a team battle', () => {
    render(<TvLeaderboard players={players} t={t} />);
    expect(screen.getByTestId('card-ana')).toHaveAttribute('data-team', 'none');
  });

  it('tags each player with the team they were dealt', () => {
    render(
      <TvLeaderboard
        players={players}
        teams={[
          { id: 0, memberNames: ['ana'] },
          { id: 1, memberNames: ['bo'] },
        ]}
        t={t}
      />
    );
    expect(screen.getByTestId('card-ana')).toHaveAttribute('data-team', '0');
    expect(screen.getByTestId('card-bo')).toHaveAttribute('data-team', '1');
  });

  it('matches a retyped nickname whatever its case', () => {
    render(
      <TvLeaderboard
        players={[{ username: 'ANA', score: 30, wordCount: 3 }]}
        teams={[{ id: 0, memberNames: ['ana'] }]}
        t={t}
      />
    );
    expect(screen.getByTestId('card-ANA')).toHaveAttribute('data-team', '0');
  });

  it('leaves a student the deal has not met yet uncoloured rather than guessing', () => {
    render(
      <TvLeaderboard
        players={players}
        teams={[
          { id: 0, memberNames: ['ana'] },
          { id: 1, memberNames: ['bo'] },
        ]}
        t={t}
      />
    );
    expect(screen.getByTestId('card-zed')).toHaveAttribute('data-team', 'none');
  });
});
