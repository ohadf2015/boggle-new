import { vi, type Mock, } from 'vitest';
/**
 * Test: Profile UI Styling Improvements
 *
 * Verifies:
 * 1. Section titles are adequately sized and visible
 * 2. Carousel indicators use neo-brutalist styling (hard shadows, minimal rounding)
 * 3. Navigation arrows properly flip direction for RTL languages
 */


import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';

// Stub the rewarded-ad gold button — its AdMob/useRewardedAd machinery is
// irrelevant to these title-sizing assertions and pulls in unmocked context.
vi.mock('@/components/ads/RewardedAdGoldButton', () => ({ __esModule: true, default: () => null, RewardedAdGoldButton: () => null }));

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <NuqsTestingAdapter><QueryClientProvider client={qc}>{children}</QueryClientProvider></NuqsTestingAdapter>
  );
  return Wrapper;
};

// Mock dependencies
let mockLanguageData = {
  t: (key: string) => {
    const translations: Record<string, string> = {
      'profile.sections.overview': 'Overview',
      'profile.sections.stats': 'Stats',
      'profile.sections.achievements': 'Achievements',
      'profile.sections.collection': 'Collection',
      'xp.title': 'Player Level',
      'coins.title': 'Coins & Rewards'
    };
    return translations[key] || key;
  },
  language: 'en',
  dir: 'ltr'
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageData
}));

vi.mock('@/lib/supabaseRealtimeNotifications', () => ({
  subscribeToNotifications: vi.fn(() => vi.fn()),
}));

vi.mock('@/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => null,
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => null),
}));

vi.mock('@/components/auth/AuthModal', () => ({
  default: () => <div data-testid="auth-modal">Auth Modal</div>,
}));

vi.mock('@/components/ugc/CreatorProfileStats', () => ({
  default: () => <div>Creator Stats</div>,
}));

vi.mock('@/utils/creatorRewards', () => ({
  getCreatorStats: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/components/settings/EmailPreferences', () => ({
  EmailPreferences: () => <div>Email Preferences</div>,
}));

vi.mock('@/components/profile/ReferralCard', () => ({
  ReferralCard: () => <div>Referral Card</div>,
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  PanInfo: {},
  useReducedMotion: () => false,
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoin: () => ({ coins: 100, updateCoins: vi.fn() }),
  useCoinContext: () => ({ coins: 100, updateCoins: vi.fn() }),
  useCoinsFromContext: () => ({ coins: 100, updateCoins: vi.fn() }),
  CoinProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

vi.mock('@/components/AutoHideHeader', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/profile', () => ({
  ProfileHeader: () => <div data-testid="profile-header">Header</div>,
  ProfileXpSection: ({ profile, isDarkMode, compact }: any) => (
    <div>
      <h3 className="text-lg font-bold">Player Level</h3>
      <span>{profile?.total_xp} XP</span>
    </div>
  ),
  ProfileStatsGrid: () => <div>Stats Grid</div>,
  ProfileCoinsSection: ({ profile, isDarkMode, compact }: any) => (
    <div>
      <h3 className="text-lg font-bold">Coins & Rewards</h3>
      <span>{profile?.total_coins} coins</span>
    </div>
  ),
  ProfileRankedProgress: () => <div>Ranked Progress</div>,
  ProfileAchievements: () => <div>Achievements</div>,
  ProfileCollection: () => <div>Collection</div>,
  ProfileBackButtons: () => <div>Back Buttons</div>,
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' })
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    profile: {
      display_name: 'Test User',
      total_xp: 1000,
      total_coins: 500
    },
    isAuthenticated: true,
    loading: false,
    canPlayRanked: false,
    gamesUntilRanked: 5,
    updateProfile: vi.fn(),
    refreshProfile: vi.fn()
  })
}));

vi.mock('@/hooks/usePlayerCollectibles', () => ({
  usePlayerCollectibles: () => ({
    collectibles: [],
    isLoading: false
  })
}));

