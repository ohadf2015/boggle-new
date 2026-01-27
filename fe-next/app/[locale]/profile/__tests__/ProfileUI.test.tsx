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

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageData
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' })
}));

jest.mock('@/contexts/AuthContext', () => ({
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
    updateProfile: jest.fn(),
    refreshProfile: jest.fn()
  })
}));

jest.mock('@/hooks/useProfilePictureUpload', () => ({
  useProfilePictureUpload: () => ({
    isUploading: false,
    handleProfilePictureUpload: jest.fn(),
    handleRemoveProfilePicture: jest.fn()
  })
}));

jest.mock('@/hooks/usePlayerCollectibles', () => ({
  usePlayerCollectibles: () => ({
    collectibles: [],
    isLoading: false
  })
}));

jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false }
  })
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    isPlaying: false,
    toggleMusic: jest.fn()
  })
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: jest.fn()
  })
}));

jest.mock('@/contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    isHapticsEnabled: true,
    toggleHaptics: jest.fn()
  })
}));

jest.mock('@/utils/session', () => ({
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

  describe('Neo-Brutalist Carousel Indicators', () => {
    it('should use small dot sizing for all indicators', () => {
      const { container } = render(<ProfilePageClient />);

      // Find carousel indicators
      const indicators = container.querySelectorAll('button[aria-label*="Go to"]');
      expect(indicators.length).toBeGreaterThan(1);

      // All indicators should be small dots (w-2.5 h-2.5 or w-2 h-2)
      indicators.forEach(indicator => {
        // Should NOT use large sizes like w-6
        expect(indicator.className).not.toContain('w-6');
        expect(indicator.className).not.toContain('w-8');

        // Should use small dot sizing (w-2 or w-2.5)
        const hasSmallSize = indicator.className.includes('w-2');
        expect(hasSmallSize).toBe(true);
      });
    });

    it('should use neo-brutalist styling for carousel indicators', () => {
      const { container } = render(<ProfilePageClient />);

      // Find carousel indicators
      const indicators = container.querySelectorAll('button[aria-label*="Go to"]');
      expect(indicators.length).toBeGreaterThan(0);

      const activeIndicator = Array.from(indicators).find(btn =>
        btn.className.includes('bg-neo-yellow')
      );

      if (activeIndicator) {
        // Should NOT use fully rounded (rounded-full)
        // Neo-brutalist style uses minimal rounding (rounded-neo = 4px)
        expect(activeIndicator.className).not.toContain('rounded-full');

        // Should use rounded-neo or similar minimal rounding
        const hasNeoBrutalistRounding = activeIndicator.className.includes('rounded-neo') ||
                                       activeIndicator.className.includes('rounded-sm') ||
                                       activeIndicator.className.includes('rounded-md');
        expect(hasNeoBrutalistRounding).toBe(true);
      }
    });

    it('should use hard shadows on carousel indicators', () => {
      const { container } = render(<ProfilePageClient />);

      const indicators = container.querySelectorAll('button[aria-label*="Go to"]');
      const activeIndicator = Array.from(indicators).find(btn =>
        btn.className.includes('bg-neo-yellow')
      );

      if (activeIndicator) {
        // Should use shadow-hard-* utilities (neo-brutalist hard shadows)
        const hasHardShadow = activeIndicator.className.includes('shadow-hard');
        expect(hasHardShadow).toBe(true);
      }
    });

    it('should use chunky borders on carousel indicators', () => {
      const { container } = render(<ProfilePageClient />);

      const indicators = container.querySelectorAll('button[aria-label*="Go to"]');
      const activeIndicator = Array.from(indicators).find(btn =>
        btn.className.includes('bg-neo-yellow')
      );

      if (activeIndicator) {
        // Should use border-neo (3px) or border-neo-thick (4px)
        const hasChunkyBorder = activeIndicator.className.includes('border-neo') ||
                               activeIndicator.className.includes('border-3') ||
                               activeIndicator.className.includes('border-4');
        expect(hasChunkyBorder).toBe(true);
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
