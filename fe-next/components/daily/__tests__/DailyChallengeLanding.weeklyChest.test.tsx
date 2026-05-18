/**
 * DailyChallengeLanding weekly-chest wiring
 * Asserts chest slot renders for authed users and is absent for guests.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth — must declare before importing landing
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
}));

import { DailyChallengeLanding } from '../DailyChallengeLanding';

const props = {
  onSelectWordHunt: vi.fn(),
  onSelectWordWheel: vi.fn(),
  currentLanguage: 'en' as const,
};

describe('DailyChallengeLanding weekly chest wiring', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders chest slot when user is authed', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    render(<DailyChallengeLanding {...props} />);
    expect(screen.getByTestId('weekly-chest-slot')).toBeTruthy();
    expect(screen.getByTestId('weekly-chest-card-stub')).toBeTruthy();
  });

  it('does not render chest slot for guest', () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<DailyChallengeLanding {...props} />);
    expect(screen.queryByTestId('weekly-chest-slot')).toBeNull();
  });
});
