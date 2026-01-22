/**
 * Test: Training Gateway should only show ONCE per user
 *
 * Bug: The training gateway modal keeps showing for authenticated players
 * who have already dismissed it, even after joining/leaving games.
 *
 * This test verifies:
 * 1. Gateway shows on first visit
 * 2. After markGatewaySeen(), shouldShowTrainingGateway() returns false
 * 3. This persists even after simulated "page state changes"
 */

import {
  getTrainingProgress,
  shouldShowTrainingGateway,
  markGatewaySeen,
  markGatewaySkipped,
  resetTrainingProgress,
} from '../trainingProgressStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    // Helper to see what's stored
    _getStore: () => ({ ...store }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Training Gateway - Show Once Bug Fix', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Bug reproduction: Modal shows repeatedly after state changes', () => {
    it('should NOT show gateway after user dismisses and joins/leaves a game', () => {
      // Scenario: User visits multiplayer, sees gateway, dismisses it,
      // joins a game, leaves the game - gateway should NOT show again

      // Step 1: First visit - should show
      expect(shouldShowTrainingGateway()).toBe(true);

      // Step 2: Modal opens and markGatewaySeen() is called
      markGatewaySeen();

      // Step 3: User dismisses modal (via close button, backdrop, or skip)
      // (This is handled by state in the component, not storage)

      // Step 4: User joins a game (isActive = true)
      // (This causes useEffect to re-run but return early)

      // Step 5: User leaves game (isActive = false)
      // useEffect runs again - THIS IS WHERE THE BUG MIGHT OCCUR
      expect(shouldShowTrainingGateway()).toBe(false);

      // Step 6: Verify localStorage still has the flag
      const progress = getTrainingProgress();
      expect(progress.hasSeenGateway).toBe(true);
    });

    it('should NOT show gateway after user dismisses and game ends (showResults cycle)', () => {
      // Step 1: First visit - should show
      expect(shouldShowTrainingGateway()).toBe(true);

      // Step 2: Modal opens and markGatewaySeen() is called
      markGatewaySeen();

      // Step 3: User joins game (isActive = true)
      // Step 4: Game ends (showResults = true)
      // Step 5: User returns to room (showResults = false)
      // Step 6: User leaves room (isActive = false)

      // After all these state transitions, gateway should STILL not show
      expect(shouldShowTrainingGateway()).toBe(false);
    });

    it('should NOT show gateway across multiple game join/leave cycles', () => {
      // First visit
      expect(shouldShowTrainingGateway()).toBe(true);
      markGatewaySeen();
      expect(shouldShowTrainingGateway()).toBe(false);

      // Simulate multiple game cycles
      for (let i = 0; i < 5; i++) {
        // Each cycle: join game -> play -> results -> leave
        // The shouldShowTrainingGateway check happens when isActive/showResults changes

        // Check at the point where the effect would run (isActive becoming false)
        expect(shouldShowTrainingGateway()).toBe(false);
      }
    });
  });

  describe('Skip button behavior', () => {
    it('should NOT show gateway after skip (without checkbox)', () => {
      // First visit - should show
      expect(shouldShowTrainingGateway()).toBe(true);

      // Modal opens - markGatewaySeen is called
      markGatewaySeen();

      // User clicks Skip without checking "don't show again"
      // This does NOT call markGatewaySkipped(), only onClose()

      // Gateway should still not show because hasSeenGateway is true
      expect(shouldShowTrainingGateway()).toBe(false);
    });

    it('should NOT show gateway after skip with "don\'t show again" checked', () => {
      // First visit
      expect(shouldShowTrainingGateway()).toBe(true);

      // Modal opens
      markGatewaySeen();

      // User clicks Skip WITH checkbox checked
      markGatewaySkipped();

      // Both flags should prevent showing
      const progress = getTrainingProgress();
      expect(progress.hasSeenGateway).toBe(true);
      expect(progress.hasSkippedGateway).toBe(true);
      expect(shouldShowTrainingGateway()).toBe(false);
    });
  });

  describe('Edge cases for authenticated users', () => {
    it('hasSeenGateway persists correctly after multiple localStorage reads', () => {
      markGatewaySeen();

      // Simulate multiple reads (as would happen with effect re-runs)
      for (let i = 0; i < 10; i++) {
        const shouldShow = shouldShowTrainingGateway();
        expect(shouldShow).toBe(false);
      }
    });

    it('getTrainingProgress returns correct merged defaults', () => {
      // First call - no stored data
      const initial = getTrainingProgress();
      expect(initial.hasSeenGateway).toBe(false);
      expect(initial.hasSkippedGateway).toBe(false);
      expect(initial.hasPassedTraining).toBe(false);

      // Mark as seen
      markGatewaySeen();

      // Second call - should merge with defaults correctly
      const afterSeen = getTrainingProgress();
      expect(afterSeen.hasSeenGateway).toBe(true);
      expect(afterSeen.hasSkippedGateway).toBe(false);
      expect(afterSeen.hasPassedTraining).toBe(false);
    });
  });

  describe('Timing-related scenarios', () => {
    it('checking shouldShow before and after markGatewaySeen works correctly', () => {
      // This simulates the race condition scenario:
      // 1. useEffect runs, calls shouldShowTrainingGateway()
      // 2. Returns true, timer is set
      // 3. Before timer fires, something causes effect to re-run
      // 4. shouldShowTrainingGateway() is called again

      // First check - should return true
      const firstCheck = shouldShowTrainingGateway();
      expect(firstCheck).toBe(true);

      // Second check before marking seen - should still return true
      const secondCheck = shouldShowTrainingGateway();
      expect(secondCheck).toBe(true);

      // Mark as seen (simulates modal opening)
      markGatewaySeen();

      // Third check after marking seen - should return false
      const thirdCheck = shouldShowTrainingGateway();
      expect(thirdCheck).toBe(false);
    });

    it('rapid state changes should not affect gateway visibility after seen', () => {
      // Simulate: show -> seen -> close -> state changes -> check

      // Initial state
      expect(shouldShowTrainingGateway()).toBe(true);

      // Modal opens, markGatewaySeen called
      markGatewaySeen();
      expect(shouldShowTrainingGateway()).toBe(false);

      // Simulate rapid state changes (like isActive toggling)
      // Each would trigger useEffect re-run
      for (let i = 0; i < 10; i++) {
        // Effect re-runs, calls shouldShowTrainingGateway
        const shouldShow = shouldShowTrainingGateway();
        expect(shouldShow).toBe(false);
      }
    });
  });
});
