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

import { AchievementsPageClient } from '../AchievementsPageClient';

beforeEach(() => {
  replace.mockClear();
});

describe('AchievementsPageClient beta gate', () => {
  it('given a beta tester or admin, when opened, then the grid renders', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: true, loading: false, user: { id: 'a' }, profile: { id: 'a' } });

    render(<AchievementsPageClient />);

    expect(screen.getByTestId('achievement-grid')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('given an ordinary player, when opened, then they are sent home and see no grid', () => {
    useAuth.mockReturnValue({ canSeeInWorkModes: false, loading: false, user: null, profile: null });

    render(<AchievementsPageClient />);

    expect(screen.queryByTestId('achievement-grid')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/en');
  });

  it('given a signed-in player whose profile has not landed, when opened, then it waits instead of bouncing', () => {
    useAuth.mockReturnValue({
      canSeeInWorkModes: false,
      loading: false,
      user: { id: 'beta-1' },
      profile: null,
    });

    render(<AchievementsPageClient />);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('achievement-grid')).not.toBeInTheDocument();
  });
});
