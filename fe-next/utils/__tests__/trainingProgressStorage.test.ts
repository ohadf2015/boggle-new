/**
 * Training Progress Storage Tests
 *
 * Tests for the training gateway "show once per user" functionality
 */

import {
  getTrainingProgress,
  shouldShowTrainingGateway,
  markGatewaySkipped,
  markGatewaySeen,
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
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Training Gateway - Show Once Per User', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('shouldShowTrainingGateway', () => {
    it('returns true for new users who have never seen the gateway', () => {
      expect(shouldShowTrainingGateway()).toBe(true);
    });

    it('returns false after markGatewaySeen is called (modal was shown)', () => {
      // First time - should show
      expect(shouldShowTrainingGateway()).toBe(true);

      // Mark as seen (modal was displayed)
      markGatewaySeen();

      // Second time - should NOT show (already seen once)
      expect(shouldShowTrainingGateway()).toBe(false);
    });

    it('returns false after markGatewaySkipped is called', () => {
      expect(shouldShowTrainingGateway()).toBe(true);

      markGatewaySkipped();

      expect(shouldShowTrainingGateway()).toBe(false);
    });

    it('returns false after user has passed training', () => {
      const progress = getTrainingProgress();
      progress.hasPassedTraining = true;
      localStorage.setItem('lexiclash_training_progress', JSON.stringify(progress));

      expect(shouldShowTrainingGateway()).toBe(false);
    });

    it('persists across page reloads (localStorage)', () => {
      // Simulate first visit
      expect(shouldShowTrainingGateway()).toBe(true);
      markGatewaySeen();

      // Simulate "page reload" by clearing memory but keeping localStorage
      // (In real scenario, component state would reset but localStorage persists)
      expect(shouldShowTrainingGateway()).toBe(false);
    });
  });

  describe('markGatewaySeen', () => {
    it('sets hasSeenGateway to true in progress', () => {
      markGatewaySeen();

      const progress = getTrainingProgress();
      expect(progress.hasSeenGateway).toBe(true);
    });

    it('records the timestamp when gateway was seen', () => {
      const before = new Date().toISOString();
      markGatewaySeen();
      const after = new Date().toISOString();

      const progress = getTrainingProgress();
      expect(progress.gatewaySeenAt).toBeDefined();
      expect(progress.gatewaySeenAt! >= before).toBe(true);
      expect(progress.gatewaySeenAt! <= after).toBe(true);
    });

    it('is idempotent - calling multiple times has same effect', () => {
      markGatewaySeen();
      const firstProgress = getTrainingProgress();

      markGatewaySeen();
      const secondProgress = getTrainingProgress();

      expect(firstProgress.hasSeenGateway).toBe(true);
      expect(secondProgress.hasSeenGateway).toBe(true);
    });
  });

  describe('resetTrainingProgress', () => {
    it('clears all progress including seen status', () => {
      markGatewaySeen();
      expect(shouldShowTrainingGateway()).toBe(false);

      resetTrainingProgress();

      expect(shouldShowTrainingGateway()).toBe(true);
    });
  });
});
