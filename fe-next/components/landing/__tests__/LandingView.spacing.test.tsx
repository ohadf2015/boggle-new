/**
 * Test: Daily Challenge Banner spacing on mobile view
 * Bug: Banner has insufficient margin from mode cards on mobile/landscape
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

describe('LandingView - Daily Challenge Banner Spacing', () => {
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

    // Mock window.matchMedia for mobile landscape
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

  it('should have consistent spacing between Daily Challenge Banner and mode cards on mobile landscape', () => {
    const { container } = render(<LandingView />);

    // Find the Daily Challenge Banner wrapper by looking for the div containing DailyChallengeBanner
    // It should have 'w-full' class and be a direct child before the grid
    const bannerWrappers = container.querySelectorAll('.w-full');
    let bannerWrapper: Element | null = null;

    // Find the wrapper that contains the Daily Challenge Banner
    bannerWrappers.forEach((el) => {
      if (el.className.includes('mb-')) {
        // Check if this is specifically the banner wrapper (has w-full and mb-X)
        const parent = el.parentElement;
        if (parent && parent.querySelector('.grid.grid-cols-2')) {
          bannerWrapper = el;
        }
      }
    });

    // Find the mode cards grid
    const cardsGrid = container.querySelector('.grid.grid-cols-2');

    expect(bannerWrapper).toBeTruthy();
    expect(cardsGrid).toBeTruthy();

    // Check that banner wrapper has adequate bottom margin
    // Current bug: has mb-2 (0.5rem), should have at least mb-3 (0.75rem) or mb-4 (1rem)
    const bannerWrapperClasses = bannerWrapper ? (bannerWrapper as HTMLElement).className : '';

    // This should FAIL with current code (mb-2), and PASS after fix (mb-3 or mb-4)
    const hasInadequateMargin = bannerWrapperClasses.includes('mb-2');
    const hasAdequateMargin = bannerWrapperClasses.includes('mb-3') ||
                             bannerWrapperClasses.includes('mb-4') ||
                             bannerWrapperClasses.includes('mb-5');

    // Assert that we DON'T have the bug (inadequate margin)
    expect(hasInadequateMargin).toBe(false);
    // Assert that we DO have adequate margin
    expect(hasAdequateMargin).toBe(true);
  });

  it('should have consistent spacing between Daily Challenge Banner and mode cards on mobile portrait', () => {
    // Override mobile portrait mock
    jest.resetModules();
    jest.mock('@/hooks/useMobileLandscape', () => ({
      useMobileLandscape: () => false,
    }));
    jest.mock('@/hooks/useMobilePortrait', () => ({
      useMobilePortrait: () => true, // Mobile portrait mode
    }));

    const { container } = render(<LandingView />);

    // Find the Daily Challenge Banner wrapper
    const bannerWrappers = container.querySelectorAll('.w-full');
    let bannerWrapper: Element | null = null;

    // Find the wrapper that contains the Daily Challenge Banner
    bannerWrappers.forEach((el) => {
      if (el.className.includes('mb-')) {
        const parent = el.parentElement;
        if (parent && parent.querySelector('.grid.grid-cols-2')) {
          bannerWrapper = el;
        }
      }
    });

    // Find the mode cards grid
    const cardsGrid = container.querySelector('.grid.grid-cols-2');

    expect(bannerWrapper).toBeTruthy();
    expect(cardsGrid).toBeTruthy();

    // Check spacing - same as landscape test
    const bannerWrapperClasses = bannerWrapper ? (bannerWrapper as HTMLElement).className : '';
    const hasInadequateMargin = bannerWrapperClasses.includes('mb-2');
    const hasAdequateMargin = bannerWrapperClasses.includes('mb-3') ||
                             bannerWrapperClasses.includes('mb-4') ||
                             bannerWrapperClasses.includes('mb-5');

    expect(hasInadequateMargin).toBe(false);
    expect(hasAdequateMargin).toBe(true);
  });
});
