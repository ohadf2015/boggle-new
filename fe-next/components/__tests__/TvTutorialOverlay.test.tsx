import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TvTutorialOverlay, {
  isTvTutorialComplete,
  resetTvTutorial,
  TvHelpButton,
} from '@/host/components/tv-broadcast/TvTutorialOverlay';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <button {...domProps}>{children}</button>;
    },
    h2: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <h2 {...domProps}>{children}</h2>;
    },
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <p {...domProps}>{children}</p>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  X: () => <span data-testid="x-icon">✕</span>,
  Tv: () => <span data-testid="tv-icon">TV</span>,
  QrCode: () => <span data-testid="qr-icon">QR</span>,
  LayoutGrid: () => <span data-testid="grid-icon">Grid</span>,
  Trophy: () => <span data-testid="trophy-icon">Trophy</span>,
  Timer: () => <span data-testid="timer-icon">Timer</span>,
  HelpCircle: () => <span data-testid="help-icon">?</span>,
  LogOut: () => <span data-testid="logout-icon">Exit</span>,
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('TvTutorialOverlay', () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'tvTutorial.welcome.title': 'Welcome to TV Mode',
      'tvTutorial.welcome.description': 'You watch on the big screen — players play on their phones. You are not playing in this mode.',
      'tvTutorial.qr.title': 'QR Code & Room Code',
      'tvTutorial.qr.description': 'Players scan to join',
      'tvTutorial.grid.title': 'Game Grid',
      'tvTutorial.grid.description': 'Letters appear here',
      'tvTutorial.leaderboard.title': 'Leaderboard',
      'tvTutorial.leaderboard.description': 'Track scores in real-time',
      'tvTutorial.timer.title': 'Timer',
      'tvTutorial.timer.description': 'Countdown to victory',
      'tvTutorial.exit.title': 'Leaving TV Mode',
      'tvTutorial.exit.description': 'Tap Switch to Player Mode in the lobby to jump in and play yourself.',
      'tvTutorial.letsGo': "Let's Go!",
      'tvTutorial.ariaLabel': 'TV Mode Tutorial',
      'tvTutorial.help': 'Show Tutorial',
      'common.skip': 'Skip',
      'common.next': 'Next',
      'common.previous': 'Back',
    };
    return translations[key] || key;
  };

  const defaultProps = {
    onComplete: vi.fn(),
    onSkip: vi.fn(),
    t: mockT,
    forceShow: true, // Force show to bypass localStorage check in tests
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('Rendering', () => {
    it('should render the first step initially', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      expect(screen.getByText('Welcome to TV Mode')).toBeInTheDocument();
      expect(screen.getByText(/You are not playing in this mode/i)).toBeInTheDocument();
      expect(screen.getByText('1 / 6')).toBeInTheDocument();
    });

    it('should render progress indicators for all steps', () => {
      const { container } = render(<TvTutorialOverlay {...defaultProps} />);

      // 6 progress dots (welcome, qr, grid, leaderboard, timer, exit)
      const progressDots = container.querySelectorAll('.h-1.flex-1.rounded-full');
      expect(progressDots).toHaveLength(6);
    });

    it('explains how to exit TV mode on the final step', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      // Advance through to the last (exit) step
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Next|Let's Go!/i }));
      }

      expect(screen.getByText('Leaving TV Mode')).toBeInTheDocument();
      expect(screen.getByText(/Switch to Player Mode/i)).toBeInTheDocument();
      expect(screen.getByText('6 / 6')).toBeInTheDocument();
    });

    it('should render skip button', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      const skipButton = screen.getByRole('button', { name: 'Skip' });
      expect(skipButton).toBeInTheDocument();
    });

    it('should not render when tutorial is complete and forceShow is false', () => {
      mockLocalStorage.getItem.mockReturnValue('true');

      const { container } = render(
        <TvTutorialOverlay {...defaultProps} forceShow={false} />
      );

      // Should not render anything when complete
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should advance to next step when clicking Next', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      // First step
      expect(screen.getByText('Welcome to TV Mode')).toBeInTheDocument();

      // Click next
      fireEvent.click(screen.getByText('Next'));

      // Second step
      expect(screen.getByText('QR Code & Room Code')).toBeInTheDocument();
      expect(screen.getByText('2 / 6')).toBeInTheDocument();
    });

    it('should go back when clicking Back', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      // Go to second step
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText('QR Code & Room Code')).toBeInTheDocument();

      // Click back
      fireEvent.click(screen.getByText('Back'));

      // Back to first step
      expect(screen.getByText('Welcome to TV Mode')).toBeInTheDocument();
    });

    it('should not show Back button on first step', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      expect(screen.queryByText('Back')).not.toBeInTheDocument();
    });

    it('should show "Let\'s Go!" on last step instead of Next', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Next|Let's Go!/i }));
      }

      expect(screen.getByText("Let's Go!")).toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('should call onComplete when finishing last step', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      // Navigate to last step and complete
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Next|Let's Go!/i }));
      }

      expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Skip functionality', () => {
    it('should call onSkip when clicking skip button', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

      expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
    });

    it('should mark tutorial as complete when skipping', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'lexiclash_tv_tutorial_complete',
        'true'
      );
    });
  });

  describe('Keyboard navigation', () => {
    it('should advance on ArrowRight key', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'ArrowRight' });

      expect(screen.getByText('QR Code & Room Code')).toBeInTheDocument();
    });

    it('should go back on ArrowLeft key', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      // Advance first
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText('QR Code & Room Code')).toBeInTheDocument();

      // Go back
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByText('Welcome to TV Mode')).toBeInTheDocument();
    });

    it('should skip on Escape key', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(defaultProps.onSkip).toHaveBeenCalledTimes(1);
    });

    it('should advance on Enter key', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(screen.getByText('QR Code & Room Code')).toBeInTheDocument();
    });

    it('should advance on Space key', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      fireEvent.keyDown(window, { key: ' ' });

      expect(screen.getByText('QR Code & Room Code')).toBeInTheDocument();
    });
  });

  describe('localStorage persistence', () => {
    it('should mark tutorial complete on finish', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      // Complete tutorial
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Next|Let's Go!/i }));
      }

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'lexiclash_tv_tutorial_complete',
        'true'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog role and aria-label', () => {
      render(<TvTutorialOverlay {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'TV Mode Tutorial');
    });
  });
});

describe('Helper functions', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('isTvTutorialComplete', () => {
    it('should return false when not completed', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      expect(isTvTutorialComplete()).toBe(false);
    });

    it('should return true when completed', () => {
      mockLocalStorage.getItem.mockReturnValue('true');
      expect(isTvTutorialComplete()).toBe(true);
    });
  });

  describe('resetTvTutorial', () => {
    it('should remove the completion key from localStorage', () => {
      resetTvTutorial();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'lexiclash_tv_tutorial_complete'
      );
    });
  });
});

describe('TvHelpButton', () => {
  const mockT = (key: string) => (key === 'tvTutorial.help' ? 'Show Tutorial' : key);

  it('should render help icon', () => {
    render(<TvHelpButton onClick={vi.fn()} t={mockT} />);

    expect(screen.getByTestId('help-icon')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<TvHelpButton onClick={onClick} t={mockT} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should have proper aria-label', () => {
    render(<TvHelpButton onClick={vi.fn()} t={mockT} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Show Tutorial');
  });
});
