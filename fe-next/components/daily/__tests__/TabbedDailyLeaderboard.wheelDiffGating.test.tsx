/**
 * Gating contract: the Word Wheel "see what they found" button on the daily
 * leaderboard must only be clickable AFTER the current player has completed
 * today's wheel. The signal we use is `myWheelWordsFound`: undefined means
 * "player hasn't played yet", an array (even empty) means "played → diff mode
 * is meaningful".
 *
 * This stops the spoiler-leak path where someone opens /daily/word-wheel,
 * peeks at a top scorer's words via the leaderboard rows, then plays the
 * puzzle with knowledge of the right answers.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));
// eslint-disable-next-line @next/next/no-img-element
vi.mock('next/image', () => ({ __esModule: true, default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock('@/components/Avatar', () => ({ __esModule: true, default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PlayerProfileTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/TierBadge', () => ({ TierBadge: () => null }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: [] }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="radio" aria-checked={false} data-value={value}>{children}</button>
  ),
}));
vi.mock('@/utils/avatarConfig', () => ({ AVATARS: [], getAvatarById: () => null }));
vi.mock('../WordWheelWordsModal', () => ({ WordWheelWordsModal: () => null }));
vi.mock('../WordHuntWordsModal', () => ({ WordHuntWordsModal: () => null }));
vi.mock('@/shared/utils', () => ({
  formatDistanceToNow: () => '5 minutes ago',
  getCountryFlag: () => null,
}));
vi.mock('@/utils/rankingStyles', () => ({
  getRankDisplay: (rank: number) => `#${rank}`,
}));

const opponentRow = {
  player_id: 'opp-1',
  guest_fingerprint: null,
  display_name: 'RON',
  avatar_emoji: '🎯',
  avatar_color: '#ff0',
  avatar_image: null,
  country_code: null,
  score: 1188,
  word_count: 24,
  time_seconds: 90,
  completed_at: new Date().toISOString(),
  rank_position: 1,
};

import TabbedDailyLeaderboard from '../TabbedDailyLeaderboard';

const t = (k: string) => k;

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      if (url.includes('/word-wheel/leaderboard/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [opponentRow], totalParticipants: 1, totalSolved: 1, guestPlayerCount: 0 }),
        });
      }
      if (url.includes('/word-wheel/alltime-leaderboard/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [], totalParticipants: 0 }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    }),
  );
});

describe('TabbedDailyLeaderboard — wheel diff gating', () => {
  it('hides "see words" CTA on opponent rows when player has NOT played (myWheelWordsFound undefined)', async () => {
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-05-18"
        language="he"
        scope="word-wheel"
        currentPlayerId="me"
        t={t}
        // myWheelWordsFound deliberately omitted → pre-play state
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('RON')).toBeInTheDocument();
    });
    // The "see words" affordance carries this aria-label
    expect(screen.queryByLabelText('wordWheel.viewWordsYouMissed')).toBeNull();
  });

  it('shows "see words" CTA on opponent rows when player HAS played (myWheelWordsFound is an array)', async () => {
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-05-18"
        language="he"
        scope="word-wheel"
        currentPlayerId="me"
        myWheelWordsFound={[]}
        t={t}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('RON')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('wordWheel.viewWordsYouMissed')).toBeInTheDocument();
  });
});
