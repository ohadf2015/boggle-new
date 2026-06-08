/**
 * GameLeaderboard — reactive avatar moods
 *
 * The leaderboard already computes per-player score/rank deltas each tick.
 * Those deltas should drive a transient avatar face-swap so the board reads
 * like a live spectator sport: a scoring player celebrates, an overtaken
 * player flinches.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameLeaderboard } from '../GameLeaderboard';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  __esModule: true,
  AdaptiveMotion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ mood, overlay }: { mood?: string; overlay?: string | null }) => (
    <div data-testid="avatar" data-mood={mood ?? 'idle'} data-overlay={overlay ?? 'none'} />
  ),
}));

vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/components/PresenceIndicator', () => ({
  __esModule: true,
  default: () => null,
}));

const mockT = (key: string) => key;

const makePlayer = (overrides: Partial<ExtendedLeaderboardPlayer> = {}): ExtendedLeaderboardPlayer => ({
  username: 'Alpha',
  score: 100,
  wordCount: 5,
  isHost: false,
  avatar: undefined,
  presenceStatus: 'active' as const,
  isWindowFocused: true,
  isBot: false,
  disconnected: false,
  comboLevel: 0,
  ...overrides,
});

const moods = () =>
  screen.getAllByTestId('avatar').map((a) => a.getAttribute('data-mood'));
const overlays = () =>
  screen.getAllByTestId('avatar').map((a) => a.getAttribute('data-overlay'));

describe('GameLeaderboard — reactive avatar moods', () => {
  it('avatars start idle (no prior tick to react to)', () => {
    render(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Alpha', score: 100 }), makePlayer({ username: 'Beta', score: 50 })]}
        username="Alpha"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );
    expect(moods().every((m) => m === 'idle')).toBe(true);
  });

  it('a player who gains points reacts with a celebratory mood (in their personality style)', () => {
    // Personality traits remap a plain "correct" into the player's own
    // celebration (smug -> emoteCool, hyped -> emoteLaugh), so assert the
    // celebratory SET rather than a single mood. Stoic stays neutral by design;
    // "Glitch" below is a non-stoic seed so a reaction is guaranteed.
    const CELEBRATE = ['correct', 'emoteCool', 'emoteLaugh'];
    const { rerender } = render(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Glitch', score: 100 }), makePlayer({ username: 'Beta', score: 50 })]}
        username="Beta"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );

    // Glitch scores; ranks unchanged (already #1).
    rerender(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Glitch', score: 110 }), makePlayer({ username: 'Beta', score: 50 })]}
        username="Beta"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );

    expect(moods().some((m) => CELEBRATE.includes(m ?? ''))).toBe(true);
  });

  it('a player who gets overtaken reacts with "emoteShock"', () => {
    const { rerender } = render(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Alpha', score: 100 }), makePlayer({ username: 'Beta', score: 90 })]}
        username="Alpha"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );

    // Beta overtakes Alpha → Beta now #1, Alpha dropped to #2 (rankChange < 0).
    rerender(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Beta', score: 130 }), makePlayer({ username: 'Alpha', score: 100 })]}
        username="Alpha"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );

    expect(moods()).toContain('emoteShock');
  });

  it('gives the overtaken player a loud "alert" overlay (TV-legible)', () => {
    const { rerender } = render(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Alpha', score: 100 }), makePlayer({ username: 'Beta', score: 90 })]}
        username="Alpha"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );
    rerender(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Beta', score: 130 }), makePlayer({ username: 'Alpha', score: 100 })]}
        username="Alpha"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );
    expect(overlays()).toContain('alert');
  });

  it('does not badge an ordinary score gain (no overlay noise per word)', () => {
    const { rerender } = render(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Alpha', score: 100 }), makePlayer({ username: 'Beta', score: 50 })]}
        username="Beta"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );
    rerender(
      <GameLeaderboard
        leaderboard={[makePlayer({ username: 'Alpha', score: 105 }), makePlayer({ username: 'Beta', score: 50 })]}
        username="Beta"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );
    expect(overlays().every((o) => o === 'none')).toBe(true);
  });
});
