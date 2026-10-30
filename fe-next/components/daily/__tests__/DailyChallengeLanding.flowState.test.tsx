/**
 * Hub state must reflect what the player has actually done today, from every
 * source, and must never bounce backwards or offer a finished day as "START".
 */
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

describe('DailyChallengeLanding — flow state', () => {
  beforeEach(() => {
    Object.assign(local, { wheel: false, connections: false, tower: false });
    Object.assign(huntStatus, { loading: false, hasPlayed: false, hasSolved: null });
    played.today = { wordHunt: false, wordWheel: false, wordTower: false, connections: false };
    played.loading = false;
  });

  it('given Wheel and Hunt are done, when the hunt status re-fetches (tab return), then the hero stays on Connections instead of bouncing back to Word Hunt', () => {
    local.wheel = true;
    Object.assign(huntStatus, { loading: true, hasPlayed: true, hasSolved: true });
    renderHub();
    expect(screen.getByTestId('quest-card-connections')).toBeInTheDocument();
    expect(screen.queryByTestId('quest-card-word-hunt')).not.toBeInTheDocument();
  });

  it('given the server says Connections was played today on another device, then the hub shows it done and moves on to Word Tower', () => {
    local.wheel = true;
    Object.assign(huntStatus, { hasPlayed: true, hasSolved: true });
    played.today = { wordHunt: true, wordWheel: true, wordTower: false, connections: true };
    renderHub();
    expect(document.querySelector('[data-mode="connections"]')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('quest-card-word-tower')).toBeInTheDocument();
  });

  it('given the server says Word Tower was played today, then the Word Tower step is done', () => {
    played.today = { wordHunt: false, wordWheel: false, wordTower: true, connections: false };
    renderHub();
    expect(document.querySelector('[data-mode="word-tower"]')).toHaveAttribute('data-state', 'done');
  });

  describe('given every quest is played today', () => {
    beforeEach(() => {
      Object.assign(local, { wheel: true, connections: true, tower: true });
      Object.assign(huntStatus, { hasPlayed: true, hasSolved: true });
      played.today = { wordHunt: true, wordWheel: true, wordTower: true, connections: true };
    });

    it('closes the day with an all-clear card instead of a START QUEST hero on a finished game', () => {
      renderHub();
      expect(screen.getByTestId('daily-all-clear')).toBeInTheDocument();
      expect(screen.queryByTestId(/^quest-card-/)).not.toBeInTheDocument();
      expect(screen.queryByText(/start quest/i)).not.toBeInTheDocument();
    });

    it('does not also show the "bonus rounds are optional" note', () => {
      renderHub();
      expect(screen.queryByTestId('required-done-note')).not.toBeInTheDocument();
    });

    it('shows the streak in resolved copy (no raw keys or placeholders)', () => {
      renderHub();
      const card = screen.getByTestId('daily-all-clear');
      expect(card.textContent).toContain('6');
      expect(card.textContent).not.toMatch(/daily\.[a-zA-Z]/);
      expect(card.textContent).not.toMatch(/[{}]/);
    });

    it('keeps every finished quest reachable from the list (results, replay)', () => {
      renderHub();
      const rows = screen.getByTestId('secondary-modes').querySelectorAll('button');
      expect(rows).toHaveLength(4);
      rows.forEach((row) => expect(row).not.toBeDisabled());
    });
  });

  it('given a lost Word Hunt and everything else done, keeps Word Hunt as the hero for the retry', () => {
    Object.assign(local, { wheel: true, connections: true, tower: true });
    Object.assign(huntStatus, { hasPlayed: true, hasSolved: false });
    renderHub();
    expect(screen.getByTestId('quest-card-word-hunt')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-all-clear')).not.toBeInTheDocument();
  });
});
