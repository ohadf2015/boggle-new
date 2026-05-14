/**
 * TabbedDailyLeaderboard Solved Count Tests
 *
 * Tests for verifying the leaderboard correctly displays the count of
 * players who solved the daily challenge in the header section.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} data-testid="avatar-image" />
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

// Mock avatar config utilities
vi.mock('@/utils/avatarConfig', () => ({
  AVATARS: [{ id: 'test-avatar', name: 'Test Avatar', filename: 'test-avatar.png' }],
  getAvatarPath: (avatar: { id: string; filename: string } | string) =>
    typeof avatar === 'string' ? `/avatars/${avatar}.png` : `/avatars/${avatar.filename}`,
  getRandomAvatar: () => ({ id: 'test-avatar', name: 'Test Avatar', filename: 'test-avatar.png' }),
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

import type { DailyParticipant } from '../TabbedDailyLeaderboard';

const createMockSolvedParticipant = (id: number): DailyParticipant => ({
  player_id: `user-${id}`,
  guest_fingerprint: null,
  display_name: `Player${id}`,
  avatar_emoji: '🎯',
  avatar_color: '#6366f1',
  avatar_image: null,

  country_code: 'US',
  score: 100 - id * 10,
  word_count: 10,
  time_seconds: 60 + id * 5,
  completed_at: new Date().toISOString(),
  rank_position: id,
  solved: true,
  attempts_used: id + 1,
  efficiency_score: 90 - id * 5,
});

describe('TabbedDailyLeaderboard - Solved Count Display', () => {
  const mockT = (key: string) => {
    // Return translation keys that match the component's expected text
    const translations: Record<string, string> = {
      'wordHunt.leaderboard.title': 'Leaderboard',
      'wordHunt.leaderboard.played': 'played',
      'wordHunt.leaderboard.solved': 'solved',
      'wordHunt.leaderboard.pts': 'pts',
      'wordHunt.leaderboard.today': 'Today',
      'wordHunt.leaderboard.allTime': 'All Time',
      'daily.playerSingular': 'player',
      'daily.playersPlural': 'players',
      'daily.guestSingular': 'guest',
      'daily.guestsPlural': 'guests',
      'daily.beFirstToPlay': 'Be the first to play!',
      'daily.showLess': 'Show less',
      'daily.showMore': 'Show more',
      'daily.more': 'more',
      'common.retry': 'Retry',
    };
    return translations[key] || key;
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  it('should display correct solved count when totalSolved is provided by API', async () => {
    // GIVEN: API returns totalPlayers=10, totalSolved=7 (7 out of 10 players solved)
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [
              createMockSolvedParticipant(1),
              createMockSolvedParticipant(2),
              createMockSolvedParticipant(3),
            ],
            totalParticipants: 3, // Authenticated solvers on leaderboard
            totalPlayers: 10,     // ALL who attempted (including failed + guests)
            totalSolved: 7,       // ALL who solved (including guests)
            guestPlayerCount: 2,  // Guests who solved
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // WHEN: We render the leaderboard
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-01-22"
        language="en"
        t={mockT}
      />
    );

    // THEN: Should display "10 played • 7 solved • 2 guests"
    await waitFor(() => {
      expect(screen.getByText('10 played')).toBeInTheDocument();
    });

    // Verify the header shows correct counts
    expect(screen.getByText('7 solved')).toBeInTheDocument();
    expect(screen.getByText(/2.*guests/)).toBeInTheDocument();
  });

  it('should display guest count when guests have solved', async () => {
    // GIVEN: API returns data with guest solvers
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockSolvedParticipant(1)],
            totalParticipants: 1,
            totalPlayers: 5,
            totalSolved: 4,
            guestPlayerCount: 3, // 3 guests solved
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // WHEN: We render the leaderboard
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-01-22"
        language="en"
        t={mockT}
      />
    );

    // THEN: Should show "3 guests"
    await waitFor(() => {
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });
    expect(screen.getByText(/guests/)).toBeInTheDocument();
  });

  it('should show singular "guest" when only 1 guest solved', async () => {
    // GIVEN: API returns data with single guest solver
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockSolvedParticipant(1)],
            totalParticipants: 1,
            totalPlayers: 3,
            totalSolved: 2,
            guestPlayerCount: 1, // 1 guest solved
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // WHEN: We render the leaderboard
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-01-22"
        language="en"
        t={mockT}
      />
    );

    // THEN: Should show "1 guest" (singular)
    await waitFor(() => {
      expect(screen.getByText(/1.*guest/i)).toBeInTheDocument();
    });
  });

  it('should NOT show guest count when no guests have solved', async () => {
    // GIVEN: API returns data with NO guest solvers
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockSolvedParticipant(1)],
            totalParticipants: 1,
            totalPlayers: 5,
            totalSolved: 3,
            guestPlayerCount: 0, // No guests solved
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // WHEN: We render the leaderboard
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-01-22"
        language="en"
        t={mockT}
      />
    );

    // THEN: Should show "5 played" but NOT "guests" text
    await waitFor(() => {
      expect(screen.getByText('5 played')).toBeInTheDocument();
    });

    // Query for guest text should not find it in the header
    // Note: We need to be careful because the text might be split across elements
    const headerElement = screen.getByText('5 played').closest('p');
    expect(headerElement?.textContent).not.toMatch(/guest/i);
  });

  it('should display solved count in emerald green color', async () => {
    // GIVEN: API returns data
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockSolvedParticipant(1)],
            totalParticipants: 1,
            totalPlayers: 10,
            totalSolved: 8,
            guestPlayerCount: 0,
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // WHEN: We render the leaderboard
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-01-22"
        language="en"
        t={mockT}
      />
    );

    // THEN: The solved count should have emerald color class
    await waitFor(() => {
      expect(screen.getByText('8 solved')).toBeInTheDocument();
    });

    // Find the element containing solved count and verify it has the emerald class
    const solvedElement = screen.getByText('8 solved');
    expect(solvedElement.className).toMatch(/emerald/);
  });

  it('should only show solved players in the ranked list (not failed attempts)', async () => {
    // GIVEN: API returns data where only solved players are in the list
    // The API filters solved=true at the server level
    const solvedPlayers = [
      createMockSolvedParticipant(1),
      createMockSolvedParticipant(2),
    ];

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: solvedPlayers, // Only solved players
            totalParticipants: 2,
            totalPlayers: 10, // 10 total attempted
            totalSolved: 5,   // 5 solved (2 authenticated + 3 guests)
            guestPlayerCount: 3,
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // WHEN: We render the leaderboard
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-01-22"
        language="en"
        t={mockT}
      />
    );

    // THEN: Should show 2 player rows (only solved players)
    await waitFor(() => {
      expect(screen.getByText('Player1')).toBeInTheDocument();
      expect(screen.getByText('Player2')).toBeInTheDocument();
    });

    // Verify that check marks are shown (solved indicator)
    const checkMarks = screen.getAllByText(/✓/);
    expect(checkMarks.length).toBeGreaterThanOrEqual(2);
  });

  it('combined scope: never shows solved > played (splits per-mode when both have solvers)', async () => {
    // GIVEN: Combined scope. Hunt 6 played / 4 solved, Wheel 6 played / 6 solved.
    // Without the split, header sums to "10 solved" while only 6 unique players → impossible.
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [createMockSolvedParticipant(1)],
            totalParticipants: 1,
            totalPlayers: 6,
            totalSolved: 4,
            guestPlayerCount: 5,
          }),
        });
      }
      if (url.includes('/word-wheel/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: [{ ...createMockSolvedParticipant(1), score: 50 }],
            totalParticipants: 6,
            totalSolved: 6,
            guestPlayerCount: 0,
          }),
        });
      }
      if (url.includes('/alltime')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-01-22"
        language="en"
        scope="combined"
        t={mockT}
      />
    );

    // THEN: Header shows split per-mode solved counts, not summed "10 solved"
    await waitFor(() => {
      expect(screen.getByText('6 played')).toBeInTheDocument();
    });

    // Per-mode solved counts visible separately, so it's never solved > played
    expect(screen.getByText(/🎯.*4.*solved/)).toBeInTheDocument();
    expect(screen.getByText(/🎡.*6.*solved/)).toBeInTheDocument();

    // Confirm the bug is gone: no element renders the summed "10 solved"
    expect(screen.queryByText('10 solved')).not.toBeInTheDocument();
  });
});
