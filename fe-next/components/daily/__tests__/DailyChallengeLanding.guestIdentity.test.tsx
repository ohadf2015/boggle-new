/**
 * The hub leaderboard must identify a guest the same way the daily games record
 * them (the daily fingerprint), otherwise a guest who just solved Word Hunt
 * comes back to the hub and is not marked as themselves on the board.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyChallengeLanding } from '../DailyChallengeLanding';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    hasPlayed: false,
    hasSolved: false,
    loading: false,
    streak: 0,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/dailyChallenge/guestPlayer', () => ({
  getGuestFingerprint: vi.fn(() => Promise.resolve('daily-fp')),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'session-fp'),
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      div: ({ children, className, style, ...props }: React.ComponentProps<'div'>) => (
        <div className={className} style={style} {...props}>{children}</div>
      ),
      // The Connections quest card (public since 2026-09-07) renders m.a.
      a: ({ children, className, style, ...props }: React.ComponentProps<'a'>) => (
        <a className={className} style={style} {...props}>{children}</a>
      ),
      span: ({ children, className, ...props }: React.ComponentProps<'span'>) => (
        <span className={className} {...props}>{children}</span>
      ),
    },
  };
});

const captured: Array<{ currentGuestFingerprint?: string | null }> = [];
vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: (props: { currentGuestFingerprint?: string | null }) => {
    captured.push(props);
    return <div data-testid="tabbed-daily-leaderboard" data-fp={props.currentGuestFingerprint ?? ''} />;
  },
}));

describe('DailyChallengeLanding — guest identity', () => {
  beforeEach(() => {
    captured.length = 0;
  });

  // The hub carries a leaderboard again (owner call, 2026-09-20), reversing the
  // 2026-09-19 redesign that cut it on the grounds that a three-name board reads
  // as a dead product. It is the compact LeaderboardTeaser, NOT the heavyweight
  // TabbedDailyLeaderboard — that one belongs on the results screen, after a
  // score exists. Both halves are asserted so neither can drift back silently.
  //
  // The earlier version of this test queried only `tabbed-daily-leaderboard`,
  // which the hub never rendered in either design, so it passed whether or not a
  // board was present. An assertion that cannot fail is not a guard.
  it('renders the compact leaderboard on the hub, not the tabbed one', async () => {
    render(
      <AuthProvider>
        <LanguageProvider initialLanguage="en">
          <DailyChallengeLanding onSelectWordHunt={vi.fn()} onSelectWordWheel={vi.fn()} currentLanguage="en" />
        </LanguageProvider>
      </AuthProvider>,
    );
    // Wait for the hub itself to settle, so this is not a race that passes before any render.
    await screen.findByTestId('secondary-modes');
    expect(screen.getByTestId('leaderboard-teaser')).toBeInTheDocument();
    expect(screen.queryByTestId('tabbed-daily-leaderboard')).toBeNull();
  });

  it('does not fetch a guest fingerprint the hub has nothing to do with', async () => {
    render(
      <AuthProvider>
        <LanguageProvider initialLanguage="en">
          <DailyChallengeLanding onSelectWordHunt={vi.fn()} onSelectWordWheel={vi.fn()} currentLanguage="en" />
        </LanguageProvider>
      </AuthProvider>,
    );
    await screen.findByTestId('secondary-modes');
    // The fingerprint existed only to highlight a guest's own row on the hub board. With the board
    // gone, resolving it was dead work on every hub visit.
    expect(captured.some((p) => p.currentGuestFingerprint !== undefined)).toBe(false);
  });
});
