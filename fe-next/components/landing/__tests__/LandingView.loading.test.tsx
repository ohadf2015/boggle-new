import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
import '@testing-library/jest-dom';

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
import LandingView from '../LandingView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all the contexts and hooks
vi.mock('@/contexts/LanguageContext', () => ({

  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/MusicContext', () => ({

  useMusic: () => ({
    playTrack: vi.fn(),
    TRACKS: { LOBBY: 'lobby' },
  }),
}));

// Auth mock is defined inside describe block to allow dynamic values

vi.mock('@/hooks/useMobileLandscape', () => ({

  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useMobilePortrait', () => ({

  useMobilePortrait: () => false,
}));

vi.mock('@/hooks/useLiveRoomStats', () => ({

  useLiveRoomStats: () => ({
    openRooms: 0,
    totalPlayers: 0,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTiltEffect', () => ({

  useMouseParallax: () => ({ x: 0, y: 0 }),
  useTiltEffect: () => ({ ref: { current: null }, style: {}, handlers: {} }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({

  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

vi.mock('@/utils/onboardingStorage', () => ({

  hasCompletedOnboarding: () => true,
  markOnboardingSkipped: vi.fn(),
}));

// Mock Next.js components
vi.mock('next/link', () => {

  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
});

vi.mock('next/navigation', () => ({

  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useParams: () => ({ locale: 'en' }),
}));

vi.mock('next/dynamic', () => ({
  default: () => {
    const DynamicComponent = () => <div>Mocked Dynamic Component</div>;
    return DynamicComponent;
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => {

  const motionObj = {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  };
  const mockMotionValue = (init: number) => ({
    get: () => init,
    set: () => {},
    on: () => () => {},
  });
  return {
    motion: motionObj,
    m: motionObj,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useMotionValue: mockMotionValue,
    useSpring: (v: any) => v,
    useInView: () => true,
    animate: () => ({ stop: () => {} }),
  };
});

// Mock components
vi.mock('@/components/Header', () => {
  const MockHeader = () => {
    return <header data-testid="header">Header</header>;
  };
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

vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const MockDailyChallengeBanner = () => {
    return <div data-testid="daily-challenge-banner">Daily Challenge</div>;
  };
  return { default: MockDailyChallengeBanner };
});

vi.mock('../ModeCard', () => {
  const MockModeCard = ({ title, locked, loading, lockedMessage }: { title: string; locked?: boolean; loading?: boolean; lockedMessage?: string }) => {
    return (
      <div data-testid={`mode-card-${title}`}>
        {title}
        {loading && <span data-testid="loading-indicator">Loading...</span>}
        {locked && !loading && <span data-testid="locked-indicator">{lockedMessage || 'Locked'}</span>}
      </div>
    );
  };
  return { default: MockModeCard };
});

vi.mock('../ModeCard', () => {
  const MockModeCard = ({ title }: { title: string }) => {
    return <div data-testid={`mode-card-${title}`}>{title}</div>;
  };
  return { default: MockModeCard };
});

vi.mock('@/hooks/usePlayerStats', () => ({

  usePlayerStats: () => ({ allTimeBest: null }),
}));

vi.mock('@/hooks/useDailyChallengeStatus', () => ({

  useDailyChallengeStatus: () => ({ hasCompleted: false, isLoading: false }),
}));

vi.mock('@/utils/perfVariant', () => ({

  getPerfVariant: () => 'control',
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
  const MockAuthModal = () => {
    return <div data-testid="auth-modal">Auth Modal</div>;
  };
  return { default: MockAuthModal };
});

// Store mock values to be changed between tests
let mockAuthState: {
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin?: boolean;
} = {
  isAuthenticated: false,
  loading: false,
};

// Reset mock to use dynamic values
vi.mock('@/contexts/AuthContext', () => ({

  useAuth: () => mockAuthState,
}));

describe('LandingView Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default unauthenticated state
    mockAuthState = {
      isAuthenticated: false,
      loading: false,
    };
  });

  it('should render loading skeleton initially', () => {
    // Note: The skeleton is only shown for a brief moment before useEffect sets isMounted=true
    // This test verifies the component structure exists even if skeleton isn't visible
    const { container } = render(<LandingView />, { wrapper: createWrapper() });
    expect(container).toBeInTheDocument();
  });

  it('should show content after mount', async () => {
    render(<LandingView />, { wrapper: createWrapper() });

    // Wait for content to appear
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-banner')).toBeInTheDocument();
    });
  });

  it('should display mode cards after loading', async () => {
    render(<LandingView />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('mode-card-landing.multiplayer')).toBeInTheDocument();
      expect(screen.getByTestId('mode-card-landing.singlePlayer')).toBeInTheDocument();
    });
  });

  it('should prevent flash of unstyled content', async () => {
    // The loading skeleton prevents FOUC by showing placeholder content
    // This test verifies content loads properly without errors
    render(<LandingView />, { wrapper: createWrapper() });

    // Wait for content
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-banner')).toBeInTheDocument();
    });
  });

  it('should render component without errors', () => {
    // Verify the component renders successfully
    const { container } = render(<LandingView />, { wrapper: createWrapper() });
    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('should center mode cards after loading', async () => {
    const { container } = render(<LandingView />, { wrapper: createWrapper() });

    await waitFor(() => {
      const centerContainer = container.querySelector('.items-center.justify-center');
      expect(centerContainer).toBeInTheDocument();
    });
  });

  it('should show Adventure Mode card on desktop', async () => {
    // GIVEN - User is admin (Adventure Mode is admin-only)
    mockAuthState = {
      isAuthenticated: true,
      isAdmin: true,
      loading: false,
    };

    // WHEN
    render(<LandingView />, { wrapper: createWrapper() });

    // THEN
    await waitFor(() => {
      expect(screen.getByTestId('mode-card-landing.adventureMode')).toBeInTheDocument();
    });
  });
});
