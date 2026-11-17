import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/en/daily',
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, canSeeInWorkModes: false }),
}));

const local = { wheel: false, connections: false, tower: false };
vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: vi.fn(() => local.wheel),
}));
vi.mock('@/lib/connections/dailyClient', () => ({
  hasPlayedConnectionsToday: vi.fn(() => local.connections),
}));
vi.mock('@/lib/wordTower/dailyBest', () => ({
  dailyBestKey: () => 'k',
  isDailyTowerPlayed: vi.fn(() => local.tower),
}));

const huntStatus = { loading: false, hasPlayed: false, hasSolved: null as boolean | null, refresh: vi.fn() };
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => huntStatus,
}));

const played = {
  loading: false,
  hasPlayedBefore: true,
  today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false },
  streak: { current: 6, longest: 6 },
  allCompletedDates: [],
  freezeCount: 0,
  fromServer: true,
  refresh: vi.fn(),
};
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => played,
}));

vi.mock('@/hooks/useStreakView', () => ({
  useStreakView: () => ({
    loading: false, isGuest: false, current: 6, playedToday: false, atRisk: false, freezes: 0,
    week: [], milestone: null, freezeSaved: null, refresh: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn() },
  }),
}));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: true }),
}));

vi.mock('../prize/TodayChestCard', () => ({ TodayChestCard: () => <div data-testid="today-chest" /> }));
vi.mock('@/components/streak/StreakCardConnected', () => ({ StreakCardConnected: () => <div data-testid="streak-card" /> }));
vi.mock('../landing/LeaderboardTeaser', () => ({ LeaderboardTeaser: () => <div data-testid="leaderboard-teaser" /> }));
vi.mock('../WeeklyThemeCard', () => ({ WeeklyThemeCard: () => <div data-testid="weekly-theme" /> }));
vi.mock('../WeeklyChestCard', () => ({ default: () => null }));
vi.mock('../WeeklyChestModal', () => ({ default: () => null }));
vi.mock('../streak/PersistentStreakDisplay', () => ({ PersistentStreakDisplay: () => null }));

function renderHub() {
  return render(
    <LanguageProvider initialLanguage="en">
      <DailyChallengeLanding onSelectWordHunt={vi.fn()} onSelectWordWheel={vi.fn()} currentLanguage="en" />
    </LanguageProvider>,
  );
}

function isBefore(a: Element, b: Element): boolean {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('DailyChallengeLanding — one of everything, in order', () => {
  beforeEach(() => {
    Object.assign(local, { wheel: false, connections: false, tower: false });
    Object.assign(huntStatus, { loading: false, hasPlayed: false, hasSolved: null });
    played.today = { wordHunt: false, wordWheel: false, wordTower: false, connections: false };
  });

  it('Given nothing played, Then the locked chest shows once, after the quests', () => {
    renderHub();
    const chests = screen.getAllByTestId('today-chest');
    expect(chests).toHaveLength(1);
    expect(isBefore(screen.getByTestId('secondary-modes'), chests[0])).toBe(true);
  });

  it('Given Wheel and Hunt are done, Then the ready chest shows once, after the quests (not above the hero)', () => {
    local.wheel = true;
    Object.assign(huntStatus, { hasPlayed: true, hasSolved: true });
    renderHub();
    const chests = screen.getAllByTestId('today-chest');
    expect(chests).toHaveLength(1);
    expect(isBefore(screen.getByTestId('secondary-modes'), chests[0])).toBe(true);
  });

  it('Given every quest is done, Then the only chest is the one inside the all-clear card', () => {
    Object.assign(local, { wheel: true, connections: true, tower: true });
    Object.assign(huntStatus, { hasPlayed: true, hasSolved: true });
    played.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    renderHub();
    const chests = screen.getAllByTestId('today-chest');
    expect(chests).toHaveLength(1);
    expect(screen.getByTestId('daily-all-clear')).toContainElement(chests[0]);
  });

  it('Then the streak card sits under the chest, and today\'s leaderboard comes before the weekly board', () => {
    renderHub();
    const chest = screen.getByTestId('today-chest');
    const streak = screen.getByTestId('streak-card');
    const leaderboard = screen.getByTestId('leaderboard-teaser');
    const weekly = screen.getByTestId('weekly-theme');
    expect(isBefore(chest, streak)).toBe(true);
    expect(isBefore(streak, leaderboard)).toBe(true);
    expect(isBefore(leaderboard, weekly)).toBe(true);
    expect(isBefore(weekly, screen.getByTestId('daily-archive-link'))).toBe(true);
  });
});
