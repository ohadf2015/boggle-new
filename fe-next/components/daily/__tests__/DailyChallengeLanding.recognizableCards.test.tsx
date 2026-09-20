import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Two complaints this covers:
 *
 * 1. "each card of daily challenge should stay recognizable" — Connections was
 *    drawn by the shared QuestCard, whose COLOR_CONFIGS had no `purple` entry,
 *    so it fell through to `cyan` and rendered identically to Word Tower. Its
 *    hero art also fell back to the WORD HUNT mascot even though
 *    `/daily/connections-mascot.jpg` ships in the repo.
 * 2. "the daily challenge homepage should have a leaderboard" — the hub board
 *    was removed in the 2026-09-19 redesign. Restoring it is now the deliberate
 *    call, so these assert its presence.
 */

// Word Hunt / Wheel / Tower all played → pickPrimaryMode returns 'connections',
// which puts the Connections card in the hero slot where the bug is visible.
vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    hasPlayed: true,
    hasSolved: true,
    loading: false,
    streak: 3,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => ({
    today: { wordHunt: true, wordWheel: true, wordTower: true, connections: false },
    streak: { current: 3, longest: 5 },
    allCompletedDates: [],
    freezeCount: 0,
    loading: false,
    fromServer: true,
    freezeApplied: undefined,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: vi.fn(() => true),
}));

vi.mock('@/lib/wordTower/dailyBest', () => ({
  dailyBestKey: () => 'wt-daily-best',
  isDailyTowerPlayed: () => true,
}));

vi.mock('@/lib/connections/dailyClient', () => ({
  hasPlayedConnectionsToday: () => false,
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'test-fingerprint'),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn(),
      onTouchStart: vi.fn(), onTouchMove: vi.fn(), onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: true, prefersReducedMotion: false }),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: ({ children, className, style, ...props }: React.ComponentProps<'div'>) => (
        <div className={className} style={style} {...props}>{children}</div>
      ),
      a: ({ children, className, style, ...props }: React.ComponentProps<'a'>) => (
        <a className={className} style={style} {...props}>{children}</a>
      ),
      span: ({ children, className, ...props }: React.ComponentProps<'span'>) => (
        <span className={className} {...props}>{children}</span>
      ),
    },
  };
});

function renderHub() {
  return render(
    <AuthProvider>
      <LanguageProvider initialLanguage="en">
        <DailyChallengeLanding
          onSelectWordHunt={vi.fn()}
          onSelectWordWheel={vi.fn()}
          currentLanguage="en"
        />
      </LanguageProvider>
    </AuthProvider>,
  );
}

describe('DailyChallengeLanding — recognizable cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) }),
    ) as unknown as typeof fetch;
  });

  it('gives every secondary row its own mode artwork', async () => {
    renderHub();
    await screen.findByTestId('secondary-modes');
    const arts = document.querySelectorAll('[data-testid^="mode-row-art-"]');
    expect(arts.length).toBeGreaterThanOrEqual(3);
    const sources = Array.from(arts).map((a) => a.getAttribute('data-art-url'));
    // Every row shows a DIFFERENT mascot — that is the whole point.
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('never falls back to the Word Hunt mascot for a different mode', async () => {
    renderHub();
    await screen.findByTestId('secondary-modes');
    const huntArt = Array.from(
      document.querySelectorAll('[data-art-url="/daily/word-hunt-mascot.jpg"]'),
    );
    // Word Hunt is a secondary row here, so exactly one element may use its art.
    expect(huntArt.length).toBeLessThanOrEqual(1);
  });

  it('renders a leaderboard on the hub', async () => {
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
    });
  });

  it('no longer needs to name its scope, now that the board covers all four modes', async () => {
    // WAS: 'names which modes the hub board actually sums, rather than implying
    // all four'. That scope line existed because the board summed Word Hunt +
    // Word Wheel while the hub showed four cards, so the header had to admit
    // it. The board now merges all four server-side, which makes the caveat
    // wrong rather than merely redundant.
    renderHub();
    const board = await screen.findByTestId('leaderboard-teaser');
    expect(board.querySelector('[data-testid="leaderboard-scope"]')).toBeNull();
  });
});
