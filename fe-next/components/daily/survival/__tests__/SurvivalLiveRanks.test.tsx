import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'layoutId', 'variants'].includes(k)))}>{children}</div>
  ));
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    m: { div: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock Avatar component
vi.mock('@/components/Avatar', () => {
  const MockAvatar = () => {
    return <div data-testid="avatar" />;
  };
  return { default: MockAvatar };
});

// Mock rankingStyles
vi.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
}));

// Mock AdaptiveMotion to avoid useDevicePerformance dependency
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock PlayerProfileTooltip to avoid LanguageContext dependency
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock LanguageContext for transitive dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { SurvivalLiveRanks, type SurvivalLiveRanksProps } from '../SurvivalLiveRanks';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'wordHunt.desktop.liveRanks': 'Live Ranks',
  };
  return translations[key] || key;
};

const baseProps: SurvivalLiveRanksProps = {
  puzzleDate: '2026-02-07',
  language: 'en',
  currentPlayerId: null,
  currentGuestFingerprint: null,
  t: mockT,
};

// Mock response matches real Supabase view output (snake_case)
const mockLeaderboardResponse = {
  data: [
    { rank_position: 1, display_name: 'Alice', efficiency_score: 350, solved: true, player_id: 'alice-id', guest_fingerprint: null, avatar_image: null},
    { rank_position: 2, display_name: 'Bob', efficiency_score: 280, solved: true, player_id: null, guest_fingerprint: 'bob-fp', avatar_image: null},
    { rank_position: 3, display_name: 'Charlie', efficiency_score: 200, solved: false, player_id: 'charlie-id', guest_fingerprint: null, avatar_image: null},
  ],
  totalPlayers: 25,
};

const LEADERBOARD_URL = '/api/daily-challenge/word-hunt/leaderboard/2026-02-07/en';

describe('SurvivalLiveRanks', () => {
  it('renders header', async () => {
    render(<SurvivalLiveRanks {...baseProps} />);
    expect(screen.getByText('Live Ranks')).toBeInTheDocument();
  });

  it('fetches leaderboard data on mount', async () => {
    let fetchCalled = false;
    server.use(
      http.get(`*${LEADERBOARD_URL}*`, () => {
        fetchCalled = true;
        return HttpResponse.json(mockLeaderboardResponse);
      })
    );

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(fetchCalled).toBe(true);
    });
  });

  it('displays player names from leaderboard', async () => {
    server.use(
      http.get(`*${LEADERBOARD_URL}*`, () => HttpResponse.json(mockLeaderboardResponse))
    );

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('highlights current player by playerId', async () => {
    server.use(
      http.get(`*${LEADERBOARD_URL}*`, () => HttpResponse.json(mockLeaderboardResponse))
    );

    render(<SurvivalLiveRanks {...baseProps} currentPlayerId="alice-id" />);

    await waitFor(() => {
      const aliceRow = screen.getByText('Alice').closest('[data-player-row]');
      expect(aliceRow).toHaveClass('ring-2');
    });
  });

  it('highlights current player by guestFingerprint', async () => {
    server.use(
      http.get(`*${LEADERBOARD_URL}*`, () => HttpResponse.json(mockLeaderboardResponse))
    );

    render(<SurvivalLiveRanks {...baseProps} currentGuestFingerprint="bob-fp" />);

    await waitFor(() => {
      const bobRow = screen.getByText('Bob').closest('[data-player-row]');
      expect(bobRow).toHaveClass('ring-2');
    });
  });

  it('polls every 30 seconds', async () => {
    vi.useFakeTimers();
    let callCount = 0;
    server.use(
      http.get(`*${LEADERBOARD_URL}*`, () => {
        callCount++;
        return HttpResponse.json(mockLeaderboardResponse);
      })
    );

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(1);
    });

    const countAfterMount = callCount;

    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(callCount).toBeGreaterThan(countAfterMount);
    });
    vi.useRealTimers();
  });

  it('shows total players count', async () => {
    server.use(
      http.get(`*${LEADERBOARD_URL}*`, () => HttpResponse.json(mockLeaderboardResponse))
    );

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });
});
