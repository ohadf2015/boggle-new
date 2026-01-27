/**
 * Test: Profile Carousel UI Improvements
 *
 * Verifies:
 * 1. Progress indicators use subtle sizing without aggressive width scaling
 * 2. Navigation arrows positioned to not hide content (bottom or reduced opacity)
 * 3. Header is added to describe carousel sections
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'profile.sections.overview': 'Overview',
        'profile.sections.stats': 'Stats',
        'profile.sections.achievements': 'Achievements',
        'profile.sections.collection': 'Collection',
        'profile.title': 'Your Profile'
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr'
  })
}));

jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' })
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' },
    profile: { display_name: 'Test User' },
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

describe('Profile Carousel UI Improvements', () => {
  describe('Progress Indicators', () => {
    it('should use small dot sizing for indicators', () => {
      const { container } = render(<ProfilePageClient />);

      // Find all section indicator buttons
      const indicators = container.querySelectorAll('button[aria-label*="section"]');
      expect(indicators.length).toBeGreaterThan(0);

      // Active indicator should use small dots (w-2.5 or w-2)
      const activeIndicator = Array.from(indicators).find(btn =>
        btn.className.includes('bg-neo-yellow')
      );
      expect(activeIndicator).toBeInTheDocument();

      // Should NOT use large sizes like w-6 or w-8
      expect(activeIndicator?.className).not.toContain('w-8');
      expect(activeIndicator?.className).not.toContain('w-6');

      // Should use small dot sizing (w-2 or w-2.5)
      const hasSmallDotSize = activeIndicator?.className.includes('w-2');
      expect(hasSmallDotSize).toBe(true);
    });

    it('should have subtle inactive indicator styling', () => {
      const { container } = render(<ProfilePageClient />);

      // Find section indicators specifically (not navigation arrows)
      const indicators = container.querySelectorAll('button[aria-label*="Go to"]');
      const inactiveIndicators = Array.from(indicators).filter(btn =>
        !btn.className.includes('bg-neo-yellow')
      );

      // Should have at least some inactive indicators
      expect(inactiveIndicators.length).toBeGreaterThan(0);

      inactiveIndicators.forEach(indicator => {
        // Inactive should be w-2 h-2 (dots)
        expect(indicator.className).toContain('w-2');
        expect(indicator.className).toContain('h-2');
      });
    });
  });

  describe('Navigation Arrows', () => {
    it('should position arrows to not hide content', () => {
      const { container } = render(<ProfilePageClient />);

      // Find navigation arrow buttons
      const prevButton = screen.queryByLabelText(/previous section/i);
      const nextButton = screen.queryByLabelText(/next section/i);

      if (prevButton) {
        // Arrows should NOT be fixed positioned at left-2/right-2 (hides content)
        // Should either:
        // 1. Have reduced opacity (opacity-30 or similar) so content shows through
        // 2. Be positioned at bottom instead of center
        const hasReducedOpacity = prevButton.className.includes('opacity-');
        const isBottomPositioned = prevButton.className.includes('bottom-');

        expect(hasReducedOpacity || isBottomPositioned).toBe(true);
      }

      if (nextButton) {
        const hasReducedOpacity = nextButton.className.includes('opacity-');
        const isBottomPositioned = nextButton.className.includes('bottom-');

        expect(hasReducedOpacity || isBottomPositioned).toBe(true);
      }
    });

    it('should have subtle arrow styling when visible', () => {
      const { container } = render(<ProfilePageClient />);

      const arrows = [
        screen.queryByLabelText(/previous section/i),
        screen.queryByLabelText(/next section/i)
      ].filter(Boolean);

      arrows.forEach(arrow => {
        if (arrow) {
          // Should NOT have hover:scale-110 (aggressive)
          expect(arrow.className).not.toContain('hover:scale-110');
        }
      });
    });
  });

  describe('Header', () => {
    it('should display section header explaining carousel purpose', () => {
      const { container } = render(<ProfilePageClient />);

      // Should have a header above the indicators showing the current section name
      // The component displays section names like "Overview", "Stats", "Achievements", "Collection"
      // Find the header text (styled with text-xs, uppercase, tracking-wide)
      const header = container.querySelector('.text-xs.font-medium.text-neo-white\\/60');
      expect(header).toBeInTheDocument();
      expect(header?.textContent).toMatch(/Overview|Stats|Achievements|Collection/i);
    });
  });
});
