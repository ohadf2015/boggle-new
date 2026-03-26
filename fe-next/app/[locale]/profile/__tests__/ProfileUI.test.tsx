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

describe('Profile UI Styling', () => {
  describe('Section Title Sizing', () => {
    it('should use adequately sized titles in profile sections (not text-base)', () => {
      const mockProfile = {
        display_name: 'Test User',
        total_xp: 1000,
        total_coins: 500,
        current_level: 5
      };

      const { container } = render(
        <ProfileXpSection profile={mockProfile as any} isDarkMode={true} compact={true} />
      );

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

      const { container } = render(
        <ProfileCoinsSection profile={mockProfile as any} isDarkMode={true} compact={true} />
      );

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
      render(<ProfilePageClient />);

      // Find section tabs by role
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4); // Overview, Stats, Achievements, Collection
    });

    it('should use neo-brutalist styling for active tab', () => {
      render(<ProfilePageClient />);

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
      render(<ProfilePageClient />);

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
      render(<ProfilePageClient />);

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
      const { container } = render(<ProfilePageClient />);

      // Buttons use logical properties (start/end) which automatically flip for RTL
      // Previous button uses start-2 (left in LTR, right in RTL)
      // Next button uses end-2 (right in LTR, left in RTL)
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
      const { container } = render(<ProfilePageClient />);

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
