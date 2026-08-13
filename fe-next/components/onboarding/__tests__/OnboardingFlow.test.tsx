import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef(function MotionComponent(
      { children, ...props }: any,
      ref: any
    ) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  const motion = new Proxy({} as Record<string, any>, {
    get: (_target, prop: string) => createMotionComponent(prop),
  });
  return {
    motion,
    m: motion,
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock onboardingStorage
const mockMarkComplete = vi.fn();
const mockMarkSkipped = vi.fn();
const mockConsumePendingRoom = vi.fn((): string | null => null);
const mockHasPendingRoom = vi.fn(() => false);
const mockGetPendingRoom = vi.fn(() => null);
vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: (...args: any[]) => mockMarkComplete(...args),
  markOnboardingSkipped: (...args: any[]) => mockMarkSkipped(...args),
  hasCompletedOnboarding: () => false,
  consumePendingRoomInvite: () => mockConsumePendingRoom(),
  hasPendingRoomInvite: () => mockHasPendingRoom(),
  getPendingRoomInvite: () => mockGetPendingRoom(),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en',
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/utils/profileStorage', () => ({
  setStoredCustomAvatar: vi.fn(),
  getStoredCustomAvatar: vi.fn(() => null),
}));

// Mock getGuestStats to return returning user (1+ games) so ReturningUserStep appears in flow.
// POLICY: Brand-new (0 games) skip ReturningUserStep; returning users see it.
vi.mock('@/utils/guestManager', async () => {
  const actual = await vi.importActual('@/utils/guestManager');
  return {
    ...actual,
    getGuestStats: () => ({ games: 1, wins: 0, words: 0, score: 0 }),
  };
});

// Controllable auth mock — Calm Mode onboarding step is admin-gated, so most
// tests run as admin; one test flips to non-admin to assert the step is skipped.
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/auth/AuthModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('../ReturningUserStep', () => ({
  __esModule: true,
  default: ({ onNew, onSkip }: any) => (
    <div data-testid="returning-user-step">
      <button onClick={onNew}>I&apos;m New Here</button>
      <button onClick={onSkip}>Skip</button>
    </div>
  ),
}));

vi.mock('../LanguageSelect', () => {
  return {
    __esModule: true,
    default: ({ onSelect }: any) => (
      <div data-testid="language-select">
        <button onClick={onSelect}>Select Language</button>
      </div>
    ),
  };
});

vi.mock('../QuickProfileSetup', () => {
  return {
    __esModule: true,
    default: ({ onComplete }: any) => (
      <div data-testid="quick-profile-setup">
        <button onClick={() => onComplete('Player1', {})}>Set Profile</button>
      </div>
    ),
  };
});

// The new final step — picking a music/theme style. Confirming finishes onboarding.
// Still reachable in the invite flow only; the base flow no longer includes it.
vi.mock('../StyleSelectStep', () => ({
  __esModule: true,
  default: ({ onComplete }: any) => (
    <div data-testid="style-select-step">
      <button onClick={onComplete}>Finish Style</button>
    </div>
  ),
}));

// The whole base FTUE, collapsed onto one screen.
vi.mock('../QuickStartStep', () => ({
  __esModule: true,
  default: ({ onPlay, onHowToPlay, onHaveAccount }: any) => (
    <div data-testid="quick-start-step">
      <button onClick={() => onPlay('Player1', {}, false)}>Play</button>
      <button onClick={onHowToPlay}>How To Play</button>
      {onHaveAccount && <button onClick={onHaveAccount}>Have Account</button>}
    </div>
  ),
}));

vi.mock('@/components/HowToPlay', () => ({
  __esModule: true,
  default: ({ onClose }: any) => (
    <div data-testid="how-to-play">
      <button onClick={onClose}>Close How To Play</button>
    </div>
  ),
}));

vi.mock('../InviteTutorialTeaser', () => ({
  __esModule: true,
  default: () => <div data-testid="invite-tutorial-teaser" />,
}));

vi.mock('../CalmModeChoice', () => ({
  __esModule: true,
  default: ({ onChoose }: any) => (
    <div data-testid="calm-mode-choice">
      <button onClick={() => onChoose(false)}>Energetic</button>
      <button onClick={() => onChoose(true)}>Calm</button>
    </div>
  ),
}));

