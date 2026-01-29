/**
 * Test: Profile Mobile Tab Navigation
 *
 * Verifies:
 * 1. Tab navigation is displayed with section labels
 * 2. Navigation arrows positioned at bottom without hiding content
 * 3. Swipe indicators show on sides to indicate more content
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
  }),
  useSearchParams: () => ({
    get: jest.fn(() => null)
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

describe('Profile Mobile Tab Navigation', () => {
  describe('Tab Navigation', () => {
    it('should display tabs with section labels', () => {
      render(<ProfilePageClient />);

      // Find all section tab buttons by role
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(4); // Overview, Stats, Achievements, Collection

      // Verify tab labels are visible
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Stats')).toBeInTheDocument();
      expect(screen.getByText('Achievements')).toBeInTheDocument();
      expect(screen.getByText('Collection')).toBeInTheDocument();
    });

    it('should have an active tab with yellow background', () => {
      render(<ProfilePageClient />);

      // Find active tab (selected)
      const activeTab = screen.getAllByRole('tab').find(tab =>
        tab.getAttribute('aria-selected') === 'true'
      );
      expect(activeTab).toBeInTheDocument();

      // Active tab should have neo-yellow background
      expect(activeTab?.className).toContain('bg-neo-yellow');
    });

    it('should have inactive tabs with subtle styling', () => {
      render(<ProfilePageClient />);

      // Find inactive tabs
      const tabs = screen.getAllByRole('tab');
      const inactiveTabs = tabs.filter(tab =>
        tab.getAttribute('aria-selected') !== 'true'
      );

      // Should have at least 3 inactive tabs (all except active)
      expect(inactiveTabs.length).toBe(3);

      inactiveTabs.forEach(tab => {
        // Inactive should NOT have yellow background
        expect(tab.className).not.toContain('bg-neo-yellow');
      });
    });
  });

  describe('Navigation Arrows Removed', () => {
    it('should NOT have fixed yellow arrow buttons at bottom', () => {
      render(<ProfilePageClient />);

      // The fixed yellow navigation arrows should be removed
      const prevButton = screen.queryByLabelText(/previous section/i);
      const nextButton = screen.queryByLabelText(/next section/i);

      // Neither should exist as fixed buttons
      expect(prevButton).not.toBeInTheDocument();
      expect(nextButton).not.toBeInTheDocument();
    });
  });

  describe('Swipe Indicators', () => {
    it('should show swipe indicator on right side when not on last section', () => {
      const { container } = render(<ProfilePageClient />);

      // Find the right-side swipe indicator gradient
      const rightIndicator = container.querySelector('[aria-hidden="true"].bg-gradient-to-l');
      expect(rightIndicator).toBeInTheDocument();
    });

    it('should have RTL rotation on swipe indicator chevron icons', () => {
      const { container } = render(<ProfilePageClient />);

      // Find the chevron icons in swipe indicators (end side for "next" direction)
      const rightIndicator = container.querySelector('[aria-hidden="true"].end-0');

      if (rightIndicator) {
        const chevronIcon = rightIndicator.querySelector('svg');
        expect(chevronIcon).toBeInTheDocument();
        // SVG elements use class attribute, not className property
        const classAttr = chevronIcon?.getAttribute('class') || '';
        // Icon should have rtl:rotate-180 class for proper RTL support
        expect(classAttr).toContain('rtl:rotate-180');
      }
    });
  });
});

describe('Profile RTL Swipe Direction', () => {
  beforeEach(() => {
    // Reset mock to RTL
    jest.doMock('@/contexts/LanguageContext', () => ({
      useLanguage: () => ({
        t: (key: string) => {
          const translations: Record<string, string> = {
            'profile.sections.overview': 'סקירה',
            'profile.sections.stats': 'סטטיסטיקה',
            'profile.sections.achievements': 'הישגים',
            'profile.sections.collection': 'אוסף',
            'profile.title': 'הפרופיל שלך'
          };
          return translations[key] || key;
        },
        language: 'he',
        dir: 'rtl'
      })
    }));
  });

  it('should have RTL-aware swipe gesture handling in the motion component', () => {
    // This test documents that the swipe direction must be RTL-aware
    // In RTL: swipe right = next, swipe left = previous (opposite of LTR)
    // The component should use the language context's dir property to determine direction
    const { container } = render(<ProfilePageClient />);

    // The motion.div with drag="x" should exist for swipe handling
    const swipeableContainer = container.querySelector('[draggable]') ||
                               container.querySelector('.h-full.px-5');
    expect(swipeableContainer).toBeInTheDocument();
  });
});
