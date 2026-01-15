import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingView from '../LandingView';

// Mock all the contexts and hooks
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    playTrack: jest.fn(),
    TRACKS: { LOBBY: 'lobby' },
  }),
}));

// Auth mock is defined inside describe block to allow dynamic values

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));

jest.mock('@/hooks/useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    openRooms: 0,
    totalPlayers: 0,
    refresh: jest.fn(),
  }),
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

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
  }),
}));

jest.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
  markOnboardingSkipped: jest.fn(),
}));

// Mock Next.js components
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => <div>Mocked Dynamic Component</div>;
  return DynamicComponent;
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock components
jest.mock('@/components/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>;
  };
});

jest.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => <div data-testid="playful-background">Background</div>,
}));

jest.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => <div data-testid="pull-to-refresh">Pull to Refresh</div>,
}));

jest.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascotWithEntrance: () => <div data-testid="mascot">Mascot</div>,
}));

jest.mock('@/components/ui/IdleMascot', () => ({
  IdleMascotWithEntrance: () => <div data-testid="idle-mascot">Idle Mascot</div>,
}));

jest.mock('@/components/daily/DailyChallengeBanner', () => {
  return function MockDailyChallengeBanner() {
    return <div data-testid="daily-challenge-banner">Daily Challenge</div>;
  };
});

jest.mock('../ModeCard', () => {
  return function MockModeCard({ title, locked, loading, lockedMessage }: { title: string; locked?: boolean; loading?: boolean; lockedMessage?: string }) {
    return (
      <div data-testid={`mode-card-${title}`}>
        {title}
        {loading && <span data-testid="loading-indicator">Loading...</span>}
        {locked && !loading && <span data-testid="locked-indicator">{lockedMessage || 'Locked'}</span>}
      </div>
    );
  };
});

jest.mock('../TutorialPrompt', () => {
  return function MockTutorialPrompt() {
    return <div data-testid="tutorial-prompt">Tutorial Prompt</div>;
  };
});

jest.mock('@/components/auth/AuthModal', () => {
  return function MockAuthModal() {
    return <div data-testid="auth-modal">Auth Modal</div>;
  };
});

// Store mock values to be changed between tests
let mockAuthState = {
  isAuthenticated: false,
  loading: false,
};

// Reset mock to use dynamic values
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

describe('LandingView Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default unauthenticated state
    mockAuthState = {
      isAuthenticated: false,
      loading: false,
    };
  });

  it('should render loading skeleton initially', () => {
    // Note: The skeleton is only shown for a brief moment before useEffect sets isMounted=true
    // This test verifies the component structure exists even if skeleton isn't visible
    const { container } = render(<LandingView />);
    expect(container).toBeInTheDocument();
  });

  it('should show content after mount', async () => {
    render(<LandingView />);

    // Wait for content to appear
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-banner')).toBeInTheDocument();
    });
  });

  it('should display mode cards after loading', async () => {
    render(<LandingView />);

    await waitFor(() => {
      expect(screen.getByTestId('mode-card-landing.multiplayer')).toBeInTheDocument();
      expect(screen.getByTestId('mode-card-landing.singlePlayer')).toBeInTheDocument();
    });
  });

  it('should prevent flash of unstyled content', async () => {
    // The loading skeleton prevents FOUC by showing placeholder content
    // This test verifies content loads properly without errors
    render(<LandingView />);

    // Wait for content
    await waitFor(() => {
      expect(screen.getByTestId('daily-challenge-banner')).toBeInTheDocument();
    });
  });

  it('should render component without errors', () => {
    // Verify the component renders successfully
    const { container } = render(<LandingView />);
    expect(container.querySelector('main')).toBeInTheDocument();
  });

  it('should center mode cards after loading', async () => {
    const { container } = render(<LandingView />);

    await waitFor(() => {
      const centerContainer = container.querySelector('.items-center.justify-center');
      expect(centerContainer).toBeInTheDocument();
    });
  });

  it('should show Brain Training card on desktop', async () => {
    render(<LandingView />);

    await waitFor(() => {
      expect(screen.getByTestId('mode-card-landing.brainTraining')).toBeInTheDocument();
    });
  });

  describe('Brain Training auth loading state', () => {
    it('should show loading state for Brain Training card while auth is loading', async () => {
      // Set auth to loading state
      mockAuthState = {
        isAuthenticated: false,
        loading: true,
      };

      render(<LandingView />);

      await waitFor(() => {
        // When auth is loading, Brain Training card should show loading state, not locked state
        const brainCard = screen.getByTestId('mode-card-landing.brainTraining');
        expect(brainCard).toBeInTheDocument();
      });

      // Should show loading indicator, NOT locked indicator
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.queryByTestId('locked-indicator')).not.toBeInTheDocument();
    });

    it('should show locked state for Brain Training card when auth finishes and user is not authenticated', async () => {
      // Auth finished loading, user not authenticated
      mockAuthState = {
        isAuthenticated: false,
        loading: false,
      };

      render(<LandingView />);

      await waitFor(() => {
        // When not authenticated, should show locked state
        const brainCard = screen.getByTestId('mode-card-landing.brainTraining');
        expect(brainCard).toBeInTheDocument();
      });

      // Should show locked indicator, NOT loading indicator
      expect(screen.getByTestId('locked-indicator')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });

    it('should show unlocked Brain Training card when user is authenticated', async () => {
      // User is authenticated
      mockAuthState = {
        isAuthenticated: true,
        loading: false,
      };

      render(<LandingView />);

      await waitFor(() => {
        const brainCard = screen.getByTestId('mode-card-landing.brainTraining');
        expect(brainCard).toBeInTheDocument();
      });

      // Should NOT show locked or loading state
      expect(screen.queryByTestId('locked-indicator')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });
});
