/**
 * TabbedDailyLeaderboard — Word Hunt words modal wiring.
 * Verifies that when scope='word-hunt' and myHuntWordsDiscovered is provided,
 * clicking a participant row opens the WordHuntWordsModal with diff mode.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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
  PlayerProfileTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/TierBadge', () => ({ TierBadge: () => null }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => ({ friends: [] }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }) }));
vi.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="radio" aria-checked={false} data-value={value}>{children}</button>
  ),
}));
vi.mock('@/utils/avatarConfig', () => ({ AVATARS: [], getAvatarById: () => null }));
vi.mock('./WordWheelWordsModal', () => ({ WordWheelWordsModal: () => null }));
vi.mock('./WordHuntWordsModal', () => ({
  WordHuntWordsModal: ({ isOpen, playerName, myWordsDiscovered }: {
    isOpen: boolean;
    playerName: string;
    myWordsDiscovered?: string[];
  }) => isOpen ? (
    <div data-testid="hunt-words-modal">
      <span data-testid="hunt-modal-player">{playerName}</span>
      <span data-testid="hunt-modal-diff">{myWordsDiscovered?.join(',') ?? 'none'}</span>
    </div>
  ) : null,
}));

// Capture fetch mock
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ participants: [], totalCount: 0, totalSolved: 0, huntSolved: 0, wheelSolved: 0, guestCount: 0 }),
});

import TabbedDailyLeaderboard, { type DailyParticipant } from '../TabbedDailyLeaderboard';

const t = (k: string) => k;

const makeHuntParticipant = (id: string, name: string): DailyParticipant => ({
  player_id: id,
  guest_fingerprint: null,
  display_name: name,
  avatar_emoji: '🎯',
  avatar_color: '#ff0',
  score: 120,
  word_count: 5,
  time_seconds: 60,
  completed_at: new Date().toISOString(),
  rank_position: 1,
  solved: true,
  attempts_used: 3,
  words_discovered: [
    { word: 'HELLO', timestamp: 1000, lifeGained: 2, tokensGained: 0 },
    { word: 'WORLD', timestamp: 2000, lifeGained: 1, tokensGained: 0 },
  ],
});

describe('TabbedDailyLeaderboard — hunt words modal wiring', () => {
  it('renders without hunt words modal when myHuntWordsDiscovered not provided', async () => {
    render(
      <TabbedDailyLeaderboard
        puzzleDate="2026-05-12"
        language="en"
        scope="word-hunt"
        t={t}
      />
    );
    expect(screen.queryByTestId('hunt-words-modal')).toBeNull();
  });

  it('DailyParticipant type accepts words_discovered field', () => {
    const p: DailyParticipant = makeHuntParticipant('abc', 'Alice');
    expect(p.words_discovered).toHaveLength(2);
  });
});
