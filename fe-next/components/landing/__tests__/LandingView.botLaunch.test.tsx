/**
 * LandingView Bot Launch Tests
 *
 * Tests for direct bot game launch functionality from landing page
 * Follows TDD: These tests are written FIRST (RED phase), then implementation (GREEN phase)
 */

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}));

// Mock next/dynamic - handles all dynamic imports
jest.mock('next/dynamic', () => {
  const React = require('react');
  return jest.fn((loader: any, options?: any) => {
    // Create a mock component that will be used for all dynamic imports
    const DynamicComponent = (props: any) => {
      return React.createElement('div', { 'data-testid': 'dynamic-component', ...props });
    };
    DynamicComponent.displayName = 'DynamicComponent';
    return DynamicComponent;
  });
});

// Mock onboardingStorage
jest.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: jest.fn(() => true),
  markOnboardingSkipped: jest.fn(),
}));

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => callback({ setLevel: jest.fn() })),
  Severity: { Error: 'error', Warning: 'warning', Info: 'info' },
}));

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

// Mock OnboardingModal
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
  Map: () => <span data-testid="icon-map">Map</span>,
  Sparkles: () => <span data-testid="icon-sparkles">Sparkles</span>,
  Gift: () => <span data-testid="icon-gift">Gift</span>,
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

// Mock MusicContext with unlockAudio
const mockUnlockAudio = jest.fn();
const mockPlayTrack = jest.fn();
jest.mock('@/contexts/MusicContext', () => ({
  useMusic: jest.fn(() => ({
    playTrack: mockPlayTrack,
    stopMusic: jest.fn(),
    unlockAudio: mockUnlockAudio,
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

jest.mock('../ModeCard', () => ({
  __esModule: true,
  default: ({ title, href }: { title: string; href: string }) => (
    <a href={href} data-testid={`mode-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
    </a>
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, ...props }: any) => (
      <div onClick={onClick} {...props}>{children}</div>
    ),
    p: ({ children, ...props }: any) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));

jest.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({
    transform: 'translateX(0px) translateY(0px)',
  }),
  useTiltEffect: () => ({
    transform: 'translateX(0px) translateY(0px)',
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    canHandleAnimations: true,
    isLowEnd: false,
  }),
}));

jest.mock('@/components/ui/IdleMascot', () => ({
  IdleMascotWithEntrance: () => <div data-testid="idle-mascot">Mascot</div>,
}));

jest.mock('@/utils/perfVariant', () => ({
  getPerfVariant: () => 'standard',
}));

jest.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => <div data-testid="playful-background">Background</div>,
}));

jest.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ui/Loader', () => ({
  Loader: () => <div data-testid="loader">Loading...</div>,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingView from '../LandingView';
import { LanguageProvider } from '@/contexts/LanguageContext';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('LandingView - Direct Bot Game Launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Player Button Behavior', () => {
    it('should call unlockAudio when Single Player button is clicked', () => {
      // GIVEN: Landing page is rendered
      render(<LandingView />, { wrapper: TestWrapper });

      // WHEN: User clicks Single Player button
      const singlePlayerLink = screen.getByLabelText(/Single Player/i);
      fireEvent.click(singlePlayerLink);

      // THEN: unlockAudio should be called to enable audio autoplay
      expect(mockUnlockAudio).toHaveBeenCalledTimes(1);
    });

    it('should navigate to /singleplayer?autoStart=bots when Single Player is clicked', () => {
      // GIVEN: Landing page is rendered
      render(<LandingView />, { wrapper: TestWrapper });

      // WHEN: User clicks Single Player button
      const singlePlayerLink = screen.getByLabelText(/Single Player/i);
      fireEvent.click(singlePlayerLink);

      // THEN: Should navigate to singleplayer with autoStart=bots param
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/singleplayer?autoStart=bots'));
    });

    it('should call unlockAudio BEFORE navigation', () => {
      // GIVEN: Landing page is rendered
      const callOrder: string[] = [];

      mockUnlockAudio.mockImplementation(() => {
        callOrder.push('unlockAudio');
      });

      mockPush.mockImplementation(() => {
        callOrder.push('router.push');
      });

      render(<LandingView />, { wrapper: TestWrapper });

      // WHEN: User clicks Single Player button
      const singlePlayerLink = screen.getByLabelText(/Single Player/i);
      fireEvent.click(singlePlayerLink);

      // THEN: unlockAudio should be called before router.push
      expect(callOrder).toEqual(['unlockAudio', 'router.push']);
    });

    it('should maintain existing styling and accessibility attributes', () => {
      // GIVEN: Landing page is rendered
      render(<LandingView />, { wrapper: TestWrapper });

      // WHEN: Looking at Single Player button
      const singlePlayerLink = screen.getByLabelText(/Single Player/i);

      // THEN: Should have proper aria-label and visible text
      expect(singlePlayerLink).toHaveAttribute('aria-label');
      expect(singlePlayerLink.getAttribute('aria-label')).toContain('Single Player');
      expect(singlePlayerLink).toHaveTextContent(/Single Player/i);
    });

    it('should render Single Player button as clickable element', () => {
      // GIVEN: Landing page is rendered
      render(<LandingView />, { wrapper: TestWrapper });

      // WHEN: Looking at Single Player button
      const singlePlayerLink = screen.getByLabelText(/Single Player/i);

      // THEN: Should be a clickable element (button or link)
      expect(singlePlayerLink).toBeInTheDocument();
      expect(singlePlayerLink.tagName).toMatch(/BUTTON|A/i);
    });
  });
});
