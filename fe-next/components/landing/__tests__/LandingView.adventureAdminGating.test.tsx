/**
 * LandingView Adventure Mode Admin Gating Tests
 *
 * Tests that adventure mode is only visible to admin users
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
import '@testing-library/jest-dom';

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
import LandingView from '../LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all required contexts and hooks
vi.mock('@/contexts/AuthContext');

vi.mock('@/contexts/LanguageContext');

vi.mock('@/contexts/MusicContext');

vi.mock('@/utils/ThemeContext', () => ({

  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({

  useSoundEffects: () => ({
    playSound: vi.fn(),
    stopSound: vi.fn(),
    isSoundEnabled: true,
    toggleSound: vi.fn(),
  }),
}));
vi.mock('@/contexts/CoinContext', () => ({

  useCoin: () => ({
    coins: 0,
    updateCoins: vi.fn(),
  }),
}));
vi.mock('@/contexts/HapticsContext', () => ({

  useHapticsConfig: () => ({
    isEnabled: true,
    toggle: vi.fn(),
  }),
}));
vi.mock('@/hooks/useLiveRoomStats', () => ({

  useLiveRoomStats: () => ({
    openRooms: 0,
    totalPlayers: 0,
    refresh: vi.fn(),
  }),
}));
vi.mock('@/hooks/useMobileLandscape', () => ({

  useMobileLandscape: () => false,
}));
vi.mock('@/hooks/useMobilePortrait', () => ({

  useMobilePortrait: () => false,
}));
vi.mock('@/hooks/useTiltEffect', () => ({

  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {},
  }),
  useMouseParallax: () => ({ x: 0, y: 0 }),
}));
vi.mock('@/hooks/useDevicePerformance', () => ({

  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));
vi.mock('next/navigation', () => ({

  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({ locale: 'en' }),
}));
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
  markOnboardingComplete: vi.fn(),
  savePendingRoomInvite: vi.fn(),
}));

vi.mock('@/hooks/useRealtimeNotifications', () => ({
  useRealtimeNotifications: () => ({ notifications: [], unreadCount: 0 }),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  }),
}));

// Mock components that are lazy loaded
vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const MockDailyChallengeBanner = () => {
    return <div data-testid="daily-challenge-banner">Daily Challenge</div>;
  };
  return { default: MockDailyChallengeBanner };
});

vi.mock('@/components/OnboardingModal', () => {
  const MockOnboardingModal = () => {
    return <div>Onboarding Modal</div>;
  };
  return { default: MockOnboardingModal };
});

vi.mock('@/components/ProfileCustomizationModal', () => {
  const MockProfileCustomizationModal = () => {
    return <div>Profile Customization</div>;
  };
  return { default: MockProfileCustomizationModal };
});


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('LandingView - Adventure Mode Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default language mock
    (useLanguage as vi.Mock).mockReturnValue({
      t: (key: string) => {
        const translations: Record<string, string> = {
          'landing.adventureMode': 'Adventure',
          'landing.adventureModeDesc': '100 levels across 10 worlds',
        };
        return translations[key] || key;
      },
      language: 'en',
      setLanguage: vi.fn(),
      dir: 'ltr',
    });

    // Default music mock
    (useMusic as vi.Mock).mockReturnValue({
      playTrack: vi.fn(),
      TRACKS: { LOBBY: 'lobby' },
    });
  });

  describe('Non-Admin User', () => {
    beforeEach(() => {
      (useAuth as vi.Mock).mockReturnValue({
        user: { id: 'user-123' },
        profile: { id: 'user-123', is_admin: false },
        isAdmin: false,
        loading: false,
        isAuthenticated: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });
    });

    it('should show adventure mode for non-admin users', () => {
      render(<LandingView />, { wrapper: createWrapper() });

      // Adventure mode is visible to all authenticated users
      const adventureText = screen.getByText('Adventure');
      expect(adventureText).toBeInTheDocument();
    });
  });

  describe('Admin User', () => {
    beforeEach(() => {
      (useAuth as vi.Mock).mockReturnValue({
        user: { id: 'admin-123' },
        profile: { id: 'admin-123', is_admin: true },
        isAdmin: true,
        loading: false,
        isAuthenticated: true,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });
    });

    it('should show adventure mode for admin users', () => {
      render(<LandingView />, { wrapper: createWrapper() });

      // Adventure mode should be visible for admins
      const adventureText = screen.getByText('Adventure');
      expect(adventureText).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      (useAuth as vi.Mock).mockReturnValue({
        user: null,
        profile: null,
        isAdmin: false,
        loading: true,
        isAuthenticated: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
        signUp: vi.fn(),
      });
    });

    it('should show adventure mode even while loading auth state', () => {
      render(<LandingView />, { wrapper: createWrapper() });

      // Adventure is available to all users, shown regardless of auth loading state
      const adventureText = screen.getByText('Adventure');
      expect(adventureText).toBeInTheDocument();
    });
  });
});
