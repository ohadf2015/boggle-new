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
vi.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: (...args: any[]) => mockMarkComplete(...args),
  markOnboardingSkipped: (...args: any[]) => mockMarkSkipped(...args),
  hasCompletedOnboarding: () => false,
  consumePendingRoomInvite: () => mockConsumePendingRoom(),
  hasPendingRoomInvite: () => mockHasPendingRoom(),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
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

vi.mock('../ScoreRevealV2', () => {
  return {
    __esModule: true,
    default: ({ onContinue, onSkip }: any) => (
      <div data-testid="score-reveal">
        <button onClick={onContinue}>Continue</button>
        {onSkip && <button onClick={onSkip}>Skip</button>}
      </div>
    ),
  };
});

import OnboardingFlow from '../OnboardingFlow';

describe('OnboardingFlow', () => {
  const defaultProps = {
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPendingRoom.mockReturnValue(false);
    mockConsumePendingRoom.mockReturnValue(null);
  });

  const pickLanguage = () => fireEvent.click(screen.getByText('Select Language'));
  const goNewUser = () => fireEvent.click(screen.getByText("I'm New Here"));
  const selectLanguage = () => {
    pickLanguage();
    goNewUser();
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

  it('transitions to tutorial when returning user chooses new here', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    expect(screen.getByTestId('tutorial-game')).toBeInTheDocument();
  });

  it('transitions to profile setup after tutorial completes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    expect(screen.getByTestId('quick-profile-setup')).toBeInTheDocument();
  });

  it('transitions to score reveal after profile setup', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
  });

  it('navigates to cozy practice hub after score reveal continue', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    expect(mockPush).toHaveBeenCalledWith('/en/practice');
  });

  it('advances to score reveal after profile setup', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
  });

  it('calls onComplete after score reveal continue', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('marks onboarding as complete when flow finishes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    expect(mockMarkComplete).toHaveBeenCalled();
  });

  it('renders full-screen with no visible header/footer', () => {
    render(<OnboardingFlow {...defaultProps} />);
    const flow = screen.getByTestId('onboarding-flow');
    expect(flow).toBeInTheDocument();
    expect(flow.className).toContain('fixed');
  });

  describe('navigation loading state', () => {
    it('shows a loading overlay after score reveal continue', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Continue'));
      expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();
    });

    it('does not show a loading overlay before continue is clicked', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      expect(screen.queryByTestId('onboarding-loading')).not.toBeInTheDocument();
    });

    it('ignores duplicate continue clicks while navigating', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Continue'));
      fireEvent.click(screen.getByText('Continue'));
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending room invite', () => {
    const advanceToProfile = () => {
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
    };

    it('redirects to multiplayer room directly from profile when pending invite exists', () => {
      mockHasPendingRoom.mockReturnValue(true);
      mockConsumePendingRoom.mockReturnValue('ABC123');
      render(<OnboardingFlow {...defaultProps} />);
      advanceToProfile();
      fireEvent.click(screen.getByText('Set Profile'));
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=ABC123');
    });

    it('redirects to cozy practice hub after continue when no pending invite', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      advanceToProfile();
      fireEvent.click(screen.getByText('Set Profile'));
      expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Continue'));
      expect(mockPush).toHaveBeenCalledWith('/en/practice');
    });
  });
});
