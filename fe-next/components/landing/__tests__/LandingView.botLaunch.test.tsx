/**
 * LandingView Bot Launch Tests
 *
 * Tests for direct bot game launch functionality from landing page
 * Follows TDD: These tests are written FIRST (RED phase), then implementation (GREEN phase)
 */

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}));

// Mock next/dynamic - handles all dynamic imports
vi.mock('next/dynamic', () => {
  const React = require('react');
  return { default: vi.fn((loader: any, options?: any) => {
    // Create a mock component that will be used for all dynamic imports
    const DynamicComponent = (props: any) => {
      return React.createElement('div', { 'data-testid': 'dynamic-component', ...props });
    };
    DynamicComponent.displayName = 'DynamicComponent';
    return DynamicComponent;
  }) };
});

// Mock onboardingStorage
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: vi.fn(() => true),
  markOnboardingSkipped: vi.fn(),
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  setContext: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) => callback({ setLevel: vi.fn() })),
  Severity: { Error: 'error', Warning: 'warning', Info: 'info' },
}));

vi.mock('@/utils/sentry', () => ({
  setSentryUserContext: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock OnboardingModal
vi.mock('@/components/OnboardingModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock ProfileCustomizationModal
vi.mock('@/components/ProfileCustomizationModal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock DailyChallengeBanner
vi.mock('@/components/daily/DailyChallengeBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-challenge-banner">Daily Challenge</div>,
}));

// Mock ThemeContext
vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
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
vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({
    socket: null,
    isConnected: false,
    connectionError: null,
  }),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useLiveRoomStats hook
vi.mock('@/hooks/useLiveRoomStats', () => ({
  useLiveRoomStats: () => ({
    stats: null,
    isLoading: false,
  }),
}));

// Mock MusicContext with unlockAudio
const mockUnlockAudio = vi.fn();
const mockPlayTrack = vi.fn();
vi.mock('@/contexts/MusicContext', () => ({
  useMusic: vi.fn(() => ({
    playTrack: mockPlayTrack,
    stopMusic: vi.fn(),
    unlockAudio: mockUnlockAudio,
    TRACKS: { LOBBY: 'lobby' },
    currentTrack: null,
    isPlaying: false,
  })),
}));

vi.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header">Header</header>,
}));

vi.mock('@/components/SocialProof', () => ({
  __esModule: true,
  default: () => <div data-testid="social-proof">Social Proof</div>,
}));

vi.mock('../ModeCard', () => ({
  __esModule: true,
  default: ({ title, href }: { title: string; href: string }) => (
    <a href={href} data-testid={`mode-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {title}
    </a>
  ),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, onClick, ...props }: any) => (
      <div onClick={onClick} {...props}>{children}</div>
    ),
    p: ({ children, ...props }: any) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useMouseParallax: () => ({
    transform: 'translateX(0px) translateY(0px)',
  }),
  useTiltEffect: () => ({
    transform: 'translateX(0px) translateY(0px)',
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    canHandleAnimations: true,
    isLowEnd: false,
  }),
}));

vi.mock('@/components/ui/IdleMascot', () => ({
  IdleMascotWithEntrance: () => <div data-testid="idle-mascot">Mascot</div>,
}));

vi.mock('@/utils/perfVariant', () => ({
  getPerfVariant: () => 'standard',
}));

vi.mock('@/components/ui/PlayfulBackground', () => ({
  PlayfulBackground: () => <div data-testid="playful-background">Background</div>,
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/ui/Loader', () => ({
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
    vi.clearAllMocks();
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
