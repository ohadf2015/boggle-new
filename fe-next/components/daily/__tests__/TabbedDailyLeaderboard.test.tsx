/**
 * TabbedDailyLeaderboard Component Tests
 *
 * Tests for the tabbed daily leaderboard component that displays
 * today's and all-time leaderboard rankings with proper avatar display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, onError, ...props }: {
    src: string;
    alt: string;
    onError?: () => void;
    [key: string]: unknown;
  }) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        {...props}
        onError={onError}
        data-testid="avatar-image"
      />
    );
  },
}));

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

// Mock Avatar component
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ avatarImage, ...props }: {
    avatarImage?: string;
    [key: string]: unknown;
  }) => {
    if (avatarImage) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={`/avatars/${avatarImage}.png`} alt="avatar" data-testid="avatar-image" />;
    }
    return <div data-testid="avatar-emoji">avatar</div>;
  },
}));

// Mock avatar config utilities
vi.mock('@/utils/avatarConfig', () => ({
  AVATARS: [
    { id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' },
    { id: 'shroom-shelly', name: 'Shroom Shelly', filename: 'shroom-shelly.png' },
    { id: 'pizza-pete', name: 'Pizza Pete', filename: 'pizza-pete.png' },
  ],
  getAvatarPath: (avatar: { id: string; filename: string } | string) => {
    if (typeof avatar === 'string') {
      return `/avatars/${avatar}.png`;
    }
    return `/avatars/${avatar.filename}`;
  },
  getRandomAvatar: () => ({ id: 'broccoli-bob', name: 'Broccoli Bob', filename: 'broccoli-bob.png' }),
}));

// Mock shared utils
vi.mock('@/shared/utils', () => ({
  formatDistanceToNow: () => '5 minutes ago',
  getCountryFlag: (code: string | null | undefined) => code ? '🇺🇸' : null,
}));

// Mock ranking styles
vi.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
}));

// Mock daily challenge utils
vi.mock('@/utils/dailyChallenge', () => ({
  getPuzzleNumber: () => 42,
}));

// Mock useFriends with a mutable list so individual tests can control it.
// Must be hoisted above the component import; the `mock` prefix is required
// by Vitest's auto-hoist rules for variables referenced inside factories.
const mockFriendsState: { friends: Array<{ odUserId: string }> } = { friends: [] };
vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => mockFriendsState,
}));

// Import the component types for mock data
import type { DailyParticipant, AllTimeParticipant } from '../TabbedDailyLeaderboard';

// Helper to create mock participant data
const createMockParticipant = (overrides: Partial<DailyParticipant> = {}): DailyParticipant => ({
  player_id: 'user-123',
  guest_fingerprint: null,
  display_name: 'TestPlayer',
  avatar_emoji: '🦊',
  avatar_color: '#FF5733',
  avatar_image: 'shroom-shelly',  // Custom avatar

  country_code: 'US',
  score: 100,
  word_count: 10,
  time_seconds: 60,
  completed_at: new Date().toISOString(),
  rank_position: 1,
  solved: true,
  attempts_used: 3,
  efficiency_score: 85,
  ...overrides,
});

const createMockAllTimeParticipant = (overrides: Partial<AllTimeParticipant> = {}): AllTimeParticipant => ({
  player_id: 'user-123',
  guest_fingerprint: null,
  player_identifier: 'user-123',
  display_name: 'TestPlayer',
  avatar_emoji: '🦊',
  avatar_color: '#FF5733',
  avatar_image: 'pizza-pete',  // Custom avatar

  country_code: 'US',
  total_efficiency_score: 500,
  total_games: 10,
  games_won: 8,
  avg_attempts: 3.5,
  best_efficiency: 95,
  last_played_at: new Date().toISOString(),
  rank_position: 1,
  ...overrides,
});

describe('TabbedDailyLeaderboard', () => {
  const mockT = (key: string) => key;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockParticipant()],
            totalParticipants: 1,
            totalPlayers: 1,
            totalSolved: 1,
            guestPlayerCount: 0,
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockAllTimeParticipant()],
            totalParticipants: 1,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  describe('avatar_image support', () => {
    it('should include avatar_image in DailyParticipant interface', () => {
      // This test verifies the interface has avatar_image field
      const participant: DailyParticipant = createMockParticipant();
      expect(participant.avatar_image).toBe('shroom-shelly');
    });

    it('should include avatar_image in AllTimeParticipant interface', () => {
      // This test verifies the interface has avatar_image field
      const participant: AllTimeParticipant = createMockAllTimeParticipant();
      expect(participant.avatar_image).toBe('pizza-pete');
    });

    it('should render custom avatar image when avatar_image is provided', async () => {
      // Dynamically import after mocks are set up
      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');

      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          t={mockT}
        />
      );

      // Wait for API call and render
      await screen.findByText('TestPlayer');

      // Should render the custom avatar image (shroom-shelly), NOT the emoji
      const avatarImages = screen.getAllByTestId('avatar-image');
      expect(avatarImages.length).toBeGreaterThan(0);

      // The avatar should use the custom avatar path, not just show emoji
      const hasCustomAvatar = avatarImages.some(
        img => img.getAttribute('src')?.includes('/avatars/shroom-shelly')
      );
      expect(hasCustomAvatar).toBe(true);
    });

    it('should NOT show emoji when avatar_image is available', async () => {
      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');

      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          t={mockT}
        />
      );

      await screen.findByText('TestPlayer');

      // The emoji should NOT be visible as an avatar when avatar_image is available
      // (emoji might appear elsewhere, but not as the main avatar)
      const emojiAvatarDivs = document.querySelectorAll('[style*="background-color: rgb(255, 87, 51)"]');

      // If avatar_image is properly used, there should be no emoji-based avatar div
      // with the background color (which is how emoji avatars are rendered)
      expect(emojiAvatarDivs.length).toBe(0);
    });
  });

  describe('windowed pagination around current user', () => {
    it('should center the visible window on the current user when present', async () => {
      // Given: 30 participants, current user at rank 15
      const manyParticipants = Array.from({ length: 30 }, (_, i) =>
        createMockParticipant({
          player_id: `user-${i + 1}`,
          display_name: `Player${i + 1}`,
          rank_position: i + 1,
        })
      );
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/word-hunt/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: manyParticipants,
              totalParticipants: 30,
              totalPlayers: 30,
              totalSolved: 30,
              guestPlayerCount: 0,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      });

      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          currentPlayerId="user-15"
          maxVisible={10}
          t={mockT}
        />
      );

      // When: data loads
      await screen.findByText('Player15');

      // Then: window centered on rank 15 (Player11..Player20), Player1 hidden, Player30 hidden
      expect(screen.queryByText('Player1')).not.toBeInTheDocument();
      expect(screen.queryByText('Player30')).not.toBeInTheDocument();
      expect(screen.getByText('Player15')).toBeInTheDocument();
    });

    it('should show "load more" buttons above and below when window is partial', async () => {
      const manyParticipants = Array.from({ length: 30 }, (_, i) =>
        createMockParticipant({
          player_id: `user-${i + 1}`,
          display_name: `Player${i + 1}`,
          rank_position: i + 1,
        })
      );
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/word-hunt/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: manyParticipants,
              totalParticipants: 30,
              totalPlayers: 30,
              totalSolved: 30,
              guestPlayerCount: 0,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      });

      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          currentPlayerId="user-15"
          maxVisible={10}
          t={mockT}
        />
      );

      await screen.findByText('Player15');

      // Two "showMore" buttons should be visible — above and below
      const showMoreButtons = screen.getAllByText(/daily\.showMore/);
      expect(showMoreButtons.length).toBe(2);
    });
  });

  describe('friends tab uses today row layout', () => {
    it('should render TodayParticipantRow fields (attempts/efficiency) for friends tab', async () => {
      const friendParticipant = createMockParticipant({
        player_id: 'friend-1',
        display_name: 'FriendPlayer',
        attempts_used: 4,
        efficiency_score: 77,
      });
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/word-hunt/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [friendParticipant],
              totalParticipants: 1,
              totalPlayers: 1,
              totalSolved: 1,
              guestPlayerCount: 0,
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      });

      // Inject the friend so the friends tab includes our mock participant
      mockFriendsState.friends = [{ odUserId: 'friend-1' }];

      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          defaultTab="friends"
          t={mockT}
        />
      );

      // Today-row-only field: "✓ 4/10" attempts indicator
      expect(await screen.findByText(/4\/10/)).toBeInTheDocument();
      // Efficiency points indicator
      expect(screen.getByText(/77/)).toBeInTheDocument();
    });
  });

  describe('i18n: leaderboard error uses translation key (not hardcoded English)', () => {
    // 4 sites used to setError('Failed to load leaderboard') in raw English —
    // breaks Hebrew/Swedish/Japanese/Spanish UX. Audit 2026-05-02 / memory
    // feedback-hardcoded-leaderboard-error.md.
    it('renders translation key when fetch fails', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('boom') })
      );

      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
      render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          t={mockT}
        />
      );

      // mockT is identity (returns the key) — so the rendered text proves
      // the component is calling t() with the canonical key from the shared
      // errors namespace (Sentry NEXTJS-13F: never used to ship in he locale).
      expect(await screen.findByText('errors.failedToLoadLeaderboard')).toBeInTheDocument();
      // And the raw English literal MUST NOT appear.
      expect(screen.queryByText('Failed to load leaderboard')).not.toBeInTheDocument();
    });
  });

  describe('header subtitle suppresses misleading counts on error', () => {
    it('does NOT show "0 players" subtitle when the fetch fails', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('boom') })
      );

      const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
      const { container } = render(
        <TabbedDailyLeaderboard
          puzzleDate="2026-01-09"
          language="en"
          t={mockT}
        />
      );

      // Wait for the error to render (proves loading is done)
      expect(await screen.findByText('errors.failedToLoadLeaderboard')).toBeInTheDocument();

      // The subtitle's "0 players" line must NOT appear when the load failed —
      // showing both an error AND "0 players" looks broken (screenshot bug).
      // mockT is identity, so the plural key leaks into the rendered text;
      // when our fix lands the subtitle is hidden entirely on error.
      expect(container.textContent || '').not.toContain('daily.playersPlural');
      expect(container.textContent || '').not.toContain('daily.playerSingular');
    });
  });
});
