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

describe('TabbedDailyLeaderboard — tab switch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [], leaderboard: [], success: true, totalPlayers: 0, totalSolved: 0, guestPlayerCount: 0,
        }),
      }),
    );
  });

  it('puts Today and Friends up front and tucks the other boards behind More', async () => {
    const { default: TabbedDailyLeaderboard } = await import('../TabbedDailyLeaderboard');
    render(<TabbedDailyLeaderboard puzzleDate="2026-09-14" language="en" t={mockT} />);

    expect(await screen.findByTestId('leaderboard-more-tabs')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.queryByTestId('connections-tab-button')).toBeNull();

    fireEvent.click(screen.getByTestId('leaderboard-more-tabs'));
    fireEvent.click(await screen.findByTestId('connections-tab-button'));
    expect(await screen.findByTestId('connections-daily-tab-empty')).toBeInTheDocument();
  });
});
