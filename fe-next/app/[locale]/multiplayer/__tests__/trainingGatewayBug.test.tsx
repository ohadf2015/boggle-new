import { vi, type Mock, } from 'vitest';
/**
 * Test: Multiplayer Training Gateway shows repeatedly bug
 *
 * Bug: "the multiplayer tutorial always displayed even after already dismissed once"
 *
 * This test simulates the exact user flow to reproduce the bug:
 * 1. User visits multiplayer page
 * 2. Training gateway shows (first visit)
 * 3. User dismisses the gateway
 * 4. User joins a game
 * 5. User leaves the game (or game ends)
 * 6. User is back in lobby
 * 7. Training gateway should NOT show again (BUG: it shows!)
 */

import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import {
  shouldShowTrainingGateway,
  markGatewaySeen,
  markGatewaySkipped,
  resetTrainingProgress,
  getTrainingProgress,
} from '@/utils/trainingProgressStorage';

// Mock localStorage
const localStorageMock = (() => {
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
    _getStore: () => ({ ...store }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Training Gateway Bug - Shows repeatedly after dismiss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Simulates the useEffect from multiplayer/page.tsx that controls gateway visibility
   */
  function useTrainingGatewayEffect(
    isActive: boolean,
    showResults: boolean,
    setShowTrainingGateway: (show: boolean) => void
  ) {
    useEffect(() => {
      if (typeof window === 'undefined') return;
      if (isActive || showResults) return;

      const urlParams = new URLSearchParams(window.location.search);
      const roomFromUrl = urlParams.get('room');
      if (roomFromUrl) return;

      const shouldShow = shouldShowTrainingGateway();
      if (shouldShow) {
        markGatewaySeen();

        const timer = setTimeout(() => {
          setShowTrainingGateway(true);
        }, 500);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [isActive, showResults, setShowTrainingGateway]);
  }

  /**
   * Test component that mimics the multiplayer page's training gateway logic
   */
  const TestMultiplayerComponent: React.FC<{
    initialIsActive?: boolean;
    initialShowResults?: boolean;
  }> = ({ initialIsActive = false, initialShowResults = false }) => {
    const [isActive, setIsActive] = useState(initialIsActive);
    const [showResults, setShowResults] = useState(initialShowResults);
    const [showTrainingGateway, setShowTrainingGateway] = useState(false);

    useTrainingGatewayEffect(isActive, showResults, setShowTrainingGateway);

    return (
      <div>
        <div data-testid="status">
          isActive: {String(isActive)}, showResults: {String(showResults)},
          gateway: {String(showTrainingGateway)}
        </div>

        {showTrainingGateway && (
          <div data-testid="training-gateway-modal">
            <h2>Training Gateway Modal</h2>
            <button
              data-testid="close-gateway"
              onClick={() => setShowTrainingGateway(false)}
            >
              Close
            </button>
            <button
              data-testid="skip-gateway"
              onClick={() => {
                markGatewaySkipped();
                setShowTrainingGateway(false);
              }}
            >
              Skip
            </button>
          </div>
        )}

        <button
          data-testid="join-game"
          onClick={() => setIsActive(true)}
        >
          Join Game
        </button>

        <button
          data-testid="leave-game"
          onClick={() => {
            setIsActive(false);
            setShowResults(false);
          }}
        >
          Leave Game
        </button>

        <button
          data-testid="show-results"
          onClick={() => {
            setIsActive(true);
            setShowResults(true);
          }}
        >
          Show Results
        </button>

        <button
          data-testid="return-to-lobby"
          onClick={() => {
            setIsActive(false);
            setShowResults(false);
          }}
        >
          Return to Lobby
        </button>
      </div>
    );
  };

  describe('User flow: dismiss gateway, join game, leave game', () => {
    it('should NOT show gateway after dismissing and leaving a game', async () => {
      render(<TestMultiplayerComponent />);

      // Initially, gateway shouldn't be shown yet (timer hasn't fired)
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();

      // Advance timer to trigger gateway
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should now be shown
      expect(screen.getByTestId('training-gateway-modal')).toBeInTheDocument();

      // Verify localStorage was updated by markGatewaySeen()
      expect(getTrainingProgress().hasSeenGateway).toBe(true);

      // User dismisses the gateway by clicking close
      fireEvent.click(screen.getByTestId('close-gateway'));

      // Gateway should be hidden
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();

      // User joins a game
      fireEvent.click(screen.getByTestId('join-game'));

      // Advance any pending timers
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should NOT show while in game
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();

      // User leaves the game
      fireEvent.click(screen.getByTestId('leave-game'));

      // Advance timers again (in case effect re-runs)
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should NOT show after leaving game
      // THIS IS THE BUG - if it shows here, the bug is confirmed
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();

      // Verify localStorage still has the seen flag
      expect(getTrainingProgress().hasSeenGateway).toBe(true);
      expect(shouldShowTrainingGateway()).toBe(false);
    });

    it('should NOT show gateway after full game cycle (join -> play -> results -> lobby)', async () => {
      render(<TestMultiplayerComponent />);

      // Trigger initial gateway
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId('training-gateway-modal')).toBeInTheDocument();

      // Dismiss gateway
      fireEvent.click(screen.getByTestId('close-gateway'));

      // Join game
      fireEvent.click(screen.getByTestId('join-game'));

      // Show results (game ends)
      fireEvent.click(screen.getByTestId('show-results'));

      // Return to lobby
      fireEvent.click(screen.getByTestId('return-to-lobby'));

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should NOT show
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();
    });

    it('should NOT show gateway across multiple game cycles', async () => {
      render(<TestMultiplayerComponent />);

      // Initial gateway
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId('training-gateway-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('close-gateway'));

      // Simulate 5 game cycles
      for (let i = 0; i < 5; i++) {
        // Join game
        fireEvent.click(screen.getByTestId('join-game'));
        act(() => {
          vi.advanceTimersByTime(600);
        });

        // Leave game
        fireEvent.click(screen.getByTestId('leave-game'));
        act(() => {
          vi.advanceTimersByTime(600);
        });

        // Gateway should NOT show
        expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();
      }
    });
  });

  describe('Edge case: skip button behavior', () => {
    it('should NOT show gateway after using skip button', async () => {
      render(<TestMultiplayerComponent />);

      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId('training-gateway-modal')).toBeInTheDocument();

      // Click skip (which also calls markGatewaySkipped)
      fireEvent.click(screen.getByTestId('skip-gateway'));

      // Join and leave game
      fireEvent.click(screen.getByTestId('join-game'));
      fireEvent.click(screen.getByTestId('leave-game'));
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should NOT show
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();

      // Both flags should be set
      const progress = getTrainingProgress();
      expect(progress.hasSeenGateway).toBe(true);
      expect(progress.hasSkippedGateway).toBe(true);
    });
  });

  describe('Edge case: component remount', () => {
    it('should NOT show gateway when component remounts after dismiss', async () => {
      const { unmount } = render(<TestMultiplayerComponent />);

      // Trigger initial gateway
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId('training-gateway-modal')).toBeInTheDocument();

      // Dismiss gateway
      fireEvent.click(screen.getByTestId('close-gateway'));

      // Unmount (simulates navigation away)
      unmount();

      // Remount (simulates navigation back)
      render(<TestMultiplayerComponent />);

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should NOT show
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();
    });
  });

  describe('React Strict Mode simulation', () => {
    it('should NOT show gateway twice in Strict Mode double-mount scenario', async () => {
      // Strict Mode simulates: mount -> cleanup -> mount
      // This can cause issues if state is not properly managed

      // First mount
      const { unmount, rerender } = render(<TestMultiplayerComponent />);

      // First mount's effect runs
      // In Strict Mode, cleanup would run here, clearing the timer
      // Then second mount's effect runs

      // Simulate Strict Mode: unmount before timer fires
      unmount();

      // Clear any pending state
      localStorageMock.clear(); // Reset storage to simulate fresh state
      vi.clearAllTimers();

      // Second mount (this is what Strict Mode does)
      render(<TestMultiplayerComponent />);

      // Now advance timers
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should show (first time)
      expect(screen.getByTestId('training-gateway-modal')).toBeInTheDocument();

      // Now dismiss
      fireEvent.click(screen.getByTestId('close-gateway'));

      // Verify localStorage is set
      expect(getTrainingProgress().hasSeenGateway).toBe(true);
    });

    it('should handle rapid isActive state changes correctly', async () => {
      // This simulates the bug scenario where state changes rapidly

      render(<TestMultiplayerComponent />);

      // Initial gateway trigger
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(screen.getByTestId('training-gateway-modal')).toBeInTheDocument();

      // Dismiss
      fireEvent.click(screen.getByTestId('close-gateway'));

      // Rapid state changes (like what might happen in real usage)
      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByTestId('join-game'));
        act(() => vi.advanceTimersByTime(100));
        fireEvent.click(screen.getByTestId('leave-game'));
        act(() => vi.advanceTimersByTime(100));
      }

      // Final timer advance
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Gateway should NOT show
      expect(screen.queryByTestId('training-gateway-modal')).not.toBeInTheDocument();
    });
  });
});
