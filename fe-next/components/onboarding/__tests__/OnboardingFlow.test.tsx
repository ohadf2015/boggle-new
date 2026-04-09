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

vi.mock('../ScoreReveal', () => {
  return {
    __esModule: true,
    default: ({ onTryAgain, onContinue }: any) => (
      <div data-testid="score-reveal">
        <button onClick={onTryAgain}>Try Again</button>
        <button onClick={onContinue}>Continue</button>
      </div>
    ),
  };
});

vi.mock('../ModeFork', () => {
  return {
    __esModule: true,
    default: ({ onSelectMode, hasPendingInvite }: any) => (
      <div data-testid="mode-fork">
        {hasPendingInvite && (
          <button onClick={() => onSelectMode('joinRoom')}>Join Room</button>
        )}
        <button onClick={() => onSelectMode('daily')}>Daily</button>
        <button onClick={() => onSelectMode('practice')}>Practice</button>
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

  const selectLanguage = () => fireEvent.click(screen.getByText('Select Language'));

  it('starts with the language select step', () => {
    render(<OnboardingFlow {...defaultProps} />);
    expect(screen.getByTestId('language-select')).toBeInTheDocument();
  });

  it('transitions to tutorial after language select', () => {
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

  it('transitions to mode fork after score reveal continue', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByTestId('mode-fork')).toBeInTheDocument();
  });

  it('advances to score reveal after profile setup', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
  });

  it('calls onComplete when a mode is selected', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Daily'));
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('marks onboarding as complete when flow finishes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    selectLanguage();
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Daily'));
    expect(mockMarkComplete).toHaveBeenCalled();
  });

  it('renders full-screen with no visible header/footer', () => {
    render(<OnboardingFlow {...defaultProps} />);
    const flow = screen.getByTestId('onboarding-flow');
    expect(flow).toBeInTheDocument();
    expect(flow.className).toContain('fixed');
  });

  describe('navigation loading state', () => {
    it('shows a loading overlay after a mode is selected', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Continue'));
      fireEvent.click(screen.getByText('Daily'));
      expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument();
    });

    it('does not show a loading overlay before any mode is selected', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Continue'));
      expect(screen.queryByTestId('onboarding-loading')).not.toBeInTheDocument();
    });

    it('ignores duplicate mode selections while navigating', () => {
      render(<OnboardingFlow {...defaultProps} />);
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Continue'));
      fireEvent.click(screen.getByText('Daily'));
      fireEvent.click(screen.getByText('Daily'));
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending room invite', () => {
    const advanceToProfile = () => {
      selectLanguage();
      fireEvent.click(screen.getByText('Complete Tutorial'));
    };

    const advanceToModeFork = () => {
      advanceToProfile();
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Continue'));
    };

    it('redirects to multiplayer room directly from profile when pending invite exists', () => {
      mockHasPendingRoom.mockReturnValue(true);
      mockConsumePendingRoom.mockReturnValue('ABC123');
      render(<OnboardingFlow {...defaultProps} />);
      advanceToProfile();
      fireEvent.click(screen.getByText('Set Profile'));
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=ABC123');
    });

    it('redirects to daily when no pending invite and daily selected', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      advanceToProfile();
      // Click Set Profile — should advance to scoreReveal
      fireEvent.click(screen.getByText('Set Profile'));
      // Now we should be on score-reveal
      expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Continue'));
      fireEvent.click(screen.getByText('Daily'));
      expect(mockPush).toHaveBeenCalledWith('/en/daily');
    });

    it('redirects to singleplayer when no pending invite and practice selected', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      advanceToModeFork();
      fireEvent.click(screen.getByText('Practice'));
      expect(mockPush).toHaveBeenCalledWith('/en/singleplayer?autoStart=practice');
    });
  });
});
