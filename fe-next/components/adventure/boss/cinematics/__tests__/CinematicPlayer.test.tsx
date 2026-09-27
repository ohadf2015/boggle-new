/**
 * CinematicPlayer Component Tests
 *
 * Tests for the cinematic player wrapper with skip functionality.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Mock Remotion Player — stores event listeners so we can simulate frameupdate
const { playerEventListeners, playerCalls } = vi.hoisted(() => ({
  playerEventListeners: {} as Record<string, ((...args: unknown[]) => void)[]>,
  playerCalls: [] as any[][],
}));

vi.mock('@remotion/player', async () => {
  const React = await import('react');
  const instance = {
    addEventListener: (event: string, handler: (...args: unknown[]) => void) => {
      if (!playerEventListeners[event]) playerEventListeners[event] = [];
      playerEventListeners[event].push(handler);
    },
    removeEventListener: (event: string, handler: (...args: unknown[]) => void) => {
      if (playerEventListeners[event]) {
        playerEventListeners[event] = playerEventListeners[event].filter((h: unknown) => h !== handler);
      }
    },
  };

  const Player = React.forwardRef((props: any, ref: any) => {
    playerCalls.push([props]);
    React.useImperativeHandle(ref, () => instance);
    return React.createElement('div', { 'data-testid': 'mock-remotion-player' },
      props.inputProps?.testContent || 'Mock Player');
  }) as any;
  Player.displayName = 'MockPlayer';
  Player.mock = { calls: playerCalls };
  Player.mockClear = () => { playerCalls.length = 0; };
  return { Player };
});

// Mock usePrefersReducedMotion
vi.mock('../../../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: vi.fn(() => false),
}));

// Mock useDevicePerformance
vi.mock('../../../../../hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    targetFPS: 60,
    throttleMs: 16,
    enableComplexAnimations: true,
    enableGlowEffects: true,
    reduceParticles: false,
    maxParticles: 20,
    isSlowConnection: false,
    isMobile: false,
    prefersReducedMotion: false,
  }),
}));

// Mock CinematicFallback (needed when stall detection fires)
vi.mock('../CinematicFallback', () => ({
  CinematicFallback: (props: Record<string, unknown>) => (
    <div data-testid="cinematic-fallback" data-type={props.cinematicType}>
      Fallback Active
    </div>
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock LanguageContext
vi.mock('../../../../../contexts/LanguageContext', () => {
  const mockT = (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'adventure.bosses.cinematics.skip': 'Skip',
      'adventure.bosses.cinematics.skipIn': `Skip in ${params?.seconds || 2}...`,
      'adventure.bosses.cinematics.progress': 'Cinematic progress',
      'adventure.bosses.cinematics.loading': 'Loading...',
      'adventure.bosses.cinematics.errorTapToSkip': 'Tap Skip to continue',
    };
    return translations[key] || key;
  };
  return {
    useLanguage: () => ({ t: mockT }),
    useLanguageSafe: () => ({ t: mockT }),
  };
});

// Mock timers
vi.useFakeTimers();

// Import after mocks
import { CinematicPlayer } from '../CinematicPlayer';
import { SKIP_DELAY_MS } from '../../../../../hooks/useCinematic';
import { usePrefersReducedMotion } from '../../../../../hooks/usePrefersReducedMotion';

// Mock composition component
const MockComposition = () => <div>Mock Cinematic Content</div>;

describe('CinematicPlayer', () => {
  const defaultProps = {
    composition: MockComposition,
    durationSeconds: 8,
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    jest.clearAllTimers();
    // Clear player event listeners
    Object.keys(playerEventListeners).forEach(key => {
      delete playerEventListeners[key];
    });
    (usePrefersReducedMotion as jest.Mock).mockReturnValue(false);
  });

  // Helper to wait for loading state to complete + simulate first frame
  // to prevent stall detection from firing
  const waitForReady = () => {
    act(() => {
      vi.advanceTimersByTime(200); // Wait for loading delay (100ms + buffer)
    });
    // Simulate a frameupdate event so stall detection doesn't fire
    act(() => {
      if (playerEventListeners['frameupdate']) {
        playerEventListeners['frameupdate'].forEach(h => h({ detail: { frame: 1 } }));
      }
    });
  };

  // Helper to wait for skip to be enabled
  const waitForSkipEnabled = () => {
    act(() => {
      vi.advanceTimersByTime(SKIP_DELAY_MS);
    });
  };

  describe('rendering', () => {
    it('should render the player container', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      expect(screen.getByTestId('cinematic-player')).toBeInTheDocument();
    });

    it('should render Remotion Player after loading', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      expect(screen.getByTestId('mock-remotion-player')).toBeInTheDocument();
    });

    it('should render skip button after loading', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      expect(screen.getByTestId('skip-button')).toBeInTheDocument();
    });

    it('should render progress bar after loading', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should apply fullscreen classes by default', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      const container = screen.getByTestId('cinematic-player');
      expect(container).toHaveClass('fixed', 'inset-0', 'z-50', 'bg-black');
    });

    it('should apply relative classes when fullscreen is false', () => {
      render(<CinematicPlayer {...defaultProps} fullscreen={false} />);
      waitForReady();

      const container = screen.getByTestId('cinematic-player');
      expect(container).toHaveClass('relative');
      expect(container).not.toHaveClass('fixed');
    });
  });

  describe('skip button behavior', () => {
    it('should disable skip button initially', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      const skipButton = screen.getByTestId('skip-button');
      expect(skipButton).toBeDisabled();
    });

    it('should show countdown before skip is available', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      expect(screen.getByText(/Skip in/i)).toBeInTheDocument();
    });

    it('should enable skip button after SKIP_DELAY_MS', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();

      const skipButton = screen.getByTestId('skip-button');
      expect(skipButton).toBeDisabled();

      waitForSkipEnabled();

      expect(skipButton).not.toBeDisabled();
    });

    it('should show skip text with ESC hint after delay', () => {
      render(<CinematicPlayer {...defaultProps} />);
      waitForReady();
      waitForSkipEnabled();

      expect(screen.getByText('Skip')).toBeInTheDocument();
      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    it('should call onComplete when skip button is clicked', () => {
      const onComplete = vi.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);
      waitForReady();
      waitForSkipEnabled();

      // Click skip
      fireEvent.click(screen.getByTestId('skip-button'));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not call onComplete when skip button is clicked before delay', () => {
      const onComplete = vi.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);
      waitForReady();

      // Try to click before skip is enabled
      fireEvent.click(screen.getByTestId('skip-button'));

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('keyboard controls', () => {
    it('should skip on ESC key after delay', () => {
      const onComplete = vi.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);
      waitForReady();
      waitForSkipEnabled();

      // Press ESC
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not skip on ESC key before delay', () => {
      const onComplete = vi.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);
      waitForReady();

      // Press ESC before skip is enabled
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should not skip on other keys', () => {
      const onComplete = vi.fn();
      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);
      waitForReady();
      waitForSkipEnabled();

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
      const onComplete = vi.fn();
      (usePrefersReducedMotion as jest.Mock).mockReturnValue(true);

      render(<CinematicPlayer {...defaultProps} onComplete={onComplete} />);

      // Should complete after brief delay
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom props', () => {
    it('should use custom testId', () => {
      render(<CinematicPlayer {...defaultProps} testId="custom-player" />);
      waitForReady();

      expect(screen.getByTestId('custom-player')).toBeInTheDocument();
    });

    it('should pass compositionProps to Player', () => {
      render(
        <CinematicPlayer
          {...defaultProps}
          compositionProps={{ testContent: 'Custom Content' }}
        />
      );
      waitForReady();

      // The mock Player renders inputProps.testContent as text
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('should render player with custom duration and fps', () => {
      render(
        <CinematicPlayer
          {...defaultProps}
          durationSeconds={10}
          fps={30}
        />
      );
      waitForReady();

      // Player renders and progress bar exists (duration is used internally)
      expect(screen.getByTestId('mock-remotion-player')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('portrait mobile letterbox', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
      // Simulate portrait mobile (390x844)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 390,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 844,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: originalInnerHeight,
      });
    });

    it('should use 16:9 letterbox height in portrait fullscreen mode', () => {
      playerCalls.length = 0;

      render(<CinematicPlayer {...defaultProps} fullscreen />);
      waitForReady();

      // In portrait (390x844), height should be 390 * (720/1280) ≈ 219, not 844
      const calls = playerCalls as unknown[][];
      const lastCall = calls[calls.length - 1]?.[0] as Record<string, unknown>;
      const style = lastCall?.style as React.CSSProperties | undefined;
      const height = style?.height;

      // Height should be letterboxed: ~219px, NOT 100vh (844px)
      const expectedHeight = Math.round(390 * (720 / 1280));
      expect(height).toBe(expectedHeight);
    });

    it('should keep full width in portrait fullscreen mode', () => {
      playerCalls.length = 0;

      render(<CinematicPlayer {...defaultProps} fullscreen />);
      waitForReady();

      const calls = playerCalls as unknown[][];
      const lastCall = calls[calls.length - 1]?.[0] as Record<string, unknown>;
      const style = lastCall?.style as React.CSSProperties | undefined;

      // Width should be 390 (full screen width) not 100vw string
      expect(style?.width).toBe(390);
    });
  });
});
