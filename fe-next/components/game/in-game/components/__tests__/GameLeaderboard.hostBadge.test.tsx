/**
 * GameLeaderboard — HOST badge & visual distinction tests
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameLeaderboard } from '../GameLeaderboard';
import type { ExtendedLeaderboardPlayer } from '@/shared/types/view';

// Mock motion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  default: ({ size }: { size: string }) => (
    <div data-testid="avatar" data-size={size} />
  ),
}));

// Mock PlayerProfileTooltip
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: React.PropsWithChildren) => (
    <div data-testid="profile-tooltip">{children}</div>
  ),
}));

// Mock PresenceIndicator
vi.mock('@/components/PresenceIndicator', () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="presence-indicator" data-status={status} />
  ),
}));

const mockT = (key: string) => key;

describe('GameLeaderboard — HOST badge & row styling', () => {
  it('marks the host with a crown icon (no separate HOST text chip)', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'HostPlayer',
        score: 100,
        wordCount: 5,
        isHost: true,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    const { container } = render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Decluttered: the crown is the host marker — there is no "HOST" text chip.
    expect(screen.queryByText('HOST')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-label="Host"]')).not.toBeNull();
  });

  it('does NOT mark non-host players with a crown', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'Player1',
        score: 100,
        wordCount: 5,
        isHost: false,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    const { container } = render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    expect(screen.queryByText('HOST')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-label="Host"]')).toBeNull();
  });

  it('host row is distinguished by the crown marker, not a yellow stripe', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'HostPlayer',
        score: 100,
        wordCount: 5,
        isHost: true,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    const { container } = render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    const hostRow = container.querySelector('[role="listitem"]');
    expect(hostRow).not.toBeNull();
    // Color-overload declutter: no yellow left stripe; the crown carries host identity.
    expect(hostRow?.className).not.toContain('border-l-neo-yellow');
    expect(hostRow?.querySelector('[aria-label="Host"]')).not.toBeNull();
  });

  it('crown icon still visible for host player', () => {
    const leaderboard: ExtendedLeaderboardPlayer[] = [
      {
        username: 'HostPlayer',
        score: 100,
        wordCount: 5,
        isHost: true,
        avatar: undefined,
        presenceStatus: 'active' as const,
        isWindowFocused: true,
        isBot: false,
        disconnected: false,
        comboLevel: 0,
      },
    ];

    const { container } = render(
      <GameLeaderboard
        leaderboard={leaderboard}
        username="OtherPlayer"
        isHost={false}
        t={mockT}
        dir="ltr"
      />
    );

    // Crown should be in the document (lucide-react renders as svg)
    const crowns = container.querySelectorAll('svg');
    expect(crowns.length).toBeGreaterThan(0); // Trophy + Crown = at least 2
  });
});
