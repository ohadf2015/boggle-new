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
vi.mock('../StyleSelectStep', () => ({
  __esModule: true,
  default: ({ onComplete }: any) => (
    <div data-testid="style-select-step">
      <button onClick={onComplete}>Finish Style</button>
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
    mockUseInviteOnboardingMode.mockReturnValue({
      isInviteMode: false,
      inviteAtMount: null,
      activeSteps: ['language', 'returningUser', 'profile', 'style'],
      handleInviteTeaserComplete: vi.fn(),
    });
  });

  const pickLanguage = () => fireEvent.click(screen.getByText('Select Language'));
  const goNewUser = () => fireEvent.click(screen.getByText("I'm New Here"));
  const chooseEnergetic = () => fireEvent.click(screen.getByText('Energetic'));
  // Admin path to the profile step: language → new-here → calm/energetic vibe.
  // (Non-admins skip the vibe step.)
  const advanceToProfile = () => {
    pickLanguage();
    goNewUser();
    chooseEnergetic();
  };
  // Full path to navigation: profile → style → finish.
  const finishFlow = () => {
    advanceToProfile();
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Finish Style'));
  };

  it('starts with the language select step', () => {
    render(<OnboardingFlow {...defaultProps} />);
    expect(screen.getByTestId('language-select')).toBeInTheDocument();
  });

  it('transitions to returning user after language select', () => {
    render(<OnboardingFlow {...defaultProps} />);
    pickLanguage();
    expect(screen.getByTestId('returning-user-step')).toBeInTheDocument();
  });

  it('shows the calm/energetic vibe choice when an admin chooses new here', () => {
    render(<OnboardingFlow {...defaultProps} />);
    pickLanguage();
    goNewUser();
    expect(screen.getByTestId('calm-mode-choice')).toBeInTheDocument();
  });

  it('skips the vibe choice for non-admins (soft launch gate) — goes straight to profile', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, isAdmin: false });
    render(<OnboardingFlow {...defaultProps} />);
    pickLanguage();
    goNewUser();
    expect(screen.queryByTestId('calm-mode-choice')).not.toBeInTheDocument();
    expect(screen.getByTestId('quick-profile-setup')).toBeInTheDocument();
  });

  it('advances to profile setup after the vibe choice', () => {
    render(<OnboardingFlow {...defaultProps} />);
    advanceToProfile();
    expect(screen.getByTestId('quick-profile-setup')).toBeInTheDocument();
  });

  it('enables cosy mode when the player picks Calm', () => {
    render(<OnboardingFlow {...defaultProps} />);
    pickLanguage();
    goNewUser();
    fireEvent.click(screen.getByText('Calm'));
    expect(mockUpdateSetting).toHaveBeenCalledWith('cosyMode', true);
  });

  it('leaves cosy mode off when the player picks Energetic', () => {
    render(<OnboardingFlow {...defaultProps} />);
    pickLanguage();
    goNewUser();
    chooseEnergetic();
    expect(mockUpdateSetting).toHaveBeenCalledWith('cosyMode', false);
  });

  it('advances to the style step after profile setup (no tutorial game)', () => {
    render(<OnboardingFlow {...defaultProps} />);
    advanceToProfile();
    fireEvent.click(screen.getByText('Set Profile'));
    expect(screen.getByTestId('style-select-step')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('navigates to practice hub after the style step', () => {
    render(<OnboardingFlow {...defaultProps} />);
    finishFlow();
    expect(mockPush).toHaveBeenCalledWith('/en/practice');
  });

  it('calls onComplete after the style step', () => {
    render(<OnboardingFlow {...defaultProps} />);
    finishFlow();
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('marks onboarding as complete when flow finishes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    finishFlow();
    expect(mockMarkComplete).toHaveBeenCalled();
  });

  it('renders full-screen with no visible header/footer', () => {
    render(<OnboardingFlow {...defaultProps} />);
    const flow = screen.getByTestId('onboarding-flow');
    expect(flow).toBeInTheDocument();
    expect(flow.className).toContain('fixed');
  });

  describe('navigation loading state', () => {
    it('shows a loading overlay after the style step triggers navigation', () => {
      render(<OnboardingFlow {...defaultProps} />);
      finishFlow();
      expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();
    });

    it('does not show a loading overlay before the style step is finished', () => {
      render(<OnboardingFlow {...defaultProps} />);
      advanceToProfile();
      fireEvent.click(screen.getByText('Set Profile'));
      expect(screen.queryByTestId('onboarding-loading')).not.toBeInTheDocument();
    });

    it('ignores duplicate style submissions while navigating', () => {
      render(<OnboardingFlow {...defaultProps} />);
      advanceToProfile();
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Finish Style'));
      fireEvent.click(screen.getByText('Finish Style'));
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

    it('redirects to cozy practice hub after the style step when no pending invite', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      finishFlow();
      expect(mockPush).toHaveBeenCalledWith('/en/practice');
    });
  });

  describe('skip onboarding navigation', () => {
    it('lands a brand-new player on the home page (not multiplayer) when they skip with no pending invite', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      pickLanguage();
      fireEvent.click(screen.getByText('Skip'));
      expect(mockPush).toHaveBeenCalledWith('/en');
      expect(mockPush).not.toHaveBeenCalledWith('/en/multiplayer');
    });

    it('still honors a pending room invite on skip (joins multiplayer room)', () => {
      mockConsumePendingRoom.mockReturnValue('ABC123');
      render(<OnboardingFlow {...defaultProps} />);
      pickLanguage();
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
