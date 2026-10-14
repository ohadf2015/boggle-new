/**
 * Hub hero must not render an optimistic default (Word Wheel) that flips once
 * the played-state sources resolve.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

// Heavy, network-bound siblings that are not under test here.
vi.mock('../landing/LeaderboardTeaser', () => ({ LeaderboardTeaser: () => null }));
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


function hubElement() {
  return (
    <LanguageProvider initialLanguage="en">
      <DailyChallengeLanding onSelectWordHunt={vi.fn()} onSelectWordWheel={vi.fn()} currentLanguage="en" />
    </LanguageProvider>
  );
}

describe('DailyChallengeLanding — no optimistic hero (rules/60 Class 1)', () => {
  beforeEach(() => {
    Object.assign(local, { wheel: false, connections: false, tower: false });
    Object.assign(huntStatus, { loading: false, hasPlayed: false, hasSolved: null });
    played.today = { wordHunt: false, wordWheel: false, wordTower: false, connections: false };
    played.loading = false;
  });

  it('given the signed-in played status is still loading, then a neutral skeleton stands in for the hero and journey', () => {
    played.loading = true;
    renderHub();
    expect(screen.getByTestId('hub-status-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId(/^quest-card-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('daily-journey')).not.toBeInTheDocument();
  });

  it('given the status resolves, then the skeleton gives way to the real hero', () => {
    played.loading = true;
    const { rerender } = renderHub();
    played.loading = false;
    played.today = { wordHunt: false, wordWheel: true, wordTower: false, connections: false };
    rerender(hubElement());
    expect(screen.queryByTestId('hub-status-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('quest-card-word-hunt')).toBeInTheDocument();
  });

  it('given the server render (device storage unread), then no Word Wheel hero is painted that could flip later', () => {
    local.wheel = true;
    const html = renderToString(hubElement());
    expect(html).toContain('hub-status-skeleton');
    expect(html).not.toContain('quest-card-word-wheel');
  });

  it('given the played-status hook says Word Hunt was played (another device), then its step is done even before the hunt status knows', () => {
    played.today = { wordHunt: true, wordWheel: true, wordTower: false, connections: false };
    renderHub();
    expect(screen.getByTestId('journey-step-word-hunt')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('quest-card-connections')).toBeInTheDocument();
  });

  it('given a lost Word Hunt known to the hunt status, then the lost label still keeps Word Hunt as the hero', () => {
    played.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    Object.assign(huntStatus, { hasPlayed: true, hasSolved: false });
    renderHub();
    expect(screen.getByTestId('quest-card-word-hunt')).toBeInTheDocument();
  });

  it('does not fade the whole hub in from opacity 0', () => {
    const file = readFileSync(resolve(__dirname, '../DailyChallengeLanding.tsx'), 'utf8');
    const rootReturn = file.slice(file.lastIndexOf('  return ('));
    expect(rootReturn.split('\n').slice(0, 4).join('\n')).not.toMatch(/initial=\{\{ opacity: 0 \}\}/);
  });
});
