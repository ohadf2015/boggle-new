/**
 * GameLeaderboard — disableEffects propagation
 *
 * Ensures in-match leaderboard avatars don't run the continuous tier
 * animations (filter: drop-shadow loops, sparkles, conic-gradient ring),
 * which are paint-bound and stack into UI jank with multiple avatars.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameLeaderboard } from '../GameLeaderboard';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

vi.mock('@/components/Avatar', () => ({
  default: ({ disableEffects }: { disableEffects?: boolean }) => (
    <div data-testid="avatar" data-disable-effects={disableEffects ? 'true' : 'false'} />
  ),
}));

vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/components/PresenceIndicator', () => ({
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

describe('GameLeaderboard — avatar tier effects disabled in-game', () => {
  it('renders each avatar with disableEffects=true', () => {
    const leaderboard = [
      makePlayer({ username: 'Alpha', score: 100 }),
      makePlayer({ username: 'Beta', score: 50 }),
    ];

    render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="Alpha"
        isHost={false}
        t={mockT}
        dir="ltr"
      />,
    );

    const avatars = screen.getAllByTestId('avatar');
    expect(avatars.length).toBeGreaterThan(0);
    for (const a of avatars) {
      expect(a.getAttribute('data-disable-effects')).toBe('true');
    }
  });
});
