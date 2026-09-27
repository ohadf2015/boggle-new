/**
 * Integration: the shared TabbedDailyLeaderboard exposes a Connections tab, and
 * opening it surfaces today's Connections (Word Bridge) daily scores on the
 * SAME leaderboard surface Word Hunt / Word Wheel use (slice 3 gate, Ohad
 * directive 2026-09-13) — fetched from the connections daily endpoint, not the
 * hunt/wheel ones.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-stub" />,
}));

vi.mock('@/shared/utils', () => ({
  formatDistanceToNow: () => '5 minutes ago',
  getCountryFlag: () => null,
}));

vi.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
}));

vi.mock('@/utils/dailyChallenge', () => ({
  getPuzzleNumber: () => 42,
}));

vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ friends: [] }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, arg?: unknown) => {
      let s = k;
      if (arg && typeof arg === 'object') {
        for (const [key, val] of Object.entries(arg as Record<string, unknown>)) {
          s = s.replace(`{${key}}`, String(val));
        }
      }
      return s;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

const mockT = (key: string) => key;

describe('TabbedDailyLeaderboard — Connections tab', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/connections/daily/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            puzzleDate: '2026-09-14',
            totalPlayers: 1,
            ownRank: 1,
            leaderboard: [
              {
                rank_position: 1, display_name: 'BridgeBuilder', avatar_emoji: '🦊',
                avatar_color: '#fff', avatar_image: null, custom_avatar: null,
                score: 500, time_taken_seconds: 95, streak: 4, puzzles_solved: 5,
                language: 'en',
              },
            ],
          }),
        });
      }
      // hunt / wheel / alltime / seasons — all empty
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0 }),
      });
    });
  });

  it('renders a Connections tab that surfaces today\'s connections daily score', async () => {
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');

    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-09-14"
        language="en"
        t={mockT}
      />
    );

    const tabButton = await screen.findByTestId('connections-tab-button');
    fireEvent.click(tabButton);

    // The connections daily score is visible on the shared leaderboard surface…
    expect(await screen.findByTestId('connections-daily-tab')).toBeInTheDocument();
    expect(screen.getByText('BridgeBuilder')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();

    // …and it came from the connections daily endpoint for this puzzle date.
    const calls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(calls.some((u) => u.includes('/api/connections/daily/2026-09-14/leaderboard'))).toBe(true);
  });
});
