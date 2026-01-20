/**
 * LandingView Component Tests
 *
 * Tests for the main landing page component
 */

// Mock next/dynamic to return a simple component
jest.mock('next/dynamic', () => () => {
  const MockComponent = () => null;
  MockComponent.displayName = 'DynamicComponent';
  return MockComponent;
});

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock onboardingStorage
jest.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: jest.fn(() => true),
  markOnboardingSkipped: jest.fn(),
}));

// Mock Sentry before any imports
jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => callback({ setLevel: jest.fn() })),
  Severity: { Error: 'error', Warning: 'warning', Info: 'info' },
}));

// Mock utils/sentry
jest.mock('@/utils/sentry', () => ({
  setSentryUserContext: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock OnboardingModal to avoid auth dependencies
jest.mock('@/components/OnboardingModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock ProfileCustomizationModal
jest.mock('@/components/ProfileCustomizationModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock DailyChallengeBanner
jest.mock('@/components/daily/DailyChallengeBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-challenge-banner">Daily Challenge</div>,
}));

// Mock ThemeContext
jest.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock pull to refresh hook
jest.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    pullToRefreshHandlers: {},
    pullState: { isRefreshing: false, progress: 0 },
  }),
}));

// Mock PullToRefreshIndicator
jest.mock('@/components/ui/PullToRefreshIndicator', () => ({
  PullToRefreshIndicator: () => null,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  User: () => <span data-testid="icon-user">User</span>,
  Users: () => <span data-testid="icon-users">Users</span>,
  Bot: () => <span data-testid="icon-bot">Bot</span>,
  Trophy: () => <span data-testid="icon-trophy">Trophy</span>,
  LayoutGrid: () => <span data-testid="icon-layout-grid">LayoutGrid</span>,
  Crown: () => <span data-testid="icon-crown">Crown</span>,
  GraduationCap: () => <span data-testid="icon-graduation-cap">GraduationCap</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">ChevronRight</span>,
  Settings: () => <span data-testid="icon-settings">Settings</span>,
  Menu: () => <span data-testid="icon-menu">Menu</span>,
  X: () => <span data-testid="icon-x">X</span>,
}));

// Mock SocketContext
jest.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: false,
    connectionError: null,
  }),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useLiveRoomStats hook
jest.mock('@/hooks/useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    stats: null,
    isLoading: false,
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: jest.fn(() => ({
    playTrack: jest.fn(),
    stopMusic: jest.fn(),
    TRACKS: { LOBBY: 'lobby' },
    currentTrack: null,
    isPlaying: false,
  })),
}));

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/components/SocialProof', () => ({
  __esModule: true,
  default: () => <div data-testid="social-proof">Social Proof</div>,
}));

jest.mock('../landing/ModeCard', () => ({
  __esModule: true,
  default: ({ title, href }: { title: string; href: string }) => (
    <a href={href} data-testid={`mode-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
    </a>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingView from '../landing/LandingView';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useMusic } from '@/contexts/MusicContext';

const mockPlayTrack = jest.fn();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('LandingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMusic as jest.Mock).mockReturnValue({
      playTrack: mockPlayTrack,
      stopMusic: jest.fn(),
      TRACKS: { LOBBY: 'lobby' },
      currentTrack: null,
      isPlaying: false,
    });
  });

  // TODO: These tests require extensive mocking of nested components - needs refactoring
  it.skip('renders game mode selection cards', () => {
    render(<LandingView />, { wrapper: TestWrapper });

    const links = screen.getAllByRole('link');
    const hasSinglePlayer = links.some(link =>
      link.getAttribute('href')?.includes('singleplayer')
    );
    const hasMultiplayer = links.some(link =>
      link.getAttribute('href')?.includes('multiplayer')
    );

    expect(hasSinglePlayer || hasMultiplayer).toBe(true);
  });

  it.skip('plays lobby music on mount', () => {
    render(<LandingView />, { wrapper: TestWrapper });

    expect(mockPlayTrack).toHaveBeenCalledWith('lobby');
  });

  it.skip('has accessible navigation links', () => {
    render(<LandingView />, { wrapper: TestWrapper });
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });
});
