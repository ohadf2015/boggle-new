import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConsolationRows from '../ConsolationRows';
import type { PlayerScore } from '@/hooks/useResultsData';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
  }),
  useReducedMotion: () => true,
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

vi.mock('@/components/results/ResultsFriendStatus', () => ({
  AddFriendBadge: ({ username }: { username: string }) => (
    <div data-testid={`add-friend-${username}`} />
  ),
}));

const player = (username: string, score: number): PlayerScore =>
  ({ username, score } as PlayerScore);

const t = (k: string) => k;

describe('ConsolationRows — current-player-only trim', () => {
  it('shows the player at their TRUE rank via startRank (not list index)', () => {
    // The MP results body now passes only the current player's row with
    // startRank = their real rank, so a 6th-place player must read "6".
    render(
      <ConsolationRows
        players={[player('me', 120)]}
        crowns={new Map()}
        currentUsername="me"
        startRank={6}
        t={t}
      />
    );
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('me')).toBeInTheDocument();
  });

  it('does not render an add-friend badge for the current player', () => {
    render(
      <ConsolationRows
        players={[player('me', 120)]}
        crowns={new Map()}
        currentUsername="me"
        startRank={5}
        t={t}
      />
    );
    expect(screen.queryByTestId('add-friend-me')).not.toBeInTheDocument();
  });
});
