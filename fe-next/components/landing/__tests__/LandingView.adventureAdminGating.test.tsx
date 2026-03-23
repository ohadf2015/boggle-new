/**
 * LandingView Adventure Mode Admin Gating Tests
 *
 * Tests that adventure mode is only visible to admin users
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
import '@testing-library/jest-dom';

jest.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
import LandingView from '../LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';

// Mock all required contexts and hooks
jest.mock('@/contexts/AuthContext');

jest.mock('@/contexts/LanguageContext');

jest.mock('@/contexts/MusicContext');

jest.mock('@/utils/ThemeContext', () => ({

  useTheme: () => ({
    theme: 'dark',
    setTheme: jest.fn(),
  }),
}));
jest.mock('@/contexts/SoundEffectsContext', () => ({

  useSoundEffects: () => ({
    playSound: jest.fn(),
    stopSound: jest.fn(),
    isSoundEnabled: true,
    toggleSound: jest.fn(),
  }),
}));
jest.mock('@/contexts/CoinContext', () => ({

  useCoin: () => ({
    coins: 0,
    updateCoins: jest.fn(),
  }),
}));
jest.mock('@/contexts/HapticsContext', () => ({

  useHapticsConfig: () => ({
    isEnabled: true,
    toggle: jest.fn(),
  }),
}));
jest.mock('@/hooks/useLiveRoomStats', () => ({

  useLiveRoomStats: () => ({
    openRooms: 0,
    totalPlayers: 0,
    refresh: jest.fn(),
  }),
}));
jest.mock('@/hooks/useMobileLandscape', () => ({

  useMobileLandscape: () => false,
}));
jest.mock('@/hooks/useMobilePortrait', () => ({

  useMobilePortrait: () => false,
}));
jest.mock('@/hooks/useTiltEffect', () => ({

  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {},
  }),
  useMouseParallax: () => ({ x: 0, y: 0 }),
}));
jest.mock('@/hooks/useDevicePerformance', () => ({

  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));
jest.mock('next/navigation', () => ({

  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useParams: () => ({ locale: 'en' }),
}));
jest.mock('@/utils/onboardingStorage', () => ({

  hasCompletedOnboarding: () => true,
}));

// Mock components that are lazy loaded
jest.mock('@/components/daily/DailyChallengeBanner', () => {

  return function MockDailyChallengeBanner() {
    return <div data-testid="daily-challenge-banner">Daily Challenge</div>;
  };
});

jest.mock('@/components/OnboardingModal', () => {

  return function MockOnboardingModal() {
    return <div>Onboarding Modal</div>;
  };
});

jest.mock('@/components/ProfileCustomizationModal', () => {

  return function MockProfileCustomizationModal() {
    return <div>Profile Customization</div>;
  };
});

describe('LandingView - Adventure Mode Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default language mock
    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'landing.adventureMode': 'Adventure',
          'landing.adventureModeDesc': '100 levels across 10 worlds',
        };
        return translations[key] || key;
      },
      language: 'en',
      setLanguage: jest.fn(),
      dir: 'ltr',
    });

    // Default music mock
    (useMusic as jest.Mock).mockReturnValue({
      playTrack: jest.fn(),
      TRACKS: { LOBBY: 'lobby' },
    });
  });

  describe('Non-Admin User', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user-123' },
        profile: { id: 'user-123', is_admin: false },
        isAdmin: false,
        loading: false,
        isAuthenticated: true,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      });
    });

    it('should show adventure mode for non-admin users', () => {
      render(<LandingView />);

      // Adventure mode is visible to all authenticated users
      const adventureText = screen.getByText('Adventure');
      expect(adventureText).toBeInTheDocument();
    });
  });

  describe('Admin User', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'admin-123' },
        profile: { id: 'admin-123', is_admin: true },
        isAdmin: true,
        loading: false,
        isAuthenticated: true,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      });
    });

    it('should show adventure mode for admin users', () => {
      render(<LandingView />);

      // Adventure mode should be visible for admins
      const adventureText = screen.getByText('Adventure');
      expect(adventureText).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        profile: null,
        isAdmin: false,
        loading: true,
        isAuthenticated: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      });
    });

    it('should show adventure mode even while loading auth state', () => {
      render(<LandingView />);

      // Adventure is available to all users, shown regardless of auth loading state
      const adventureText = screen.getByText('Adventure');
      expect(adventureText).toBeInTheDocument();
    });
  });
});
