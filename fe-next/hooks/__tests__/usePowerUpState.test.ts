/**
 * Tests for usePowerUpState hook - Power-Up Cooldown State Machine
 *
 * Tests the RED-GREEN-REFACTOR cycle for power-up state management:
 * - State transitions: ready -> active -> cooldown -> ready
 * - Timestamp-based cooldown calculation (no drift)
 * - 60-second cooldown enforcement
 * - Effect duration handling (instant vs duration-based)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePowerUpState } from '../usePowerUpState';

describe('usePowerUpState - TDD Cycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('RED Phase - Initial state and interface', () => {
    it('should return correct interface for freezeTime power-up', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      // THEN
      expect(result.current).toHaveProperty('powerUp');
      expect(result.current).toHaveProperty('activate');
      expect(result.current).toHaveProperty('isReady');
      expect(typeof result.current.activate).toBe('function');
    });

    it('should initialize in ready state', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      // THEN
      expect(result.current.powerUp.state).toBe('ready');
      expect(result.current.isReady).toBe(true);
      expect(result.current.powerUp.remainingCooldown).toBe(0);
    });

    it('should have correct power-up type', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('hint'));

      // THEN
      expect(result.current.powerUp.type).toBe('hint');
    });
  });

  describe('GREEN Phase - State transitions', () => {
    it('should transition from ready to active when activated', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));
      expect(result.current.powerUp.state).toBe('ready');

      // WHEN
      let activationResult: boolean = false;
      act(() => {
        activationResult = result.current.activate();
      });

      // THEN
      expect(activationResult).toBe(true);
      expect(result.current.powerUp.state).toBe('active');
      expect(result.current.isReady).toBe(false);
      expect(result.current.powerUp.activatedAt).toBeDefined();
    });

    it('should reject activation when in cooldown', () => {
      // GIVEN - activate first time
      const { result } = renderHook(() => usePowerUpState('freezeTime'));
      act(() => {
        result.current.activate();
      });

      // Force transition to cooldown (instant power-up)
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // WHEN - try to activate again during cooldown
      let secondActivation: boolean = false;
      act(() => {
        secondActivation = result.current.activate();
      });

      // THEN
      expect(secondActivation).toBe(false);
      expect(result.current.powerUp.state).toBe('cooldown');
    });

    it('should transition instant power-up (freezeTime) to cooldown immediately', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      // WHEN
      act(() => {
        result.current.activate();
      });

      // Advance past activation frame
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // THEN
      expect(result.current.powerUp.state).toBe('cooldown');
      expect(result.current.powerUp.remainingCooldown).toBeGreaterThan(0);
    });

    it('should transition duration power-up (scoreMultiplier) after effect duration', () => {
      // GIVEN - scoreMultiplier has 30s effect duration
      const { result } = renderHook(() => usePowerUpState('scoreMultiplier'));

      // WHEN
      act(() => {
        result.current.activate();
      });

      // THEN - should be active
      expect(result.current.powerUp.state).toBe('active');

      // WHEN - advance time by effect duration (30s)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // THEN - should transition to cooldown
      expect(result.current.powerUp.state).toBe('cooldown');
    });
  });

  describe('REFACTOR Phase - Timestamp-based cooldown calculation', () => {
    it('should calculate remaining cooldown from timestamp', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      act(() => {
        result.current.activate();
      });

      // Force to cooldown
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // THEN - should start at 60s cooldown
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(60, 0);
      expect(result.current.powerUp.totalCooldown).toBe(60);

      // WHEN - 10 seconds pass
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // THEN - should be 50s remaining
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(50, 0);
    });

    it('should transition back to ready after 60s cooldown', async () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('hint'));

      act(() => {
        result.current.activate();
      });

      // Force to cooldown
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.powerUp.state).toBe('cooldown');

      // WHEN - advance full cooldown period
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // THEN
      await waitFor(() => {
        expect(result.current.powerUp.state).toBe('ready');
        expect(result.current.isReady).toBe(true);
        expect(result.current.powerUp.remainingCooldown).toBe(0);
      });
    });

    it('should use Date.now() for timestamp calculations to avoid drift', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));
      const now = Date.now();

      // WHEN
      act(() => {
        result.current.activate();
      });

      // Force to cooldown
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // THEN - activatedAt should be a timestamp
      expect(result.current.powerUp.activatedAt).toBeGreaterThanOrEqual(now);
      expect(typeof result.current.powerUp.activatedAt).toBe('number');
    });
  });

  describe('Power-up specific configurations', () => {
    it('should have 0s effect duration for freezeTime (instant)', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      // THEN
      expect(result.current.powerUp.effectDuration).toBe(0);
    });

    it('should have 0s effect duration for hint (instant)', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('hint'));

      // THEN
      expect(result.current.powerUp.effectDuration).toBe(0);
    });

    it('should have 30s effect duration for scoreMultiplier', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('scoreMultiplier'));

      // THEN
      expect(result.current.powerUp.effectDuration).toBe(30);
    });

    it('should handle all power-up types', () => {
      const types = ['freezeTime', 'hint', 'scoreMultiplier'] as const;

      types.forEach(type => {
        const { result } = renderHook(() => usePowerUpState(type));
        expect(result.current.powerUp.type).toBe(type);
      });
    });
  });

  describe('Edge cases', () => {
    it('should not drift during long cooldown periods', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      act(() => {
        result.current.activate();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      const initialRemaining = result.current.powerUp.remainingCooldown;

      // WHEN - simulate many small time advances (could cause drift with setInterval)
      for (let i = 0; i < 100; i++) {
        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      // THEN - should have advanced exactly 10 seconds (100 * 100ms)
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(initialRemaining - 10, 0);
    });

    it('should clamp remaining cooldown to 0 (never negative)', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      act(() => {
        result.current.activate();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // WHEN - advance way past cooldown period
      act(() => {
        jest.advanceTimersByTime(120000); // 120 seconds
      });

      // THEN
      expect(result.current.powerUp.remainingCooldown).toBe(0);
      expect(result.current.powerUp.state).toBe('ready');
    });
  });
});
