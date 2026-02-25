import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'layoutId', 'variants'].includes(k)))}>{children}</div>
  ));
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    motion: { div: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock Avatar component
jest.mock('@/components/Avatar', () => {
  return function MockAvatar() {
    return <div data-testid="avatar" />;
  };
});

// Mock rankingStyles
jest.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
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

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.useFakeTimers({ legacyFakeTimers: false });
  mockFetch.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

// Mock response matches real Supabase view output (snake_case)
const mockLeaderboardResponse = {
  data: [
    { rank_position: 1, display_name: 'Alice', efficiency_score: 350, solved: true, player_id: 'alice-id', guest_fingerprint: null, profile_picture_url: null, avatar_image: null },
    { rank_position: 2, display_name: 'Bob', efficiency_score: 280, solved: true, player_id: null, guest_fingerprint: 'bob-fp', profile_picture_url: null, avatar_image: null },
    { rank_position: 3, display_name: 'Charlie', efficiency_score: 200, solved: false, player_id: 'charlie-id', guest_fingerprint: null, profile_picture_url: null, avatar_image: null },
  ],
  totalPlayers: 25,
};

describe('SurvivalLiveRanks', () => {
  it('renders header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardResponse),
    });

    render(<SurvivalLiveRanks {...baseProps} />);
    expect(screen.getByText('Live Ranks')).toBeInTheDocument();
  });

  it('fetches leaderboard data on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardResponse),
    });

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/daily-challenge/word-hunt/leaderboard/2026-02-07/en?limit=10'
      );
    });
  });

  it('displays player names from leaderboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardResponse),
    });

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('highlights current player by playerId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardResponse),
    });

    render(<SurvivalLiveRanks {...baseProps} currentPlayerId="alice-id" />);

    await waitFor(() => {
      const aliceRow = screen.getByText('Alice').closest('[data-player-row]');
      expect(aliceRow).toHaveClass('ring-2');
    });
  });

  it('highlights current player by guestFingerprint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardResponse),
    });

    render(<SurvivalLiveRanks {...baseProps} currentGuestFingerprint="bob-fp" />);

    await waitFor(() => {
      const bobRow = screen.getByText('Bob').closest('[data-player-row]');
      expect(bobRow).toHaveClass('ring-2');
    });
  });

  it('polls every 30 seconds', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardResponse),
    });

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Advance 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('shows total players count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardResponse),
    });

    render(<SurvivalLiveRanks {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });
});
