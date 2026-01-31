/**
 * CinematicPlayer Component Tests
 *
 * Tests for the cinematic player wrapper with skip functionality.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock Remotion Player
jest.mock('@remotion/player', () => ({
  Player: jest.fn(({ inputProps }) => (
    <div data-testid="mock-remotion-player">
      {inputProps?.testContent || 'Mock Player'}
    </div>
  )),
}));

// Mock usePrefersReducedMotion
jest.mock('../../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(() => false),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock LanguageContext
jest.mock('../../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'adventure.bosses.cinematics.skip': 'Skip',
        'adventure.bosses.cinematics.skipIn': `Skip in ${params?.seconds || 2}...`,
        'adventure.bosses.cinematics.progress': 'Cinematic progress',
        'adventure.bosses.cinematics.loading': 'Loading...',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock timers
jest.useFakeTimers();

import { CinematicPlayer } from '../CinematicPlayer';
import { SKIP_DELAY_MS } from '../../../../../hooks/useCinematic';
import { usePrefersReducedMotion } from '../../../../../hooks/usePrefersReducedMotion';

// Mock composition component
const MockComposition = () => <div>Mock Cinematic Content</div>;

describe('CinematicPlayer', () => {
  const defaultProps = {
    composition: MockComposition,
    durationSeconds: 8,
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    (usePrefersReducedMotion as jest.Mock).mockReturnValue(false);
  });

  describe('rendering', () => {
    it('should render the player container', () => {
      render(<CinematicPlayer {...defaultProps} />);

      expect(screen.getByTestId('cinematic-player')).toBeInTheDocument();
    });

    it('should render Remotion Player', () => {
      render(<CinematicPlayer {...defaultProps} />);

      expect(screen.getByTestId('mock-remotion-player')).toBeInTheDocument();
    });

    it('should render skip button', () => {
      render(<CinematicPlayer {...defaultProps} />);

      expect(screen.getByTestId('skip-button')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      render(<CinematicPlayer {...defaultProps} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should apply fullscreen classes by default', () => {
      render(<CinematicPlayer {...defaultProps} />);

      const container = screen.getByTestId('cinematic-player');
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black');
    });

    it('should apply relative classes when fullscreen is false', () => {
      render(<CinematicPlayer {...defaultProps} fullscreen={false} />);

      const container = screen.getByTestId('cinematic-player');
      expect(container).toHaveClass('relative');
      expect(container).not.toHaveClass('fixed');
    });
  });

  describe('skip button behavior', () => {
    it('should disable skip button initially', () => {
      render(<CinematicPlayer {...defaultProps} />);

      const skipButton = screen.getByTestId('skip-button');
      expect(skipButton).toBeDisabled();
    });

    it('should show countdown before skip is available', () => {
      render(<CinematicPlayer {...defaultProps} />);

      expect(screen.getByText(/Skip in 2/)).toBeInTheDocument();
    });

    it('should enable skip button after SKIP_DELAY_MS', () => {
      render(<CinematicPlayer {...defaultProps} />);

      const skipButton = screen.getByTestId('skip-button');
      expect(skipButton).toBeDisabled();

      act(() => {
        jest.advanceTimersByTime(SKIP_DELAY_MS);
      });

      expect(skipButton).not.toBeDisabled();
    });

    it('should show skip text with ESC hint after delay', () => {
      render(<CinematicPlayer {...defaultProps} />);

      act(() => {
        jest.advanceTimersByTime(SKIP_DELAY_MS);
      });

      expect(screen.getByText('Skip')).toBeInTheDocument();
      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    it('should call onComplete when skip button is clicked', () => {
      const onComplete = jest.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);

      // Enable skip
      act(() => {
        jest.advanceTimersByTime(SKIP_DELAY_MS);
      });

      // Click skip
      fireEvent.click(screen.getByTestId('skip-button'));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not call onComplete when skip button is clicked before delay', () => {
      const onComplete = jest.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);

      // Try to click before skip is enabled
      fireEvent.click(screen.getByTestId('skip-button'));

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('keyboard controls', () => {
    it('should skip on ESC key after delay', () => {
      const onComplete = jest.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);

      // Enable skip
      act(() => {
        jest.advanceTimersByTime(SKIP_DELAY_MS);
      });

      // Press ESC
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not skip on ESC key before delay', () => {
      const onComplete = jest.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);

      // Press ESC before skip is enabled
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should not skip on other keys', () => {
      const onComplete = jest.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);

      // Enable skip
      act(() => {
        jest.advanceTimersByTime(SKIP_DELAY_MS);
      });

      // Press other keys
      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: ' ' });
      fireEvent.keyDown(window, { key: 'a' });

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('reduced motion', () => {
    it('should show loading state when reduced motion is preferred', () => {
      (usePrefersReducedMotion as jest.Mock).mockReturnValue(true);

      render(<CinematicPlayer {...defaultProps} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should not render Remotion Player when reduced motion is preferred', () => {
      (usePrefersReducedMotion as jest.Mock).mockReturnValue(true);

      render(<CinematicPlayer {...defaultProps} />);

      expect(screen.queryByTestId('mock-remotion-player')).not.toBeInTheDocument();
    });

    it('should auto-complete after delay when reduced motion is preferred', () => {
      const onComplete = jest.fn();
      (usePrefersReducedMotion as jest.Mock).mockReturnValue(true);

      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);

      // Should complete after brief delay
      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom props', () => {
    it('should use custom testId', () => {
      render(<CinematicPlayer {...defaultProps} testId="custom-player" />);

      expect(screen.getByTestId('custom-player')).toBeInTheDocument();
    });

    it('should pass compositionProps to Player', () => {
      const { Player } = require('@remotion/player');

      render(
        <CinematicPlayer
          {...defaultProps}
          compositionProps={{ testContent: 'Custom Content' }}
        />
      );

      // Find the call with matching inputProps
      const calls = Player.mock.calls;
      const matchingCall = calls.find(
        (call: unknown[]) => call[0]?.inputProps?.testContent === 'Custom Content'
      );
      expect(matchingCall).toBeTruthy();
    });

    it('should calculate correct duration frames', () => {
      const { Player } = require('@remotion/player');
      Player.mockClear();

      render(
        <CinematicPlayer
          {...defaultProps}
          durationSeconds={10}
          fps={30}
        />
      );

      // Find the call with matching durationInFrames
      const calls = Player.mock.calls;
      const matchingCall = calls.find(
        (call: unknown[]) => call[0]?.durationInFrames === 300
      );
      expect(matchingCall).toBeTruthy();
    });
  });
});
