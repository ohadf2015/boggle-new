import React from 'react';
/**
 * Test: Daily Challenge Banner is inside the mode cards grid on mobile view
 * Updated: Banner moved from full-width above grid to col-span-2 inside grid
 */


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

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
  useTiltEffect: () => ({ ref: { current: null }, style: {}, handlers: {} }),
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
  markOnboardingSkipped: vi.fn(),
}));

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

vi.mock('@/hooks/usePlayerStats', () => ({
  usePlayerStats: () => ({ allTimeBest: null }),
}));

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => ({ hasCompleted: false, isLoading: false }),
}));

vi.mock('@/utils/perfVariant', () => ({
  getPerfVariant: () => 'control',
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const DynamicComponent = () => <div>Mocked Dynamic Component</div>;
    return DynamicComponent;
  },
}));

vi.mock('framer-motion', () => {
  const motionObj = {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  };
  return {
    m: motionObj,
    m: motionObj,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useMotionValue: (init: number) => ({ get: () => init, set: () => {}, on: () => () => {} }),
    useSpring: (v: any) => v,
    useInView: () => true,
    useReducedMotion: () => false,
    animate: () => ({ stop: () => {} }),
  };
});

vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
});

vi.mock('@/components/Header', () => {
  const MockHeader = () => <header data-testid="header">Header</header>;
  return { default: MockHeader };
});

vi.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => <div data-testid="playful-background">Background</div>,
}));

vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascotWithEntrance: () => <div data-testid="mascot">Mascot</div>,
}));

vi.mock('@/components/ui/IdleMascot', () => ({
  IdleMascotWithEntrance: () => <div data-testid="idle-mascot">Idle Mascot</div>,
}));

vi.mock('../LandingShareBanner', () => ({
  LandingShareBanner: ({ onShareClick }: { onShareClick: () => void }) => (
    <button data-testid="landing-share-banner" onClick={onShareClick}>Share</button>
  ),
}));

vi.mock('../LandingSEOSection', () => ({
  LandingSEOSection: () => <div data-testid="seo-section">SEO Content</div>,
  ScrollIndicator: () => <div data-testid="scroll-indicator">Scroll</div>,
}));

vi.mock('@/components/auth/AuthModal', () => {
  return { default: () => <div data-testid="auth-modal">Auth Modal</div> };
});

vi.mock('../ModeCard', () => {
  const MockModeCard = ({ title }: { title: string }) => {
    return <div data-testid={`mode-card-${title}`}>{title}</div>;
  };
  return { default: MockModeCard };
});

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
    const { container } = render(<LandingView />, { wrapper: createWrapper() });

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

    const { container } = render(<LandingView />, { wrapper: createWrapper() });

    const cardsGrid = container.querySelector('.grid.grid-cols-2');
    expect(cardsGrid).toBeTruthy();

    const bannerInGrid = cardsGrid?.querySelector('.col-span-2');
    expect(bannerInGrid).toBeTruthy();
  });
});
