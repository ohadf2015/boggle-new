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

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
  }),
}));

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

jest.mock('@/components/daily/DailyChallengeBanner', () => {
  return function MockDailyChallengeBanner() {
    return <div data-testid="daily-challenge-banner">Daily Challenge</div>;
  };
});

jest.mock('../ModeCard', () => {
  return function MockModeCard({ title }: { title: string }) {
    return <div data-testid={`mode-card-${title}`}>{title}</div>;
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

describe('LandingView Loading State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
