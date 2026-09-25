import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const replace = vi.fn();
const useAuth = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/components/adventure/achievements', () => ({
  AchievementGrid: () => <div data-testid="achievement-grid" />,
}));
vi.mock('@/components/achievements/UnifiedAchievementModal', () => ({
  UnifiedAchievementModal: () => null,
}));
vi.mock('@/hooks/useAdventureAchievements', () => ({
  useAdventureAchievements: () => ({ achievementCounts: {} }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));
vi.mock('@/components/adventure/AdventureGuestGate', () => ({
  AdventureGuestGate: ({ surface }: any) => (
    <div data-testid={`guest-gate-${surface}`} />
  ),
}));

import { AchievementsPageClient } from '../AchievementsPageClient';

beforeEach(() => {
  replace.mockClear();
});

describe('AchievementsPageClient gate', () => {
  it('given an ordinary guest player, when opened, then the guest gate renders for achievements', () => {
    useAuth.mockReturnValue({
      loading: false,
      user: null,
      profile: null,
      isAuthenticated: false,
      canSeeInWorkModes: false,
    });

    render(<AchievementsPageClient />);

    expect(screen.getByTestId('guest-gate-achievements')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given auth still resolving, when opened, then it waits instead of rendering', () => {
    useAuth.mockReturnValue({
      loading: true,
      user: null,
      profile: null,
      canSeeInWorkModes: false,
    });

    render(<AchievementsPageClient />);

    expect(screen.queryByTestId('achievement-grid')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given a signed-in player whose profile has not landed, when opened, then it waits instead of rendering', () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { id: 'player-1' },
      profile: null,
      canSeeInWorkModes: false,
      isAuthenticated: false,
    });

    render(<AchievementsPageClient />);

    expect(screen.queryByTestId('achievement-grid')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given a signed-in beta tester, when opened, then the achievement grid is displayed', () => {
    useAuth.mockReturnValue({
      canSeeInWorkModes: true,
      loading: false,
      user: { id: 'u1' },
      profile: { id: 'p1', is_beta_tester: true },
      isAuthenticated: true,
    });

    render(<AchievementsPageClient />);

    expect(screen.getByTestId('achievement-grid')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given a signed-in ordinary player who is not beta/admin, when opened, then they see the achievement grid (Adventure is public)', () => {
    useAuth.mockReturnValue({
      canSeeInWorkModes: false,
      loading: false,
      user: { id: 'u1' },
      profile: { id: 'p1', is_beta_tester: false },
      isAuthenticated: true,
    });

    render(<AchievementsPageClient />);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId('achievement-grid')).toBeInTheDocument();
  });

  it('given dev mode with a non-beta player, when opened, then the achievement grid is displayed (dev bypass)', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    useAuth.mockReturnValue({
      canSeeInWorkModes: false,
      loading: false,
      user: { id: 'u1' },
      profile: { id: 'p1', is_beta_tester: false },
      isAuthenticated: true,
    });

    render(<AchievementsPageClient />);

    expect(screen.getByTestId('achievement-grid')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    process.env.NODE_ENV = origEnv;
  });
});
