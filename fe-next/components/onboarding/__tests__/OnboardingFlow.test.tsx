import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv(
    { children, ...props }: any,
    ref: any
  ) {
    return (
      <div ref={ref} {...props}>
        {children}
      </div>
    );
  });
  return {
    motion: { div: MotionDiv },
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock onboardingStorage
const mockMarkComplete = jest.fn();
const mockMarkSkipped = jest.fn();
const mockConsumePendingRoom = jest.fn((): string | null => null);
const mockHasPendingRoom = jest.fn(() => false);
jest.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: (...args: any[]) => mockMarkComplete(...args),
  markOnboardingSkipped: (...args: any[]) => mockMarkSkipped(...args),
  hasCompletedOnboarding: () => false,
  consumePendingRoomInvite: () => mockConsumePendingRoom(),
  hasPendingRoomInvite: () => mockHasPendingRoom(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock sub-components
jest.mock('../TutorialGame', () => {
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

jest.mock('../QuickProfileSetup', () => {
  return {
    __esModule: true,
    default: ({ onComplete, onSkip }: any) => (
      <div data-testid="quick-profile-setup">
        <button onClick={() => onComplete('Player1', {})}>Set Profile</button>
        <button onClick={() => onSkip()}>Skip Profile</button>
      </div>
    ),
  };
});

jest.mock('../ScoreReveal', () => {
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

jest.mock('../ModeFork', () => {
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
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with the tutorial game step', () => {
    render(<OnboardingFlow {...defaultProps} />);
    expect(screen.getByTestId('tutorial-game')).toBeInTheDocument();
  });

  it('transitions to profile setup after tutorial completes', () => {
    render(<OnboardingFlow {...defaultProps} />);
    fireEvent.click(screen.getByText('Complete Tutorial'));
    expect(screen.getByTestId('quick-profile-setup')).toBeInTheDocument();
  });

  it('transitions to score reveal after profile setup', () => {
    render(<OnboardingFlow {...defaultProps} />);
    // Complete tutorial
    fireEvent.click(screen.getByText('Complete Tutorial'));
    // Complete profile
    fireEvent.click(screen.getByText('Set Profile'));
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
  });

  it('transitions to mode fork after score reveal continue', () => {
    render(<OnboardingFlow {...defaultProps} />);
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByTestId('mode-fork')).toBeInTheDocument();
  });

  it('skipping profile also advances to score reveal', () => {
    render(<OnboardingFlow {...defaultProps} />);
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Skip Profile'));
    expect(screen.getByTestId('score-reveal')).toBeInTheDocument();
  });

  it('calls onComplete when a mode is selected', () => {
    render(<OnboardingFlow {...defaultProps} />);
    fireEvent.click(screen.getByText('Complete Tutorial'));
    fireEvent.click(screen.getByText('Set Profile'));
    fireEvent.click(screen.getByText('Continue'));
    fireEvent.click(screen.getByText('Daily'));
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('marks onboarding as complete when flow finishes', () => {
    render(<OnboardingFlow {...defaultProps} />);
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

  describe('pending room invite', () => {
    const advanceToModeFork = () => {
      fireEvent.click(screen.getByText('Complete Tutorial'));
      fireEvent.click(screen.getByText('Set Profile'));
      fireEvent.click(screen.getByText('Continue'));
    };

    it('redirects to multiplayer room when pending invite exists and daily selected', () => {
      mockConsumePendingRoom.mockReturnValue('ABC123');
      render(<OnboardingFlow {...defaultProps} />);
      advanceToModeFork();
      fireEvent.click(screen.getByText('Daily'));
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=ABC123');
    });

    it('redirects to multiplayer room when pending invite exists and practice selected', () => {
      mockConsumePendingRoom.mockReturnValue('XYZ789');
      render(<OnboardingFlow {...defaultProps} />);
      advanceToModeFork();
      fireEvent.click(screen.getByText('Practice'));
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=XYZ789');
    });

    it('redirects to multiplayer room when joinRoom selected', () => {
      mockHasPendingRoom.mockReturnValue(true);
      mockConsumePendingRoom.mockReturnValue('ROOM42');
      render(<OnboardingFlow {...defaultProps} />);
      advanceToModeFork();
      fireEvent.click(screen.getByText('Join Room'));
      expect(mockPush).toHaveBeenCalledWith('/en/multiplayer?room=ROOM42');
    });

    it('redirects to daily when no pending invite and daily selected', () => {
      mockConsumePendingRoom.mockReturnValue(null);
      render(<OnboardingFlow {...defaultProps} />);
      advanceToModeFork();
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
