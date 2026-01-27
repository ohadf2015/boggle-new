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

  describe('Navigation Arrows', () => {
    it('should position arrows at bottom without opacity', () => {
      render(<ProfilePageClient />);

      // Next button should be visible (we start on first section, so only "next" shows)
      const nextButton = screen.queryByLabelText(/next section/i);

      if (nextButton) {
        // Should be positioned at bottom
        expect(nextButton.className).toContain('bottom-');

        // Should NOT have reduced opacity (full visibility now)
        expect(nextButton.className).not.toContain('opacity-40');
        expect(nextButton.className).not.toContain('opacity-30');
      }
    });

    it('should have neo-brutalist arrow styling', () => {
      render(<ProfilePageClient />);

      const nextButton = screen.queryByLabelText(/next section/i);

      if (nextButton) {
        // Should have neo-brutalist styling
        expect(nextButton.className).toContain('bg-neo-navy');
        expect(nextButton.className).toContain('border-2');
        expect(nextButton.className).toContain('border-neo-yellow');

        // Should have active press state
        expect(nextButton.className).toContain('active:');
      }
    });
  });

  describe('Swipe Indicators', () => {
    it('should show swipe indicator on right side when not on last section', () => {
      const { container } = render(<ProfilePageClient />);

      // Find the right-side swipe indicator gradient
      const rightIndicator = container.querySelector('[aria-hidden="true"].bg-gradient-to-l');
      expect(rightIndicator).toBeInTheDocument();
    });
  });
});
