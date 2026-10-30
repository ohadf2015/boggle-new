/**
 * First-visit clarity + simplified hub: what the daily is, where to start,
 * each mode once, no jargon chips or empty streak/chest before a first play.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPuzzleNumber } from '@/utils/dailyChallenge/dateUtils';
import { DailyChallengeLanding } from '../DailyChallengeLanding';

const search = vi.hoisted(() => ({ value: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/en/daily',
  useSearchParams: () => new URLSearchParams(search.value),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    language: 'en',
  }),
}));

const auth = vi.hoisted(() => ({ value: { user: null as { id: string } | null } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));

vi.mock('@/utils/dailyChallenge/storage', () => ({ hasPlayedWordWheelToday: vi.fn(() => false) }));
vi.mock('@/lib/connections/dailyClient', () => ({ hasPlayedConnectionsToday: vi.fn(() => false) }));
vi.mock('@/lib/wordTower/dailyBest', () => ({ dailyBestKey: () => 'k', isDailyTowerPlayed: vi.fn(() => false) }));

const huntStatus = vi.hoisted(() => ({ loading: false, hasPlayed: false, hasSolved: null as boolean | null, refresh: vi.fn() }));
vi.mock('@/hooks/useDailyChallengeStatus', () => ({ useDailyChallengeStatus: () => huntStatus }));

const played = vi.hoisted(() => ({
  value: {
    loading: false,
    hasPlayedBefore: false,
    today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false },
    streak: { current: 0, longest: 0 },
    allCompletedDates: [] as string[],
    freezeCount: 0,
    fromServer: false,
    refresh: vi.fn(),
  },
}));
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => played.value }));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({ ref: { current: null }, style: {}, handlers: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn() } }),
}));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: true }),
}));
vi.mock('../landing/LeaderboardTeaser', () => ({ LeaderboardTeaser: () => null }));
vi.mock('../WeeklyChestCard', () => ({ default: () => <div data-testid="weekly-chest-card" /> }));
vi.mock('../WeeklyChestModal', () => ({ default: () => null }));
vi.mock('../streak/PersistentStreakDisplay', () => ({ PersistentStreakDisplay: () => null }));
vi.mock('../ScoreGauntletBanner', () => ({
  ScoreGauntletBanner: ({ challengerName }: { challengerName: string | null }) =>
    challengerName ? <div data-testid="score-gauntlet-banner">{challengerName}</div> : null,
}));

const renderHub = () =>
  render(<DailyChallengeLanding onSelectWordHunt={vi.fn()} onSelectWordWheel={vi.fn()} currentLanguage="en" />);

describe('DailyChallengeLanding — newcomer clarity and a simpler hub', () => {
  beforeEach(() => {
    localStorage.clear();
    search.value = '';
    auth.value = { user: null };
    Object.assign(huntStatus, { loading: false, hasPlayed: false, hasSolved: null });
    huntStatus.refresh.mockClear();
    played.value = {
      ...played.value,
      loading: false,
      hasPlayedBefore: false,
      today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false },
    };
  });

  it('says in one plain line what the daily is', () => {
    renderHub();
    expect(screen.getByTestId('daily-hub-intro')).toHaveTextContent('daily.hub.intro');
  });

  it('given a first visit, points the newcomer at the hero mode, and the tip can be dismissed for good', () => {
    renderHub();
    const tip = screen.getByTestId('daily-newcomer-tip');
    expect(tip).toHaveTextContent('daily.hub.newcomerTip');
    expect(tip).toHaveTextContent('wordWheel.hub.wordWheelQuest');

    fireEvent.click(within(tip).getByRole('button'));
    expect(screen.queryByTestId('daily-newcomer-tip')).not.toBeInTheDocument();

    renderHub();
    expect(screen.queryByTestId('daily-newcomer-tip')).not.toBeInTheDocument();
  });

  it('given the player has finished a daily before, shows no newcomer tip', () => {
    played.value = { ...played.value, hasPlayedBefore: true };
    renderHub();
    expect(screen.queryByTestId('daily-newcomer-tip')).not.toBeInTheDocument();
  });

  it('lists each mode exactly once (hero + rows), with no Required/Now chips', () => {
    renderHub();
    expect(screen.queryByTestId('daily-journey')).not.toBeInTheDocument();
    for (const id of ['word-wheel', 'word-hunt', 'connections', 'word-tower']) {
      const hits = document.querySelectorAll(`[data-mode="${id}"]`);
      expect(hits).toHaveLength(1);
    }
    expect(screen.queryByText('daily.journeyRequired')).not.toBeInTheDocument();
    expect(screen.queryByText('daily.journeyNow')).not.toBeInTheDocument();
    expect(screen.getAllByText('daily.hub.bonusTag')).toHaveLength(2);
  });

  it('given the played status is still loading, does not paint a 0/2 bar that jumps later', () => {
    played.value = { ...played.value, loading: true };
    renderHub();
    expect(screen.getByTestId('daily-missions-header')).not.toHaveTextContent('0/2');
  });

  it('does not re-fetch the Word Hunt status on mount (the hook already did)', () => {
    renderHub();
    expect(huntStatus.refresh).not.toHaveBeenCalled();
  });

  it('links quietly to past puzzles', () => {
    renderHub();
    expect(screen.getByTestId('daily-archive-link')).toHaveAttribute('href', '/en/daily/archive');
  });

  it('given a signed-in newcomer, hides the weekly chest until a first daily is done', () => {
    auth.value = { user: { id: 'u1' } };
    renderHub();
    expect(screen.queryByTestId('weekly-chest-slot')).not.toBeInTheDocument();
  });

  it('given a rival link for an older puzzle, shows no "beat my score" banner', () => {
    search.value = `whName=Ohad&whScore=900&whEmoji=x&whPuzzle=${getPuzzleNumber() - 3}`;
    renderHub();
    expect(screen.queryByTestId('score-gauntlet-banner')).not.toBeInTheDocument();
  });

  it('given a rival link for today\'s puzzle, shows the banner', () => {
    search.value = `whName=Ohad&whScore=900&whEmoji=x&whPuzzle=${getPuzzleNumber()}`;
    renderHub();
    expect(screen.getByTestId('score-gauntlet-banner')).toHaveTextContent('Ohad');
  });
});
