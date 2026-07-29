/**
 * DailyLeaderboard Virtualization Tests
 *
 * Verifies that the leaderboard uses virtualized rendering
 * when expanded with many participants.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/image
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [k: string]: unknown }) => (
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

// Mock Avatar
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar-emoji">avatar</div>,
}));

// Mock PlayerProfileTooltip
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock utils
vi.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
  getRankRowClasses: () => '',
  getRankBadgeClasses: () => '',
}));

vi.mock('@/utils/dailyChallenge', () => ({
  getPuzzleNumber: () => 42,
}));

vi.mock('@/shared/utils', () => ({
  formatDistanceToNow: () => '2m ago',
  getCountryFlag: () => '🇺🇸',
}));

vi.mock('@/utils/avatarConfig', () => ({
  getAvatarById: () => null,
}));

// Mock @tanstack/react-virtual to track virtualization
let lastVirtualizerConfig: { count: number; overscan?: number } | null = null;
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (config: { count: number; estimateSize: () => number; overscan?: number }) => {
    lastVirtualizerConfig = { count: config.count, overscan: config.overscan };
    const estimateSize = config.estimateSize();
    // Simulate rendering only the first ~8 items (600px / 72px ≈ 8)
    const visibleCount = Math.min(config.count, 8 + (config.overscan || 0));
    const items = Array.from({ length: visibleCount }, (_, i) => ({
      index: i,
      start: i * estimateSize,
      size: estimateSize,
      key: i,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => config.count * estimateSize,
      measureElement: () => {},
    };
  },
}));

import DailyLeaderboard from '../DailyLeaderboard';

function makeParticipants(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    player_id: `player-${i}`,
    guest_fingerprint: null,
    display_name: `Player ${i}`,
    avatar_emoji: '🎯',
    avatar_color: '#ff0000',
    score: 1000 - i * 10,
    word_count: 20 - i,
    time_seconds: 60 + i,
    completed_at: new Date().toISOString(),
    rank_position: i + 1,
    solved: true,
    attempts_used: 3,
  }));
}

const mockT = (key: string) => key;

describe('DailyLeaderboard virtualization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only a subset of rows when list is expanded with many participants', async () => {
    const participants = makeParticipants(50);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: participants,
        totalParticipants: 50,
        totalAttempts: 50,
        guestPlayerCount: 0,
      }),
    }) as jest.Mock;

    render(
      <DailyLeaderboard
        puzzleDate="2026-03-18"
        language="en"
        t={mockT}
        maxVisible={10}
        gameType="wordHunt"
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Player 0')).toBeInTheDocument();
    });

    // Initially shows maxVisible (10)
    expect(screen.getByText('Player 0')).toBeInTheDocument();
    expect(screen.getByText('Player 9')).toBeInTheDocument();
    // Player 10 should NOT be visible yet (collapsed)
    expect(screen.queryByText('Player 10')).not.toBeInTheDocument();

    // Click "Show More" to expand
    const showMoreBtn = screen.getByText(/daily\.showMore/);
    await userEvent.click(showMoreBtn);

    // After expanding with virtualization, only ~11 rows (8 visible + 3 overscan) should render.
    // The virtualizer mock renders indices 0-10.
    await waitFor(() => {
      expect(screen.getByText('Player 10')).toBeInTheDocument();
    });

    // Verify virtualization was invoked with all 50 participants
    expect(lastVirtualizerConfig).not.toBeNull();
    expect(lastVirtualizerConfig!.count).toBe(50);

    // Player 49 (last) should NOT be rendered due to virtualization
    expect(screen.queryByText('Player 49')).not.toBeInTheDocument();
  });

  it('renders all rows when list is small (no virtualization needed)', async () => {
    const participants = makeParticipants(5);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: participants,
        totalParticipants: 5,
        totalAttempts: 5,
        guestPlayerCount: 0,
      }),
    }) as jest.Mock;

    render(
      <DailyLeaderboard
        puzzleDate="2026-03-18"
        language="en"
        t={mockT}
        maxVisible={10}
        gameType="wordHunt"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Player 0')).toBeInTheDocument();
    });

    // All 5 should be visible
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Player ${i}`)).toBeInTheDocument();
    }
  });
});
