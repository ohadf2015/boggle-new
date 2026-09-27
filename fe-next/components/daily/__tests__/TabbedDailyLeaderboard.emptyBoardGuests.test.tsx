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
  useReducedMotion: () => false,
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


import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';

// "Be the first today!" was shown on a GLOBAL board whenever the ranked list came back empty.
// Guests ARE recorded (backend/routes/dailyChallenge/wordHuntRoutes.ts:208-212 writes their row
// under guest_fingerprint) but the leaderboard read filters `.not('player_id','is',null)` (:524),
// so on a guest-heavy day the server has counted solvers and still hands the client an empty list.
// It even ships the number as guestPlayerCount (:589-596). Telling a player nobody has solved yet,
// while knowing five people have, is the bug — not the empty list itself.
describe('TabbedDailyLeaderboard - empty ranked board with guest solvers', () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'wordHunt.leaderboard.title': 'Leaderboard',
      'wordHunt.leaderboard.played': 'played',
      'wordHunt.leaderboard.solved': 'solved',
      'wordHunt.leaderboard.today': 'Today',
      'wordHunt.leaderboard.allTime': 'All Time',
      'wordHunt.leaderboard.noPlayersYet': 'No players yet',
      'daily.playerSingular': 'player',
      'daily.playersPlural': 'players',
      'daily.guestSingular': 'guest',
      'daily.guestsPlural': 'guests',
      'daily.beFirstToPlay': 'Be the first today!',
      'daily.guestsSolvedSignIn': '{count} solved today — sign in to appear on the leaderboard',
      'common.retry': 'Retry',
    };
    return translations[key] || key;
  };

  const mockLeaderboard = (body: Record<string, unknown>) => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      // Answer word-hunt only. The default scope merges BOTH modes, so returning the same body
      // for each endpoint would double every count and quietly make the assertion meaningless.
      if (url.includes('/word-hunt/leaderboard')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      }
      if (url.includes('/word-wheel/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [], totalParticipants: 0, totalSolved: 0, guestPlayerCount: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [], totalParticipants: 0 }) });
    });
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  it('tells the player how many solved instead of claiming nobody has', async () => {
    mockLeaderboard({ data: [], totalParticipants: 0, totalPlayers: 6, totalSolved: 5, guestPlayerCount: 5 });

    render(<TabbedDailyLeaderboard puzzleDate="2026-01-22" language="en" t={mockT} />);

    await waitFor(() => {
      expect(
        screen.getByText('5 solved today — sign in to appear on the leaderboard'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Be the first today!')).not.toBeInTheDocument();
  });

  it('still says be-the-first when nobody has actually solved', async () => {
    mockLeaderboard({ data: [], totalParticipants: 0, totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0 });

    render(<TabbedDailyLeaderboard puzzleDate="2026-01-22" language="en" t={mockT} />);

    await waitFor(() => {
      expect(screen.getByText('Be the first today!')).toBeInTheDocument();
    });
  });
});