const mockUpdateSetting = vi.fn();
vi.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({ updateSetting: mockUpdateSetting }),
}));

vi.mock('@/hooks/useInviteOnboardingMode');

import OnboardingFlow from '../OnboardingFlow';
import * as useInviteModule from '@/hooks/useInviteOnboardingMode';

const mockUseInviteOnboardingMode = vi.mocked(useInviteModule.useInviteOnboardingMode);

describe('OnboardingFlow', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, isAdmin: true });
    mockHasPendingRoom.mockReturnValue(false);
    mockConsumePendingRoom.mockReturnValue(null);
    // Explicit reset: clearAllMocks() clears calls but NOT implementations, and
    // the entry step is now decided by reading this at mount — a leaked value
    // from a previous test would silently start the flow on the invite path.
    mockGetPendingRoom.mockReturnValue(null);
    mockUseInviteOnboardingMode.mockReturnValue({
      isInviteMode: false,
      inviteAtMount: null,
      activeSteps: ['quickStart'],
      handleInviteTeaserComplete: vi.fn(),
    });
  });

  const goNewUser = () => fireEvent.click(screen.getByText("I'm New Here"));
  const chooseEnergetic = () => fireEvent.click(screen.getByText('Energetic'));
  // Admin path to the one screen: new-here → calm/energetic vibe → quick start.
  // (Non-admins skip the vibe step.)
  const advanceToQuickStart = () => {
    goNewUser();
    chooseEnergetic();
  };
  const finishFlow = () => {
    advanceToQuickStart();
    fireEvent.click(screen.getByText('Play'));
  };

  // A returning guest (1+ games — see the getGuestStats mock) still gets the
  // account re-engagement prompt. Brand-new players skip it entirely.
  it('starts a returning guest on the account re-engagement step', () => {
    render(<OnboardingFlow {...defaultProps} />);
    expect(screen.getByTestId('returning-user-step')).toBeInTheDocument();
  });

  it('shows the calm/energetic vibe choice when an admin chooses new here', () => {
    render(<OnboardingFlow {...defaultProps} />);
    goNewUser();
    expect(screen.getByTestId('calm-mode-choice')).toBeInTheDocument();
  });

  it('skips the vibe choice for non-admins (soft launch gate) — goes straight to quick start', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, isAdmin: false });
    render(<OnboardingFlow {...defaultProps} />);
    goNewUser();
    expect(screen.queryByTestId('calm-mode-choice')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-start-step')).toBeInTheDocument();
  });

  it('enables cosy mode when the player picks Calm', () => {
    render(<OnboardingFlow {...defaultProps} />);
    goNewUser();
    fireEvent.click(screen.getByText('Calm'));
    expect(mockUpdateSetting).toHaveBeenCalledWith('cosyMode', true);
  });

  it('leaves cosy mode off when the player picks Energetic', () => {
    render(<OnboardingFlow {...defaultProps} />);
    goNewUser();
    chooseEnergetic();
    expect(mockUpdateSetting).toHaveBeenCalledWith('cosyMode', false);
  });

  // The point of the collapse: no language step, no separate profile step and
  // no style step stand between the player and the game.
  it('never shows the old language, profile or style steps in the base flow', () => {
    render(<OnboardingFlow {...defaultProps} />);
    advanceToQuickStart();
    expect(screen.getByTestId('quick-start-step')).toBeInTheDocument();
    expect(screen.queryByTestId('language-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('quick-profile-setup')).not.toBeInTheDocument();
    expect(screen.queryByTestId('style-select-step')).not.toBeInTheDocument();
  });

  it('navigates straight into a practice game from the play button', () => {
    render(<OnboardingFlow {...defaultProps} />);
    finishFlow();
    expect(mockPush).toHaveBeenCalledWith('/en/practice/classic?play=1&firstGame=1');
  });

  it('calls onComplete after play', () => {
    render(<OnboardingFlow {...defaultProps} />);
    finishFlow();
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('marks onboarding as complete when flow finishes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    finishFlow();
    expect(mockMarkComplete).toHaveBeenCalled();
  });

  it('records the name the player actually started with', () => {
    render(<OnboardingFlow {...defaultProps} />);
    finishFlow();
    expect(mockMarkComplete).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Player1' })
    );
  });

  // The tutorial is offered, never imposed: opening it must not end onboarding
  // or navigate anywhere.
  it('opens the tutorial on demand without leaving the flow', () => {
    render(<OnboardingFlow {...defaultProps} />);
    advanceToQuickStart();
    expect(screen.queryByTestId('how-to-play')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('How To Play'));

    expect(screen.getByTestId('how-to-play')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(defaultProps.onComplete).not.toHaveBeenCalled();
  });

  it('closes the tutorial and returns to the quick start screen', () => {
    render(<OnboardingFlow {...defaultProps} />);
    advanceToQuickStart();
    fireEvent.click(screen.getByText('How To Play'));
    fireEvent.click(screen.getByText('Close How To Play'));
    expect(screen.queryByTestId('how-to-play')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-start-step')).toBeInTheDocument();
  });

  it('renders full-screen with no visible header/footer', () => {
    render(<OnboardingFlow {...defaultProps} />);
    const flow = screen.getByTestId('onboarding-flow');
    expect(flow).toBeInTheDocument();
    expect(flow.className).toContain('fixed');
  });

  describe('navigation loading state', () => {
    it('shows a loading overlay once play triggers navigation', () => {
      render(<OnboardingFlow {...defaultProps} />);
      finishFlow();
      expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();
    });

    it('does not show a loading overlay before the player presses play', () => {
      render(<OnboardingFlow {...defaultProps} />);
      advanceToQuickStart();
      expect(screen.queryByTestId('onboarding-loading')).not.toBeInTheDocument();
    });

    it('ignores duplicate play taps while navigating', () => {
      render(<OnboardingFlow {...defaultProps} />);
      advanceToQuickStart();
      fireEvent.click(screen.getByText('Play'));
      fireEvent.click(screen.getByText('Play'));
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending room invite', () => {
    it('advances to InviteTutorialTeaser step when pending invite exists (no style step)', () => {
      mockGetPendingRoom.mockReturnValue({ code: 'ABC123', hostName: 'Alice', ts: Date.now() });
      mockHasPendingRoom.mockReturnValue(true);
      mockUseInviteOnboardingMode.mockReturnValue({
        isInviteMode: true,
        inviteAtMount: { code: 'ABC123', hostName: 'Alice' },
        activeSteps: ['language', 'profile', 'inviteTutorial'],
        handleInviteTeaserComplete: vi.fn(),
      });
      render(<OnboardingFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Select Language'));
      fireEvent.click(screen.getByText('Set Profile'));
      expect(screen.getByTestId('invite-tutorial-teaser')).toBeInTheDocument();
      expect(screen.queryByTestId('style-select-step')).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/multiplayer?room='));
    });

    it('redirects to the practice game on play when no pending invite', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      finishFlow();
      expect(mockPush).toHaveBeenCalledWith('/en/practice/classic?play=1&firstGame=1');
    });
  });

  describe('skip onboarding navigation', () => {
    it('lands a brand-new player on the home page (not multiplayer) when they skip with no pending invite', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Skip'));
      expect(mockPush).toHaveBeenCalledWith('/en');
      expect(mockPush).not.toHaveBeenCalledWith('/en/multiplayer');
    });

    it('still honors a pending room invite on skip (joins multiplayer room)', () => {
      mockConsumePendingRoom.mockReturnValue('ABC123');
      render(<OnboardingFlow {...defaultProps} />);
      fireEvent.click(screen.getByText('Skip'));
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=ABC123');
    });
  });

  // The FTUE is a fixed full-screen takeover on the home route; it flags
  // <html>.onboarding-active so the (route-blind) native + web ad layers stay
  // suppressed for the whole first run — see shouldSuppressBanner / shouldLoadAdSense.
  describe('ad-free onboarding signal', () => {
    afterEach(() => {
      document.documentElement.classList.remove('onboarding-active');
    });

    it('flags html.onboarding-active while the flow is mounted', () => {
      render(<OnboardingFlow {...defaultProps} />);
      expect(document.documentElement.classList.contains('onboarding-active')).toBe(true);
    });

    it('clears the flag on unmount so ads resume after onboarding', () => {
      const { unmount } = render(<OnboardingFlow {...defaultProps} />);
      expect(document.documentElement.classList.contains('onboarding-active')).toBe(true);
      unmount();
      expect(document.documentElement.classList.contains('onboarding-active')).toBe(false);
    });
  });
});
