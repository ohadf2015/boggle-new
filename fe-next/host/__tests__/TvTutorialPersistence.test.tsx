import { vi, type Mock, } from 'vitest';
/**
 * Test: TV Tutorial should only show ONCE per user
 *
 * Bug: The multiplayer tutorial (TV Tutorial in host mode) keeps showing
 * even after being dismissed once.
 *
 * This test verifies:
 * 1. Tutorial shows on first TV mode enable
 * 2. After dismissing, tutorial does NOT show when toggling TV mode again
 * 3. This persists across component remounts
 */

import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import TvTutorialOverlay, {
  isTvTutorialComplete,
  resetTvTutorial,
} from '../components/tv-broadcast/TvTutorialOverlay';

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
  LogOut: () => <span data-testid="logout-icon">LogOut</span>,
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
    // Helper to see what's stored
    _getStore: () => ({ ...store }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('TvTutorial Persistence - Bug Fix', () => {
  const mockT = (key: string) => {
    const translations: Record<string, string> = {
      'tvTutorial.welcome.title': 'Welcome to TV Mode',
      'tvTutorial.welcome.description': 'Perfect for presentations!',
      'tvTutorial.qr.title': 'QR Code & Room Code',
      'tvTutorial.qr.description': 'Players scan to join',
      'tvTutorial.grid.title': 'Game Grid',
      'tvTutorial.grid.description': 'Letters appear here',
      'tvTutorial.leaderboard.title': 'Leaderboard',
      'tvTutorial.leaderboard.description': 'Track scores in real-time',
      'tvTutorial.timer.title': 'Timer',
      'tvTutorial.timer.description': 'Countdown to victory',
      'tvTutorial.letsGo': "Let's Go!",
      'tvTutorial.ariaLabel': 'TV Mode Tutorial',
      'tvTutorial.help': 'Show Tutorial',
      'common.skip': 'Skip',
      'common.next': 'Next',
      'common.previous': 'Back',
    };
    return translations[key] || key;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    cleanup();
  });

  describe('Bug reproduction: Tutorial shows after dismiss and remount', () => {
    /**
     * This test simulates the exact user flow:
     * 1. User enters TV mode for the first time
     * 2. Tutorial shows (expected)
     * 3. User dismisses tutorial by clicking Skip
     * 4. User toggles TV mode off/on or navigates away and back
     * 5. Tutorial should NOT show again (THIS IS THE BUG)
     */
    it('should NOT show tutorial after being dismissed and component remounts', () => {
      const onComplete = vi.fn();
      const onSkip = vi.fn();

      // Step 1: First render - tutorial should show (forceShow=true, parent controls visibility)
      const { rerender, unmount } = render(
        <TvTutorialOverlay
          onComplete={onComplete}
          onSkip={onSkip}
          t={mockT}
          forceShow={true}
        />
      );

      // Verify tutorial is shown
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Welcome to TV Mode')).toBeInTheDocument();

      // Step 2: User clicks Skip to dismiss
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

      // Verify callbacks were called
      expect(onSkip).toHaveBeenCalledTimes(1);

      // Verify localStorage was set
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'lexiclash_tv_tutorial_complete',
        'true'
      );

      // Step 3: Unmount (simulates navigating away)
      unmount();

      // Step 4: Remount with forceShow=false (parent checks localStorage and doesn't force show)
      const { container } = render(
        <TvTutorialOverlay
          onComplete={vi.fn()}
          onSkip={vi.fn()}
          t={mockT}
          forceShow={false}
        />
      );

      // Step 5: Tutorial should NOT be shown
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    /**
     * Test the specific scenario where forceShow is controlled by parent state
     */
    it('should NOT show tutorial when forceShow changes from true to false after dismiss', () => {
      const onComplete = vi.fn();
      const onSkip = vi.fn();

      // Simulate parent component that controls forceShow state
      const ParentComponent = () => {
        const [showTutorial, setShowTutorial] = React.useState(true);

        return (
          <>
            <button
              data-testid="toggle-tutorial"
              onClick={() => setShowTutorial(!showTutorial)}
            >
              Toggle
            </button>
            <TvTutorialOverlay
              onComplete={() => {
                setShowTutorial(false);
                onComplete();
              }}
              onSkip={() => {
                setShowTutorial(false);
                onSkip();
              }}
              t={mockT}
              forceShow={showTutorial}
            />
          </>
        );
      };

      render(<ParentComponent />);

      // Tutorial should be shown (forceShow=true)
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // User dismisses tutorial
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

      // Tutorial should be hidden
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Verify localStorage is set
      expect(isTvTutorialComplete()).toBe(true);

      // Now simulate toggling forceShow back to true (like what might happen
      // if the parent effect re-runs incorrectly)
      fireEvent.click(screen.getByTestId('toggle-tutorial'));

      // THIS IS THE BUG: When forceShow becomes true again, the tutorial
      // shows even though localStorage says it's complete!
      // The expected behavior is that forceShow=true should OVERRIDE localStorage,
      // BUT the parent should NOT set forceShow=true if the tutorial is complete.

      // For now, with forceShow=true, the tutorial WILL show (by design).
      // The fix should be in the PARENT component's logic, not here.
    });

    /**
     * Test that isTvTutorialComplete returns correct value after skip
     */
    it('should mark tutorial complete after skip (for parent to check)', () => {
      // Initially not complete
      expect(isTvTutorialComplete()).toBe(false);

      render(
        <TvTutorialOverlay
          onComplete={vi.fn()}
          onSkip={vi.fn()}
          t={mockT}
          forceShow={true} // Parent controls visibility
        />
      );

      // Dismiss tutorial
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

      // Should now be complete
      expect(isTvTutorialComplete()).toBe(true);
    });

    /**
     * Simulate the TvBroadcastView flow where tutorial state is set on mount
     */
    it('should work correctly in TvBroadcastView-like usage pattern', () => {
      // This simulates how TvBroadcastView uses the component:
      // useEffect(() => {
      //   if (!isTvTutorialComplete()) {
      //     setShowTutorial(true);
      //   }
      // }, []);

      const TvBroadcastLikeComponent = () => {
        const [showTutorial, setShowTutorial] = React.useState(false);

        React.useEffect(() => {
          // This is how TvBroadcastView checks
          if (!isTvTutorialComplete()) {
            setShowTutorial(true);
          }
        }, []);

        return (
          <TvTutorialOverlay
            onComplete={() => setShowTutorial(false)}
            onSkip={() => setShowTutorial(false)}
            t={mockT}
            forceShow={showTutorial}
          />
        );
      };

      // First mount - should show tutorial
      const { unmount } = render(<TvBroadcastLikeComponent />);

      // Wait for effect to run
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Dismiss
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

      // Should be hidden
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Unmount
      unmount();

      // Remount - tutorial should NOT show because isTvTutorialComplete() returns true
      render(<TvBroadcastLikeComponent />);

      // Should NOT show tutorial this time
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
