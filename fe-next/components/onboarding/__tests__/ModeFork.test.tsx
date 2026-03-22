import { render, screen, fireEvent } from '@testing-library/react';
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
  const MotionButton = React.forwardRef(function MotionButton(
    { children, ...props }: any,
    ref: any
  ) {
    return (
      <button ref={ref} {...props}>
        {children}
      </button>
    );
  });
  const MotionP = React.forwardRef(function MotionP(
    { children, ...props }: any,
    ref: any
  ) {
    return (
      <p ref={ref} {...props}>
        {children}
      </p>
    );
  });
  return {
    motion: { div: MotionDiv, button: MotionButton, p: MotionP },
    AnimatePresence: function AnimatePresence({ children }: any) {
      return <>{children}</>;
    },
  };
});

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Trophy: () => <div data-testid="trophy-icon" />,
  Target: () => <div data-testid="target-icon" />,
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'onboarding.ftue.dailyChallenge': 'Daily Challenge',
        'onboarding.ftue.practiceMode': 'Practice Mode',
        'onboarding.ftue.moreModesUnlock': 'More modes unlock as you play!',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

import ModeFork from '../ModeFork';

describe('ModeFork', () => {
  const defaultProps = {
    onSelectMode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the mode fork component', () => {
    render(<ModeFork {...defaultProps} />);
    expect(screen.getByTestId('mode-fork')).toBeInTheDocument();
  });

  it('shows exactly 2 mode options', () => {
    render(<ModeFork {...defaultProps} />);
    expect(screen.getByText('Daily Challenge')).toBeInTheDocument();
    expect(screen.getByText('Practice Mode')).toBeInTheDocument();
  });

  it('shows unlock subtitle', () => {
    render(<ModeFork {...defaultProps} />);
    expect(
      screen.getByText('More modes unlock as you play!')
    ).toBeInTheDocument();
  });

  it('calls onSelectMode with "daily" when Daily Challenge clicked', () => {
    render(<ModeFork {...defaultProps} />);
    fireEvent.click(screen.getByText('Daily Challenge'));
    expect(defaultProps.onSelectMode).toHaveBeenCalledWith('daily');
  });

  it('calls onSelectMode with "practice" when Practice Mode clicked', () => {
    render(<ModeFork {...defaultProps} />);
    fireEvent.click(screen.getByText('Practice Mode'));
    expect(defaultProps.onSelectMode).toHaveBeenCalledWith('practice');
  });

  it('renders trophy icon for daily challenge', () => {
    render(<ModeFork {...defaultProps} />);
    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
  });

  it('renders target icon for practice mode', () => {
    render(<ModeFork {...defaultProps} />);
    expect(screen.getByTestId('target-icon')).toBeInTheDocument();
  });
});
