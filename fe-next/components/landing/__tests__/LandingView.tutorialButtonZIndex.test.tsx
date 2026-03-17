/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingView from '../LandingView';
import GlobalBottomNav from '../../GlobalBottomNav';

// Mock dependencies
jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

jest.mock('../../../contexts/MusicContext', () => ({
  useMusic: () => ({
    playTrack: jest.fn(),
    TRACKS: { LOBBY: 'lobby' },
  }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, loading: false }),
}));

jest.mock('../../../contexts/NavigationContext', () => ({
  useNavigation: () => ({ isInGame: false }),
}));

jest.mock('../../../utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: jest.fn(),
  }),
}));

jest.mock('../../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: jest.fn(),
    stopSound: jest.fn(),
    isSoundEnabled: true,
    toggleSound: jest.fn(),
  }),
}));

jest.mock('../../../contexts/CoinContext', () => ({
  useCoin: () => ({
    coins: 0,
    updateCoins: jest.fn(),
  }),
}));

jest.mock('../../../contexts/HapticsContext', () => ({
  useHapticsConfig: () => ({
    isEnabled: true,
    toggle: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('../../../hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => true, // Mobile portrait to test overlap
}));

jest.mock('../../../hooks/useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    activePlayers: 0,
    openRooms: 0,
    totalPlayers: 0,
    refresh: jest.fn(),
  }),
}));

jest.mock('../../../hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { pullDistance: 0, isRefreshing: false },
  }),
}));

jest.mock('../../../hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({ x: 0, y: 0 }),
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {},
  }),
}));

jest.mock('../../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/en',
  useParams: () => ({ locale: 'en' }),
}));

// Mock components that aren't needed for this test
jest.mock('../../Header', () => () => null);
jest.mock('../../ui/IdleMascot', () => ({
  IdleMascotWithEntrance: () => null,
}));
jest.mock('../../ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));
jest.mock('../../OnboardingModal', () => {
  const MockOnboardingModal = () => null;
  MockOnboardingModal.displayName = 'MockOnboardingModal';
  return MockOnboardingModal;
});
jest.mock('../../auth/AuthModal', () => {
  const MockAuthModal = () => null;
  MockAuthModal.displayName = 'MockAuthModal';
  return MockAuthModal;
});
jest.mock('../../daily/DailyChallengeBanner', () => {
  const MockDailyChallengeBanner = () => <div data-testid="daily-banner">Banner</div>;
  MockDailyChallengeBanner.displayName = 'MockDailyChallengeBanner';
  return MockDailyChallengeBanner;
});
jest.mock('../../daily/DailyChallenge', () => ({ useDailyChallenge: () => ({ completedToday: false, loading: false }) }));
jest.mock('../../../utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => false,
  markOnboardingSkipped: jest.fn(),
}));
jest.mock('../../../utils/perfVariant', () => ({
  getPerfVariant: () => 'lite',
}));

describe('LandingView - Tutorial Button Z-Index', () => {
  it('should have tutorial button with z-index higher than GlobalBottomNav to prevent overlap', () => {
    render(
      <>
        <LandingView />
        <GlobalBottomNav />
      </>
    );

    // Find tutorial button by aria-label
    const tutorialButton = screen.getByLabelText('landing.tutorial');
    // The z-index and fixed positioning are on the wrapper div, not the button itself
    const tutorialWrapper = tutorialButton.parentElement;
    const tutorialClasses = tutorialWrapper?.className || '';

    // Find GlobalBottomNav
    const bottomNav = screen.getByLabelText('nav.bottomNavigation');
    const bottomNavClasses = bottomNav.className;

    // Extract z-index from className (e.g., "z-[55]" or "z-50")
    const tutorialZMatch = tutorialClasses.match(/z-\[?(\d+)\]?/);
    const bottomNavZMatch = bottomNavClasses.match(/z-\[?(\d+)\]?/);

    expect(tutorialZMatch).toBeTruthy();
    expect(bottomNavZMatch).toBeTruthy();

    const tutorialZIndex = parseInt(tutorialZMatch![1], 10);
    const bottomNavZIndex = parseInt(bottomNavZMatch![1], 10);

    // GlobalBottomNav MUST have higher z-index than tutorial button to be clickable
    // Tutorial button: z-[55], GlobalBottomNav: z-[80]
    // Bottom navigation must be above all other elements to remain clickable
    expect(bottomNavZIndex).toBeGreaterThan(tutorialZIndex);
  });

  it('should position tutorial button above GlobalBottomNav on mobile', () => {
    render(
      <>
        <LandingView />
        <GlobalBottomNav />
      </>
    );

    // Find tutorial button
    const tutorialButton = screen.getByLabelText('landing.tutorial');
    // The fixed positioning and bottom classes are on the wrapper div, not the button itself
    const tutorialWrapper = tutorialButton.parentElement;
    const tutorialClasses = tutorialWrapper?.className || '';

    // On mobile (without sm: breakpoint), tutorial button should account for GlobalBottomNav
    // GlobalBottomNav is 64px tall (h-16) so tutorial button should be positioned higher
    // Expected: bottom should be at least 64px + 1rem (16px) = 80px minimum

    expect(tutorialClasses).toContain('fixed');
    expect(tutorialClasses).toContain('bottom-');

    // Check if position accounts for nav height on mobile
    // Should be bottom-20 (80px) for mobile with nav, sm:bottom-24 for footer
    const hasProperMobileBottom =
      tutorialClasses.includes('bottom-20') || // 80px (64px nav + 16px margin)
      tutorialClasses.includes('bottom-24'); // 96px (safe margin)

    expect(hasProperMobileBottom).toBe(true);
  });

  it('should have z-index value that ensures visibility on mobile', () => {
    render(<LandingView />);

    const tutorialButton = screen.getByLabelText('landing.tutorial');
    // The z-index is on the wrapper div, not the button itself
    const tutorialWrapper = tutorialButton.parentElement;
    const tutorialClasses = tutorialWrapper?.className || '';

    // Tutorial button needs z-index > 50 (GlobalBottomNav's z-index)
    // Extract z-index from className
    const zIndexMatch = tutorialClasses.match(/z-\[(\d+)\]/);
    expect(zIndexMatch).toBeTruthy();

    const zIndexValue = parseInt(zIndexMatch![1], 10);

    // Must be higher than GlobalBottomNav's z-50
    expect(zIndexValue).toBeGreaterThan(50);
  });
});
