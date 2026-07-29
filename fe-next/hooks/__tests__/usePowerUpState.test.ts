/**
 * Tests for usePowerUpState hook - Power-Up Cooldown State Machine
 *
 * Tests the RED-GREEN-REFACTOR cycle for power-up state management:
 * - State transitions: ready -> active -> cooldown -> ready
 * - Timestamp-based cooldown calculation (no drift)
 * - 60-second cooldown enforcement
 * - Effect duration handling (instant vs duration-based)
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePowerUpState } from '../usePowerUpState';

describe('usePowerUpState - TDD Cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
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
        vi.advanceTimersByTime(100);
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
        vi.advanceTimersByTime(100);
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
        vi.advanceTimersByTime(30000);
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
        vi.advanceTimersByTime(100);
      });

      // THEN - should start at 60s cooldown
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(60, 0);
      expect(result.current.powerUp.totalCooldown).toBe(60);

      // WHEN - 10 seconds pass
      act(() => {
        vi.advanceTimersByTime(10000);
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
        vi.advanceTimersByTime(100);
      });

      expect(result.current.powerUp.state).toBe('cooldown');

      // WHEN - advance full cooldown period
      act(() => {
        vi.advanceTimersByTime(60000);
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
        vi.advanceTimersByTime(100);
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
        vi.advanceTimersByTime(100);
      });

      const initialRemaining = result.current.powerUp.remainingCooldown;

      // WHEN - simulate many small time advances (could cause drift with setInterval)
      for (let i = 0; i < 100; i++) {
        act(() => {
          vi.advanceTimersByTime(100);
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
        vi.advanceTimersByTime(100);
      });

      // WHEN - advance way past cooldown period
      act(() => {
        vi.advanceTimersByTime(120000); // 120 seconds
      });

      // THEN
      expect(result.current.powerUp.remainingCooldown).toBe(0);
      expect(result.current.powerUp.state).toBe('ready');
    });
  });

  describe('Cooldown Multiplier (Adaptive Difficulty)', () => {
    it('should use base cooldown with default multiplier (1.0)', () => {
      // GIVEN
      const { result } = renderHook(() => usePowerUpState('freezeTime'));

      // WHEN
      act(() => {
        result.current.activate();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // THEN - 60s cooldown (60 * 1.0)
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(60, 0);
      expect(result.current.powerUp.totalCooldown).toBe(60);
    });

    it('should extend cooldown with multiplier 1.5 (hard tier)', () => {
      // GIVEN - hard tier uses 1.5x multiplier
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          cooldownMultiplier: 1.5,
        })
      );

      // WHEN
      act(() => {
        result.current.activate();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // THEN - 90s cooldown (60 * 1.5)
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(90, 0);
      expect(result.current.powerUp.totalCooldown).toBe(90);
    });

    it('should reduce cooldown with multiplier 0.5', () => {
      // GIVEN
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          cooldownMultiplier: 0.5,
        })
      );

      // WHEN
      act(() => {
        result.current.activate();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // THEN - 30s cooldown (60 * 0.5)
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(30, 0);
      expect(result.current.powerUp.totalCooldown).toBe(30);
    });

    it('should apply multiplier to cooldown countdown', () => {
      // GIVEN - 2x multiplier = 120s cooldown
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          cooldownMultiplier: 2.0,
        })
      );

      act(() => {
        result.current.activate();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // THEN - starts at 120s
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(120, 0);

      // WHEN - 30 seconds pass
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // THEN - should be 90s remaining
      expect(result.current.powerUp.remainingCooldown).toBeCloseTo(90, 0);
    });

    it('should transition to ready after full multiplied cooldown', async () => {
      // GIVEN - 0.5x multiplier = 30s cooldown
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          cooldownMultiplier: 0.5,
        })
      );

      act(() => {
        result.current.activate();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.powerUp.state).toBe('cooldown');

      // WHEN - advance 30 seconds (full cooldown)
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // THEN - should transition to ready
      await waitFor(() => {
        expect(result.current.powerUp.state).toBe('ready');
        expect(result.current.isReady).toBe(true);
      });
    });

    it('should handle multiplier 0 (instant cooldown)', async () => {
      // GIVEN
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          cooldownMultiplier: 0,
        })
      );

      // WHEN
      act(() => {
        result.current.activate();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // THEN - should immediately be ready (0s cooldown)
      await waitFor(() => {
        expect(result.current.powerUp.state).toBe('ready');
        expect(result.current.isReady).toBe(true);
        expect(result.current.powerUp.remainingCooldown).toBe(0);
      });
    });

    it('should floor cooldown duration to avoid fractional values', () => {
      // GIVEN - 1.5x multiplier on 60s = 90.0s
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          cooldownMultiplier: 1.5,
        })
      );

      act(() => {
        result.current.activate();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // THEN - totalCooldown should be integer
      expect(result.current.powerUp.totalCooldown).toBe(90);
      expect(Number.isInteger(result.current.powerUp.totalCooldown)).toBe(true);
    });
  });

  describe('Initial Cooldown Timestamp (Persistence Integration)', () => {
    it('should initialize with cooldown state when timestamp provided', () => {
      // GIVEN - timestamp from 30 seconds ago (active cooldown)
      const thirtySecondsAgo = Date.now() - 30000;

      // WHEN
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          initialCooldownTimestamp: thirtySecondsAgo,
        })
      );

      // THEN - should be in cooldown state, not ready
      expect(result.current.powerUp.state).toBe('cooldown');
      expect(result.current.isReady).toBe(false);
      expect(result.current.powerUp.remainingCooldown).toBeGreaterThan(29);
      expect(result.current.powerUp.remainingCooldown).toBeLessThanOrEqual(30);
    });

    it('should initialize as ready when timestamp is 0', () => {
      // GIVEN
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          initialCooldownTimestamp: 0,
        })
      );

      // THEN
      expect(result.current.powerUp.state).toBe('ready');
      expect(result.current.isReady).toBe(true);
      expect(result.current.powerUp.remainingCooldown).toBe(0);
    });

    it('should initialize as ready when timestamp is expired', () => {
      // GIVEN - timestamp from 70 seconds ago (cooldown is 60s)
      const seventySecondsAgo = Date.now() - 70000;

      // WHEN
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          initialCooldownTimestamp: seventySecondsAgo,
        })
      );

      // THEN
      expect(result.current.powerUp.state).toBe('ready');
      expect(result.current.isReady).toBe(true);
      expect(result.current.powerUp.remainingCooldown).toBe(0);
    });

    it('should handle partial cooldown from timestamp', () => {
      // GIVEN - timestamp from 45 seconds ago (15s remaining)
      const fortyFiveSecondsAgo = Date.now() - 45000;

      // WHEN
      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          initialCooldownTimestamp: fortyFiveSecondsAgo,
        })
      );

      // THEN
      expect(result.current.powerUp.state).toBe('cooldown');
      expect(result.current.powerUp.remainingCooldown).toBeGreaterThan(14);
      expect(result.current.powerUp.remainingCooldown).toBeLessThanOrEqual(15);
    });

    it('should transition to ready after remaining cooldown expires', async () => {
      // GIVEN - timestamp from 50 seconds ago (10s remaining)
      const fiftySecondsAgo = Date.now() - 50000;

      const { result } = renderHook(() =>
        usePowerUpState('freezeTime', {
          initialCooldownTimestamp: fiftySecondsAgo,
        })
      );

      expect(result.current.powerUp.state).toBe('cooldown');

      // WHEN - advance past remaining cooldown
      act(() => {
        vi.advanceTimersByTime(11000); // 11 seconds
      });

      // THEN - should transition to ready
      await waitFor(() => {
        expect(result.current.powerUp.state).toBe('ready');
        expect(result.current.isReady).toBe(true);
        expect(result.current.powerUp.remainingCooldown).toBe(0);
      });
    });
  });
});