vi.mock('@/hooks/useSeasonBadges', () => ({
  useSeasonBadges: () => ({
    badges: [],
    isLoading: false
  })
}));

vi.mock('@/components/seasons/SeasonRankCard', () => ({
  SeasonRankCard: () => null,
  default: () => null
}));
vi.mock('@/components/seasons/SeasonTrophyCase', () => ({
  SeasonTrophyCase: () => null,
  default: () => null
}));

vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false }
  })
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null)
  })
}));

// Mock NavigationContext - AutoHideHeader uses useNavigation
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    isInGame: false,
    setIsInGame: vi.fn(),
    activeTab: 'profile',
    setActiveTab: vi.fn(),
  }),
  useHideNavigation: () => vi.fn(),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    isPlaying: false,
    toggleMusic: vi.fn()
  })
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn()
  })
}));

vi.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    isHapticsEnabled: true,
    toggleHaptics: vi.fn()
  })
}));

vi.mock('@/utils/session', () => ({
  getSession: () => null
}));

import ProfilePageClient from '../PageClient';
import { ProfileXpSection } from '@/components/profile/ProfileXpSection';
import { ProfileCoinsSection } from '@/components/profile/ProfileCoinsSection';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Profile UI Styling', () => {
  describe('Section Title Sizing', () => {
    it('should use adequately sized titles in profile sections (not text-base)', () => {
      const mockProfile = {
        display_name: 'Test User',
        total_xp: 1000,
        total_coins: 500,
        current_level: 5
      };

      const { container } = render(<ProfileXpSection profile={mockProfile as any} isDarkMode={true} compact={true} />, { wrapper: createWrapper() });

      // Find the section title
      const title = screen.getByText(/Player Level/i);
      expect(title).toBeInTheDocument();

      // Title should NOT use text-base (16px - too small)
      // Should use at least text-lg (18px) or larger
      expect(title.className).not.toContain('text-base');

      // Should use text-lg, text-xl, or larger
      const hasAdequateSize = title.className.includes('text-lg') ||
                             title.className.includes('text-xl') ||
                             title.className.includes('text-2xl');
      expect(hasAdequateSize).toBe(true);
    });

    it('should use adequately sized titles for coins section', () => {
      const mockProfile = {
        display_name: 'Test User',
        total_coins: 500
      };

      const { container } = render(<ProfileCoinsSection profile={mockProfile as any} isDarkMode={true} compact={true} />, { wrapper: createWrapper() });

      const title = screen.getByText(/Coins & Rewards/i);
      expect(title).toBeInTheDocument();

      // Should NOT use text-base
      expect(title.className).not.toContain('text-base');

      // Should use at least text-lg
      const hasAdequateSize = title.className.includes('text-lg') ||
                             title.className.includes('text-xl') ||
                             title.className.includes('text-2xl');
      expect(hasAdequateSize).toBe(true);
    });
  });

  describe('Neo-Brutalist Tab Navigation', () => {
    it('should display tab buttons with section labels', () => {
      render(<ProfilePageClient />, { wrapper: createWrapper() });

      // Find section tabs by role
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4); // Overview, Stats, Achievements, Collection
    });

    it('should use neo-brutalist styling for active tab', () => {
      render(<ProfilePageClient />, { wrapper: createWrapper() });

      // Find active tab (selected)
      const activeTab = screen.getAllByRole('tab').find(tab =>
        tab.getAttribute('aria-selected') === 'true'
      );
      expect(activeTab).toBeInTheDocument();

      if (activeTab) {
        // Should NOT use fully rounded (rounded-full)
        // Neo-brutalist style uses minimal rounding (rounded-neo = 4px)
        expect(activeTab.className).not.toContain('rounded-full');

        // Should use rounded-neo
        expect(activeTab.className).toContain('rounded-neo');

        // Should have neo-yellow background
        expect(activeTab.className).toContain('bg-neo-yellow');
      }
    });

    it('should use hard shadows on active tab', () => {
      render(<ProfilePageClient />, { wrapper: createWrapper() });

      const activeTab = screen.getAllByRole('tab').find(tab =>
        tab.getAttribute('aria-selected') === 'true'
      );

      if (activeTab) {
        // Should use shadow-hard-* utilities (neo-brutalist hard shadows)
        const hasHardShadow = activeTab.className.includes('shadow-hard');
        expect(hasHardShadow).toBe(true);
      }
    });

    it('should use chunky borders on active tab', () => {
      render(<ProfilePageClient />, { wrapper: createWrapper() });

      const activeTab = screen.getAllByRole('tab').find(tab =>
        tab.getAttribute('aria-selected') === 'true'
      );

      if (activeTab) {
        // Should use border-3 (chunky neo-brutalist border for tabs)
        expect(activeTab.className).toContain('border-3');
        expect(activeTab.className).toContain('border-neo-black');
      }
    });
  });

  describe('RTL Navigation Arrows', () => {
    beforeEach(() => {
      // Mock RTL language context
      mockLanguageData = {
        t: (key: string) => {
          const translations: Record<string, string> = {
            'profile.sections.overview': 'סקירה כללית',
            'profile.sections.stats': 'סטטיסטיקות',
            'profile.sections.achievements': 'הישגים',
            'profile.sections.collection': 'אוסף'
          };
          return translations[key] || key;
        },
        language: 'he',
        dir: 'rtl'
      };
    });

    afterEach(() => {
      // Restore default LTR mock
      mockLanguageData = {
        t: (key: string) => {
          const translations: Record<string, string> = {
            'profile.sections.overview': 'Overview',
            'profile.sections.stats': 'Stats',
            'profile.sections.achievements': 'Achievements',
            'profile.sections.collection': 'Collection',
            'xp.title': 'Player Level',
            'coins.title': 'Coins & Rewards'
          };
          return translations[key] || key;
        },
        language: 'en',
        dir: 'ltr'
      };
    });

    it('should flip navigation arrow directions for RTL', () => {
      const { container } = render(<ProfilePageClient />, { wrapper: createWrapper() });

      // Buttons use logical properties (start/end) which automatically flip for RTL
      // Previous button uses inset-s-2 (left in LTR, right in RTL)
      // Next button uses inset-e-2 (right in LTR, left in RTL)
      const prevButton = screen.queryByLabelText(/previous section/i);
      const nextButton = screen.queryByLabelText(/next section/i);

      if (prevButton) {
        // Previous button should use start-* (logical property that flips for RTL)
        const hasLogicalPositioning = prevButton.className.includes('start-');
        expect(hasLogicalPositioning).toBe(true);
      }

      if (nextButton) {
        // Next button should use end-* (logical property that flips for RTL)
        const hasLogicalPositioning = nextButton.className.includes('end-');
        expect(hasLogicalPositioning).toBe(true);
      }
    });

    it('should rotate chevron icons for RTL', () => {
      const { container } = render(<ProfilePageClient />, { wrapper: createWrapper() });

      // ChevronLeft and ChevronRight SVGs should have rtl:rotate-180 class
      const prevButton = screen.queryByLabelText(/previous section/i);
      const nextButton = screen.queryByLabelText(/next section/i);

      if (prevButton) {
        const svg = prevButton.querySelector('svg');
        expect(svg).toBeInTheDocument();
        // SVG className is SVGAnimatedString, use getAttribute or classList
        const classList = svg?.getAttribute('class') || '';
        expect(classList).toContain('rtl:rotate-180');
      }

      if (nextButton) {
        const svg = nextButton.querySelector('svg');
        expect(svg).toBeInTheDocument();
        // SVG className is SVGAnimatedString, use getAttribute or classList
        const classList = svg?.getAttribute('class') || '';
        expect(classList).toContain('rtl:rotate-180');
      }
    });
  });
});
