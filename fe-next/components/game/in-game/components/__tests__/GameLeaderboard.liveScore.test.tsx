import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameLeaderboard } from '../GameLeaderboard';
import { useGameStore } from '@/hooks/gameState/store';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

const mockT = (key: string) => key;

// The prop the row structure renders from. In live play this is the
// `useFrozenWhileSelecting`-frozen snapshot: rival is stuck at 10 while the
// local player is mid-drag.
const frozenProp: ExtendedLeaderboardPlayer[] = [
  { username: 'me', score: 50, wordCount: 3, comboLevel: 0, avatar: undefined, isHost: false },
  { username: 'rival', score: 10, wordCount: 1, comboLevel: 0, avatar: undefined, isHost: false },
];

describe('GameLeaderboard - live score bypasses the selection freeze', () => {
  beforeEach(() => {
    useGameStore.setState({ leaderboard: [] });
  });

  it('renders the live store score for a rival even when the passed prop score is stale (frozen mid-drag)', () => {
    // Store has advanced past the frozen prop: rival scored to 85 during the
    // local drag. The score number must reflect the live store, not the freeze.
    useGameStore.setState({
      leaderboard: [
        { username: 'me', score: 50 },
        { username: 'rival', score: 85 },
      ] as ExtendedLeaderboardPlayer[],
    });

    render(
      <GameLeaderboard leaderboard={frozenProp} username="me" isHost={false} t={mockT} dir="ltr" />
    );

    // Live rival score wins over the frozen prop value.
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.queryByText('10')).toBeNull();
  });

  it('updates the number when the store changes AFTER render while the prop stays frozen', () => {
    // The production scenario: prop is frozen at rival=10 for the whole drag;
    // the store then advances. The number must re-render reactively — a one-time
    // getState() read would refreeze prod yet still pass the mount-only test.
    useGameStore.setState({
      leaderboard: [
        { username: 'me', score: 50 },
        { username: 'rival', score: 10 },
      ] as ExtendedLeaderboardPlayer[],
    });

    render(
      <GameLeaderboard leaderboard={frozenProp} username="me" isHost={false} t={mockT} dir="ltr" />
    );
    expect(screen.getByText('10')).toBeInTheDocument();

    // Prop unchanged (still frozen) — only the store mutates.
    act(() => {
      useGameStore.setState({
        leaderboard: [
          { username: 'me', score: 50 },
          { username: 'rival', score: 85 },
        ] as ExtendedLeaderboardPlayer[],
      });
    });

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.queryByText('10')).toBeNull();
  });

  it('falls back to the prop score when the store has no entry for that player', () => {
    render(
      <GameLeaderboard leaderboard={frozenProp} username="me" isHost={false} t={mockT} dir="ltr" />
    );

    // Empty store → both numbers come from the prop.
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
