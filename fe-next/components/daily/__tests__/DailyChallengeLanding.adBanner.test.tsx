/**
 * DailyChallengeLanding — global bottom banner placement
 * Pins the ad-placement expansion (2026-07): the same reusable banner slot the
 * landing/home dashboard uses is embedded at the STRUCTURAL BOTTOM of the Daily
 * Challenge hub, below the leaderboard teaser, so it never covers a quest card,
 * the weekly chest, or the leaderboard rows.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, isRTL: false, language: 'en', dir: 'ltr' }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasPlayedToday: vi.fn(() => false),
  getWordHuntStatusToday: vi.fn(() => null),
  hasPlayedWordWheelToday: vi.fn(() => false),
}));

vi.mock('@/utils/guestManager', () => ({
  getGuestFingerprint: vi.fn(() => 'fp'),
}));

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({
    loading: false,
    hasPlayed: false,
    hasSolved: false,
    currentStreak: 0,
    refresh: vi.fn(),
  }),
}));

// The banner slot itself is exercised by its own unit tests. Here we only assert
// it is embedded at the bottom of the hub, so render a lightweight stand-in.
vi.mock('@/components/ads/InlineBannerAd', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <div data-testid="hub-bottom-banner" data-variant={String(props.variant)} />
  ),
}));

// Stub heavy/animated children
vi.mock('@/components/daily/WeeklyChestCard', () => ({
  __esModule: true,
  default: () => <div data-testid="weekly-chest-card-stub" />,
}));
vi.mock('@/components/daily/WeeklyChestModal', () => ({
  __esModule: true,
  default: () => <div data-testid="weekly-chest-modal-stub" />,
}));
vi.mock('@/components/daily/DailyInsightStack', () => ({
  __esModule: true,
  default: () => <div data-testid="insight-stack-stub" />,
}));
vi.mock('@/components/daily/TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="leaderboard-stub" />,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/daily',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('framer-motion', () => ({
  __esModule: true,
  m: new Proxy({}, {
    get: (_t: unknown, prop: string) => {
      return ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(prop, rest, children);
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

import { DailyChallengeLanding } from '../DailyChallengeLanding';

const props = {
  onSelectWordHunt: vi.fn(),
  onSelectWordWheel: vi.fn(),
  currentLanguage: 'en' as const,
};

describe('DailyChallengeLanding bottom banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  });

  it('embeds the reusable banner slot with the content variant', () => {
    render(<DailyChallengeLanding {...props} />);
    const banner = screen.getByTestId('hub-bottom-banner');
    expect(banner).toBeTruthy();
    // Non-game hub → content banner unit, never the in-flow game unit.
    expect(banner.getAttribute('data-variant')).toBe('content');
  });

  it('renders the banner AFTER the leaderboard (structural bottom of the hub)', () => {
    render(<DailyChallengeLanding {...props} />);
    const banner = screen.getByTestId('hub-bottom-banner');
    const leaderboard = screen.getByTestId('leaderboard-stub');
    // compareDocumentPosition returns FOLLOWING (4) when `banner` follows `leaderboard`.
    const rel = leaderboard.compareDocumentPosition(banner);
    expect(rel & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
