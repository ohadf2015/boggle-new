import React from 'react';
/**
 * Test: Daily Challenge Banner container positioning on mobile view
 * Updated: Banner is now inside the 2-col grid as col-span-2, not a separate element above it
 */

import { render } from '@testing-library/react';
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
  useMobileLandscape: () => true, // Mobile landscape mode
}));
vi.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));
vi.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({ x: 0, y: 0 }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
  markOnboardingComplete: vi.fn(),
  markOnboardingSkipped: vi.fn(),
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


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('LandingView - Daily Challenge Banner Container', () => {
  beforeEach(() => {
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    (useLanguage as vi.Mock).mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      dir: 'ltr',
    });

    (useMusic as vi.Mock).mockReturnValue({
      playTrack: vi.fn(),
      TRACKS: { LOBBY: 'lobby' },
    });

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes('orientation: landscape'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should render Daily Challenge Banner inside main-container on mobile landscape', () => {
    const { container } = render(<LandingView />, { wrapper: createWrapper() });

    // Find the section element (the main content container)
    const mainContainer = container.querySelector('section');
    expect(mainContainer).toBeTruthy();

    // Find the 2-col grid
    const cardsGrid = container.querySelector('.grid.grid-cols-2');
    expect(cardsGrid).toBeTruthy();

    // Daily Challenge Banner is now a col-span-2 item inside the grid
    const bannerWrapper = cardsGrid?.querySelector('.col-span-2');
    expect(bannerWrapper).toBeTruthy();

    // Verify it's inside the main container
    const isBannerInsideMain = mainContainer?.contains(bannerWrapper!);
    expect(isBannerInsideMain).toBe(true);
  });
});
