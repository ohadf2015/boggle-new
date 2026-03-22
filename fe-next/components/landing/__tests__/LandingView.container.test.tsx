/**
 * Test: Daily Challenge Banner container positioning on mobile view
 * Updated: Banner is now inside the 2-col grid as col-span-2, not a separate element above it
 */

import { render } from '@testing-library/react';
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
  useMobileLandscape: () => true, // Mobile landscape mode
}));
jest.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));
jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));
jest.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({ x: 0, y: 0 }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
  markOnboardingSkipped: jest.fn(),
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

describe('LandingView - Daily Challenge Banner Container', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      loading: false,
    });

    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      dir: 'ltr',
    });

    (useMusic as jest.Mock).mockReturnValue({
      playTrack: jest.fn(),
      TRACKS: { LOBBY: 'lobby' },
    });

    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query.includes('orientation: landscape'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should render Daily Challenge Banner inside main-container on mobile landscape', () => {
    const { container } = render(<LandingView />);

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
