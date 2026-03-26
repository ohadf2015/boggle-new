/**
 * Test: Daily Challenge Banner is inside the mode cards grid on mobile view
 * Updated: Banner moved from full-width above grid to col-span-2 inside grid
 */

import { render } from '@testing-library/react';
import LandingView from '../LandingView';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';

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
  markOnboardingSkipped: vi.fn(),
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

describe('LandingView - Daily Challenge Banner Spacing', () => {
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

    // Simulate mobile landscape dimensions (< 1024px wide)
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 768 });

    // Mock window.matchMedia for mobile landscape
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

  it('should render Daily Challenge Banner inside the mode cards grid on mobile landscape', () => {
    const { container } = render(<LandingView />);

    // The Daily Challenge Banner is now inside the 2-col grid as a col-span-2 item
    const cardsGrid = container.querySelector('.grid.grid-cols-2');
    expect(cardsGrid).toBeTruthy();

    // Banner wrapper should be inside the grid with col-span-2
    const bannerInGrid = cardsGrid?.querySelector('.col-span-2');
    expect(bannerInGrid).toBeTruthy();

    // Grid gap handles spacing between items — no separate mb-X wrapper needed
  });

  it('should render Daily Challenge Banner inside the mode cards grid on mobile portrait', () => {
    vi.resetModules();
    vi.mock('@/hooks/useMobileLandscape', () => ({
      useMobileLandscape: () => false,
    }));
    vi.mock('@/hooks/useMobilePortrait', () => ({
      useMobilePortrait: () => true,
    }));

    const { container } = render(<LandingView />);

    const cardsGrid = container.querySelector('.grid.grid-cols-2');
    expect(cardsGrid).toBeTruthy();

    const bannerInGrid = cardsGrid?.querySelector('.col-span-2');
    expect(bannerInGrid).toBeTruthy();
  });
});
