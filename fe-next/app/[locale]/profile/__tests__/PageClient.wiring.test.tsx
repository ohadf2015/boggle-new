/**
 * Wiring test: CosmeticCollection mounted in profile collection tab
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', locale: 'en', dir: 'ltr' }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { display_name: 'alice', total_coins: 100 },
    isAuthenticated: true,
    loading: false,
    canPlayRanked: true,
    gamesUntilRanked: 0,
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => k === 'tab' ? 'collection' : null }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: (props: any) => <a {...props} />,
}));

vi.mock('@/hooks/usePlayerCollectibles', () => ({
  usePlayerCollectibles: () => ({ collectibles: [], isLoading: false }),
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/utils/session', () => ({
  getSession: () => null,
}));

vi.mock('@/components/AutoHideHeader', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/profile', () => ({
  ProfileHeader: () => null,
  ProfileXpSection: () => null,
  ProfileStatsGrid: () => null,
  ProfileCoinsSection: () => null,
  ProfileRankedProgress: () => null,
  ProfileAchievements: () => null,
  ProfileCollection: () => <div data-testid="profile-collection" />,
  ProfileBackButtons: () => null,
}));

vi.mock('@/components/profile/ReferralCard', () => ({
  ReferralCard: () => null,
}));

vi.mock('@/components/ugc/CreatorProfileStats', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/utils/creatorRewards', () => ({
  getCreatorStats: () => ({}),
}));

vi.mock('@/components/settings/EmailPreferences', () => ({
  EmailPreferences: () => null,
}));

vi.mock('@/hooks/useCosmetics', () => ({
  useCosmetics: () => ({
    equipCosmetic: vi.fn(),
    purchaseCosmetic: vi.fn(),
    getCosmeticsByCategory: () => [],
  }),
}));

vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

vi.mock('@/components/ui/EnhancedButton', () => ({
  EnhancedButton: (props: any) => <button {...props} />,
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: React.forwardRef((props: any, ref: any) => <div ref={ref} {...props} />),
      button: React.forwardRef((props: any, ref: any) => <button ref={ref} {...props} />),
    },
  };
});

import ProfilePageClient from '../PageClient';

describe('Profile page wiring', () => {
  it('renders CosmeticCollection in collection tab', () => {
    render(<ProfilePageClient />);
    // Click collection tab
    const tabs = screen.getAllByRole('tab');
    const collectionTab = tabs.find(t => t.textContent?.includes('profile.sections.collection'));
    expect(collectionTab).toBeTruthy();
    fireEvent.click(collectionTab!);
    // The collection tab should include cosmetics heading (mobile + desktop = 2)
    const cosmeticHeadings = screen.getAllByText('cosmetics.collection');
    expect(cosmeticHeadings.length).toBeGreaterThan(0);
  });
});
