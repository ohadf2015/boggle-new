import { render, screen, fireEvent, act } from '@testing-library/react';
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

// Mock sub-components
vi.mock('../TutorialGame', () => {
  return {
    __esModule: true,
    default: ({ onComplete }: any) => (
      <div data-testid="tutorial-game">
        <button onClick={() => onComplete(47, ['CAT', 'DOG', 'STAR'])}>
          Complete Tutorial
        </button>
      </div>
    ),
  };
});

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
  default: ({ onNew }: any) => (
    <div data-testid="returning-user-step">
      <button onClick={onNew}>I&apos;m New Here</button>
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
      activeSteps: ['language', 'returningUser', 'calmMode', 'tutorial', 'profile', 'inviteTutorial'],
      handleInviteTeaserComplete: vi.fn(),
    });
  });

  const pickLanguage = () => fireEvent.click(screen.getByText('Select Language'));
  const goNewUser = () => fireEvent.click(screen.getByText("I'm New Here"));
  const chooseEnergetic = () => fireEvent.click(screen.getByText('Energetic'));
  // Full path to the tutorial: language → new-here → calm/energetic vibe choice.
  const selectLanguage = () => {
    pickLanguage();
    goNewUser();
    chooseEnergetic();
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

  it('skips the vibe choice for non-admins (soft launch gate) — goes straight to tutorial', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, isAdmin: false });
    render(<OnboardingFlow {...defaultProps} />);
    pickLanguage();
    goNewUser();
    expect(screen.queryByTestId('calm-mode-choice')).not.toBeInTheDocument();
    expect(screen.getByTestId('tutorial-game')).toBeInTheDocument();
  });

  it('advances to the tutorial after the vibe choice', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    expect(screen.getByTestId('tutorial-game')).toBeInTheDocument();
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

  it('transitions to profile setup after tutorial completes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    expect(screen.getByTestId('quick-profile-setup')).toBeInTheDocument();
  });

  it('navigates to practice hub directly after profile setup (no score-reveal interstitial)', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    expect(mockPush).toHaveBeenCalledWith('/en/practice');
  });

  it('calls onComplete after profile setup', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('marks onboarding as complete when flow finishes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    expect(mockMarkComplete).toHaveBeenCalled();
  });

  it('renders full-screen with no visible header/footer', () => {
    render(<OnboardingFlow {...defaultProps} />);
    const flow = screen.getByTestId('onboarding-flow');
    expect(flow).toBeInTheDocument();
    expect(flow.className).toContain('fixed');
  });

  describe('navigation loading state', () => {
    it('shows a loading overlay after profile setup triggers navigation', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();
    });

    it('does not show a loading overlay before profile is submitted', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      expect(screen.queryByTestId('onboarding-loading')).not.toBeInTheDocument();
    });

    it('ignores duplicate profile submissions while navigating', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Set Profile'));
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending room invite', () => {
    const advanceToProfile = () => {
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
    };

    it('advances to InviteTutorialTeaser step when pending invite exists', () => {
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
      expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/multiplayer?room='));
    });

    it('redirects to cozy practice hub on profile setup when no pending invite', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      advanceToProfile();
      fireEvent.click(screen.getByText('Set Profile'));
      expect(mockPush).toHaveBeenCalledWith('/en/practice');
    });
  });
});
