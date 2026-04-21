import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
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
vi.mock('lucide-react', () => ({
  Trophy: () => <div data-testid="trophy-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Home: () => <div data-testid="home-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'onboarding.ftue.dailyChallenge': 'Daily Challenge',
        'onboarding.ftue.practiceMode': 'Practice Mode',
        'onboarding.ftue.skip': 'Skip',
        'onboarding.ftue.joinFriendsGame': "Join Friend's Game",
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
    onSelectMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the mode fork component', () => {
    render(<ModeFork {...defaultProps} />);
    expect(screen.getByTestId('mode-fork')).toBeInTheDocument();
  });

  it('shows primary mode options plus skip', () => {
    render(<ModeFork {...defaultProps} />);
    expect(screen.getByText('Daily Challenge')).toBeInTheDocument();
    expect(screen.getByText('Practice Mode')).toBeInTheDocument();
    expect(screen.getByTestId('mode-fork-skip')).toBeInTheDocument();
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

  it('calls onSelectMode with "home" when Skip clicked', () => {
    render(<ModeFork {...defaultProps} />);
    fireEvent.click(screen.getByTestId('mode-fork-skip'));
    expect(defaultProps.onSelectMode).toHaveBeenCalledWith('home');
  });

  describe('with pending room invite', () => {
    it('shows "Join Friend\'s Game" button when hasPendingInvite is true', () => {
      render(<ModeFork {...defaultProps} hasPendingInvite />);
      expect(screen.getByText("Join Friend's Game")).toBeInTheDocument();
      expect(screen.getByTestId('join-room-button')).toBeInTheDocument();
    });

    it('does not show join button when hasPendingInvite is false', () => {
      render(<ModeFork {...defaultProps} hasPendingInvite={false} />);
      expect(screen.queryByTestId('join-room-button')).not.toBeInTheDocument();
    });

    it('does not show join button when hasPendingInvite is omitted', () => {
      render(<ModeFork {...defaultProps} />);
      expect(screen.queryByTestId('join-room-button')).not.toBeInTheDocument();
    });

    it('calls onSelectMode with "joinRoom" when join button clicked', () => {
      render(<ModeFork {...defaultProps} hasPendingInvite />);
      fireEvent.click(screen.getByText("Join Friend's Game"));
      expect(defaultProps.onSelectMode).toHaveBeenCalledWith('joinRoom');
    });

    it('still shows all mode options alongside join button', () => {
      render(<ModeFork {...defaultProps} hasPendingInvite />);
      expect(screen.getByText('Daily Challenge')).toBeInTheDocument();
      expect(screen.getByText('Practice Mode')).toBeInTheDocument();
      expect(screen.getByTestId('mode-fork-skip')).toBeInTheDocument();
      expect(screen.getByText("Join Friend's Game")).toBeInTheDocument();
    });
  });
});
