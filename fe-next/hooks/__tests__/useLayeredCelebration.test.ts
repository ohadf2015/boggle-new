/**
 * Test suite for useLayeredCelebration hook
 *
 * Tests budget-aware layered celebrations with reduced motion support
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLayeredCelebration } from '../useLayeredCelebration';
import * as confettiUtils from '../../utils/confettiUtils';
import * as useParticleBudgetModule from '../useParticleBudget';
import * as useDevicePerformanceModule from '../useDevicePerformance';

// Mock dependencies
vi.mock('../../utils/confettiUtils');
vi.mock('../useParticleBudget');
vi.mock('../useDevicePerformance');

describe('useLayeredCelebration', () => {
  let mockFireLayeredCelebration: any;
  let mockUseParticleBudget: any;
  let mockUseDevicePerformance: any;

  beforeEach(() => {
    // Create mocks
    mockFireLayeredCelebration = vi.fn();
    mockUseParticleBudget = vi.fn();
    mockUseDevicePerformance = vi.fn();

    // Setup default mock implementations
    (confettiUtils.fireLayeredCelebration as any) = mockFireLayeredCelebration;
    (useParticleBudgetModule.useParticleBudget as any) = mockUseParticleBudget;
    (useDevicePerformanceModule.useDevicePerformance as any) = mockUseDevicePerformance;

    // Default: high-end device, no reduced motion
    mockUseParticleBudget.mockReturnValue({
      tier: 'high',
      max: 100,
      combo: 15,
      levelUp: 60,
      word: 10,
    });

    mockUseDevicePerformance.mockReturnValue({
      isLowEnd: false,
      reduceParticles: false,
      prefersReducedMotion: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should return triggerCelebration function', () => {
      // WHEN
      const { result } = renderHook(() => useLayeredCelebration());

      // THEN
      expect(result.current.triggerCelebration).toBeDefined();
      expect(typeof result.current.triggerCelebration).toBe('function');
    });

    it('should fire layered celebration with max budget', () => {
      // GIVEN
      const { result } = renderHook(() => useLayeredCelebration());

      // WHEN
      result.current.triggerCelebration();

      // THEN
      expect(mockFireLayeredCelebration).toHaveBeenCalledTimes(1);
      // fireLayeredCelebration(duration, budget) - 2000ms duration, full budget object
      expect(mockFireLayeredCelebration).toHaveBeenCalledWith(2000, {
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });
    });

    it('should use particle budget from useParticleBudget hook', () => {
      // GIVEN
      const mediumBudget = {
        tier: 'medium',
        max: 60,
        combo: 10,
        levelUp: 40,
        word: 6,
      };
      mockUseParticleBudget.mockReturnValue(mediumBudget);

      const { result } = renderHook(() => useLayeredCelebration());

      // WHEN
      result.current.triggerCelebration();

      // THEN
      expect(mockFireLayeredCelebration).toHaveBeenCalledWith(2000, mediumBudget);
    });

    it('should handle low-end device budgets', () => {
      // GIVEN
      const lowBudget = {
        tier: 'low',
        max: 30,
        combo: 5,
        levelUp: 20,
        word: 3,
      };
      mockUseParticleBudget.mockReturnValue(lowBudget);

      const { result } = renderHook(() => useLayeredCelebration());

      // WHEN
      result.current.triggerCelebration();

      // THEN
      expect(mockFireLayeredCelebration).toHaveBeenCalledWith(2000, lowBudget);
    });
  });

  describe('reduced motion support', () => {
    it('should not fire celebration when prefersReducedMotion is true', () => {
      // GIVEN
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        reduceParticles: false,
        prefersReducedMotion: true,
      });

      mockUseParticleBudget.mockReturnValue({
        tier: 'low',
        max: 0, // Budget is 0 when reduced motion
        combo: 0,
        levelUp: 0,
        word: 0,
      });

      const { result } = renderHook(() => useLayeredCelebration());

      // WHEN
      result.current.triggerCelebration();

      // THEN
      expect(mockFireLayeredCelebration).not.toHaveBeenCalled();
    });

    it('should respect reduced motion regardless of device tier', () => {
      // GIVEN
      mockUseDevicePerformance.mockReturnValue({
        isLowEnd: false,
        reduceParticles: false,
        prefersReducedMotion: true,
      });

      mockUseParticleBudget.mockReturnValue({
        tier: 'low',
        max: 0,
        combo: 0,
        levelUp: 0,
        word: 0,
      });

      const { result } = renderHook(() => useLayeredCelebration());

      // WHEN
      result.current.triggerCelebration();

      // THEN
      expect(mockFireLayeredCelebration).not.toHaveBeenCalled();
    });
  });

  describe('stability', () => {
    it('should return stable triggerCelebration function reference', () => {
      // GIVEN
      const { result, rerender } = renderHook(() => useLayeredCelebration());
      const firstRef = result.current.triggerCelebration;

      // WHEN
      rerender();

      // THEN
      expect(result.current.triggerCelebration).toBe(firstRef);
    });

    it('should update when particle budget changes', () => {
      // GIVEN
      const highBudget = {
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      };
      mockUseParticleBudget.mockReturnValue(highBudget);

      const { result, rerender } = renderHook(() => useLayeredCelebration());

      // Trigger with initial budget
      result.current.triggerCelebration();
      expect(mockFireLayeredCelebration).toHaveBeenCalledWith(2000, highBudget);

      // WHEN - Change budget
      const lowBudget = {
        tier: 'low',
        max: 30,
        combo: 5,
        levelUp: 20,
        word: 3,
      };
      mockUseParticleBudget.mockReturnValue(lowBudget);
      rerender();

      // Clear previous calls
      mockFireLayeredCelebration.mockClear();

      // Trigger with new budget
      result.current.triggerCelebration();

      // THEN
      expect(mockFireLayeredCelebration).toHaveBeenCalledWith(2000, lowBudget);
    });
  });

  describe('edge cases', () => {
    it('should handle zero budget gracefully', () => {
      // GIVEN
      mockUseParticleBudget.mockReturnValue({
        tier: 'low',
        max: 0,
        combo: 0,
        levelUp: 0,
        word: 0,
      });

      const { result } = renderHook(() => useLayeredCelebration());

      // WHEN
      result.current.triggerCelebration();

      // THEN - Should not fire celebration with 0 budget
      expect(mockFireLayeredCelebration).not.toHaveBeenCalled();
    });

    it('should allow multiple celebrations in succession', () => {
      // GIVEN
      const { result } = renderHook(() => useLayeredCelebration());

      // WHEN
      result.current.triggerCelebration();
      result.current.triggerCelebration();
      result.current.triggerCelebration();

      // THEN
      expect(mockFireLayeredCelebration).toHaveBeenCalledTimes(3);
      expect(mockFireLayeredCelebration).toHaveBeenCalledWith(2000, {
        tier: 'high',
        max: 100,
        combo: 15,
        levelUp: 60,
        word: 10,
      });
    });
  });
});
