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

  it('passes the daily guest fingerprint to the hub leaderboard', async () => {
    render(
      <AuthProvider>
        <LanguageProvider initialLanguage="en">
          <DailyChallengeLanding onSelectWordHunt={vi.fn()} onSelectWordWheel={vi.fn()} currentLanguage="en" />
        </LanguageProvider>
      </AuthProvider>,
    );
    const lb = await screen.findByTestId('tabbed-daily-leaderboard');
    await waitFor(() => expect(lb.getAttribute('data-fp')).toBe('daily-fp'));
    expect(captured.some(p => p.currentGuestFingerprint === 'session-fp')).toBe(false);
  });
});
