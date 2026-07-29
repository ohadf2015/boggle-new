/**
 * Intensity Controller Tests
 *
 * Tests invisible pacing adjustments based on flow state.
 * CRITICAL: Tests verify adjustments are gradual and don't modify core difficulty.
 * TDD: Write tests first, then implement to make them pass.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  IntensityController,
  createIntensityController,
  getAdjustmentsAtTransition,
} from '../intensityController';
import type { IntensityAdjustment } from '@/types/aiDirector';
import { DEFAULT_INTENSITY, ADJUSTMENT_RATE } from '../constants';

describe('IntensityController', () => {
  let controller: IntensityController;

  beforeEach(() => {
    controller = createIntensityController();
  });

  describe('initialization', () => {
    it('should initialize with default (neutral) intensity', () => {
      const adjustments = controller.getCurrentAdjustments();

      expect(adjustments.hintEscalationRate).toBe(1.0);
      expect(adjustments.powerUpSpawnBonus).toBe(0);
      expect(adjustments.comboGracePeriod).toBe(0);
      expect(adjustments.celebrationDuration).toBe(0);
    });
  });

  describe('flow state handling', () => {
    it('should NOT adjust when in flow state', () => {
      const before = controller.getCurrentAdjustments();
      controller.updateFlowState('flow');
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      expect(after).toEqual(before);
    });

    it('should NOT adjust when in learning state', () => {
      const before = controller.getCurrentAdjustments();
      controller.updateFlowState('learning');
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      expect(after).toEqual(before);
    });
  });

  describe('frustrated state adjustments', () => {
    it('should increase hintEscalationRate for frustrated players', () => {
      const before = controller.getCurrentAdjustments();
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      expect(after.hintEscalationRate).toBeGreaterThan(before.hintEscalationRate);
    });

    it('should increase powerUpSpawnBonus for frustrated players', () => {
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      expect(after.powerUpSpawnBonus).toBeGreaterThan(0);
    });

    it('should increase comboGracePeriod for frustrated players', () => {
      const before = controller.getCurrentAdjustments();
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      expect(after.comboGracePeriod).toBeGreaterThan(before.comboGracePeriod);
    });

    it('should cap hintEscalationRate at 2.0', () => {
      // Apply many frustrated transitions
      for (let i = 0; i < 20; i++) {
        controller.updateFlowState('frustrated');
        controller.applyAtTransition();
      }

      const adjustments = controller.getCurrentAdjustments();
      expect(adjustments.hintEscalationRate).toBeLessThanOrEqual(2.0);
    });

    it('should cap powerUpSpawnBonus at 2', () => {
      for (let i = 0; i < 20; i++) {
        controller.updateFlowState('frustrated');
        controller.applyAtTransition();
      }

      const adjustments = controller.getCurrentAdjustments();
      expect(adjustments.powerUpSpawnBonus).toBeLessThanOrEqual(2);
    });

    it('should cap comboGracePeriod at 3 seconds', () => {
      for (let i = 0; i < 20; i++) {
        controller.updateFlowState('frustrated');
        controller.applyAtTransition();
      }

      const adjustments = controller.getCurrentAdjustments();
      expect(adjustments.comboGracePeriod).toBeLessThanOrEqual(3);
    });
  });

  describe('bored state adjustments', () => {
    it('should decrease hintEscalationRate for bored players', () => {
      // First increase to have room to decrease
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      const afterFrustrated = controller.getCurrentAdjustments();

      controller.updateFlowState('bored');
      controller.applyAtTransition();
      const afterBored = controller.getCurrentAdjustments();

      expect(afterBored.hintEscalationRate).toBeLessThan(afterFrustrated.hintEscalationRate);
    });

    it('should decrease powerUpSpawnBonus for bored players', () => {
      // First increase
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      controller.applyAtTransition();

      controller.updateFlowState('bored');
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      expect(after.powerUpSpawnBonus).toBeLessThan(2);
    });

    it('should NOT decrease hintEscalationRate below 0.5', () => {
      for (let i = 0; i < 20; i++) {
        controller.updateFlowState('bored');
        controller.applyAtTransition();
      }

      const adjustments = controller.getCurrentAdjustments();
      expect(adjustments.hintEscalationRate).toBeGreaterThanOrEqual(0.5);
    });

    it('should NOT decrease powerUpSpawnBonus below 0', () => {
      for (let i = 0; i < 20; i++) {
        controller.updateFlowState('bored');
        controller.applyAtTransition();
      }

      const adjustments = controller.getCurrentAdjustments();
      expect(adjustments.powerUpSpawnBonus).toBeGreaterThanOrEqual(0);
    });

    it('should NOT decrease comboGracePeriod below 0', () => {
      for (let i = 0; i < 20; i++) {
        controller.updateFlowState('bored');
        controller.applyAtTransition();
      }

      const adjustments = controller.getCurrentAdjustments();
      expect(adjustments.comboGracePeriod).toBeGreaterThanOrEqual(0);
    });
  });

  describe('gradual adjustments', () => {
    it('should make gradual adjustments (not sudden jumps)', () => {
      const before = controller.getCurrentAdjustments();
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      // Change should be incremental (ADJUSTMENT_RATE = 0.1 = 10%)
      // Using toBeCloseTo to handle floating-point precision
      const hintChange = after.hintEscalationRate - before.hintEscalationRate;
      expect(hintChange).toBeCloseTo(ADJUSTMENT_RATE, 5);
    });

    it('should accumulate adjustments over multiple transitions', () => {
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      const first = controller.getCurrentAdjustments();

      controller.applyAtTransition();
      const second = controller.getCurrentAdjustments();

      // Each transition should accumulate
      expect(second.hintEscalationRate).toBeGreaterThan(first.hintEscalationRate);
    });
  });

  describe('reset', () => {
    it('should reset to default intensity', () => {
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      controller.applyAtTransition();
      controller.reset();

      const adjustments = controller.getCurrentAdjustments();
      expect(adjustments).toEqual(DEFAULT_INTENSITY);
    });

    it('should reset flow state to learning', () => {
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      controller.reset();

      // After reset, applying transition should not change adjustments
      // (learning state doesn't cause adjustments)
      const before = controller.getCurrentAdjustments();
      controller.applyAtTransition();
      const after = controller.getCurrentAdjustments();

      expect(after).toEqual(before);
    });
  });

  describe('state transitions', () => {
    it('should handle flow state changes between transitions', () => {
      // First frustration
      controller.updateFlowState('frustrated');
      controller.applyAtTransition();
      const afterFrustrated = controller.getCurrentAdjustments();

      // Then boredom
      controller.updateFlowState('bored');
      controller.applyAtTransition();
      const afterBored = controller.getCurrentAdjustments();

      // Then flow (no change)
      controller.updateFlowState('flow');
      controller.applyAtTransition();
      const afterFlow = controller.getCurrentAdjustments();

      expect(afterBored.hintEscalationRate).toBeLessThan(afterFrustrated.hintEscalationRate);
      expect(afterFlow).toEqual(afterBored);
    });
  });
});

describe('getAdjustmentsAtTransition', () => {
  it('should return unchanged adjustments for flow state', () => {
    const current: IntensityAdjustment = {
      hintEscalationRate: 1.5,
      powerUpSpawnBonus: 1,
      comboGracePeriod: 1,
      celebrationDuration: 0.5,
    };

    const result = getAdjustmentsAtTransition('flow', current);
    expect(result).toEqual(current);
  });

  it('should return unchanged adjustments for learning state', () => {
    const current: IntensityAdjustment = {
      hintEscalationRate: 1.5,
      powerUpSpawnBonus: 1,
      comboGracePeriod: 1,
      celebrationDuration: 0.5,
    };

    const result = getAdjustmentsAtTransition('learning', current);
    expect(result).toEqual(current);
  });

  it('should increase adjustments for frustrated state', () => {
    const result = getAdjustmentsAtTransition('frustrated', DEFAULT_INTENSITY);

    expect(result.hintEscalationRate).toBeGreaterThan(DEFAULT_INTENSITY.hintEscalationRate);
    expect(result.powerUpSpawnBonus).toBeGreaterThan(DEFAULT_INTENSITY.powerUpSpawnBonus);
    expect(result.comboGracePeriod).toBeGreaterThan(DEFAULT_INTENSITY.comboGracePeriod);
  });

  it('should decrease adjustments for bored state', () => {
    const elevated: IntensityAdjustment = {
      hintEscalationRate: 1.5,
      powerUpSpawnBonus: 2,
      comboGracePeriod: 2,
      celebrationDuration: 0.5,
    };

    const result = getAdjustmentsAtTransition('bored', elevated);

    expect(result.hintEscalationRate).toBeLessThan(elevated.hintEscalationRate);
    expect(result.powerUpSpawnBonus).toBeLessThan(elevated.powerUpSpawnBonus);
    expect(result.comboGracePeriod).toBeLessThan(elevated.comboGracePeriod);
  });

  it('should respect maximum limits for frustrated state', () => {
    const nearMax: IntensityAdjustment = {
      hintEscalationRate: 1.95,
      powerUpSpawnBonus: 1.9,
      comboGracePeriod: 2.8,
      celebrationDuration: 0.9,
    };

    const result = getAdjustmentsAtTransition('frustrated', nearMax);

    expect(result.hintEscalationRate).toBeLessThanOrEqual(2.0);
    expect(result.powerUpSpawnBonus).toBeLessThanOrEqual(2);
    expect(result.comboGracePeriod).toBeLessThanOrEqual(3);
  });

  it('should respect minimum limits for bored state', () => {
    const nearMin: IntensityAdjustment = {
      hintEscalationRate: 0.55,
      powerUpSpawnBonus: 0.5,
      comboGracePeriod: 0.3,
      celebrationDuration: 0.1,
    };

    const result = getAdjustmentsAtTransition('bored', nearMin);

    expect(result.hintEscalationRate).toBeGreaterThanOrEqual(0.5);
    expect(result.powerUpSpawnBonus).toBeGreaterThanOrEqual(0);
    expect(result.comboGracePeriod).toBeGreaterThanOrEqual(0);
  });

  it('should preserve celebrationDuration for frustrated state', () => {
    const current: IntensityAdjustment = {
      hintEscalationRate: 1.0,
      powerUpSpawnBonus: 0,
      comboGracePeriod: 0,
      celebrationDuration: 0.5,
    };

    const result = getAdjustmentsAtTransition('frustrated', current);

    // celebrationDuration should be unchanged for frustrated (focus on help, not celebrations)
    expect(result.celebrationDuration).toBe(0.5);
  });
});
