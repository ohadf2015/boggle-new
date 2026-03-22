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
jest.mock('@/utils/onboardingStorage', () => ({
  markOnboardingComplete: (...args: any[]) => mockMarkComplete(...args),
  markOnboardingSkipped: (...args: any[]) => mockMarkSkipped(...args),
  hasCompletedOnboarding: () => false,
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
    default: ({ onSelectMode }: any) => (
      <div data-testid="mode-fork">
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
});
