import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AUTO_START_SECONDS,
  shouldTriggerAutoStart,
  isAutoStartActive,
  startAutoStartCountdown,
  cancelAutoStartCountdown,
  clearAutoStartState,
} from './lobbyAutoStart.js';

describe('lobbyAutoStart', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    clearAutoStartState('GAME');
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('shouldTriggerAutoStart', () => {
    it('triggers when all non-host humans are ready', () => {
      expect(shouldTriggerAutoStart(2, 2)).toBe(true);
    });
    it('does not trigger when some players are not ready', () => {
      expect(shouldTriggerAutoStart(1, 2)).toBe(false);
    });
    it('does not trigger when there are no human guests (solo host)', () => {
      // totalPlayers === 0 → bot-countdown path owns this, not auto-start
      expect(shouldTriggerAutoStart(0, 0)).toBe(false);
    });
  });

  describe('startAutoStartCountdown', () => {
    it('ticks down each second and fires once at zero', () => {
      const onTick = vi.fn();
      const onFire = vi.fn();
      startAutoStartCountdown('GAME', { onTick, onFire }, 3);

      // Immediate tick announces the starting value
      expect(onTick).toHaveBeenLastCalledWith(3);
      expect(isAutoStartActive('GAME')).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenLastCalledWith(2);
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenLastCalledWith(1);

      vi.advanceTimersByTime(1000);
      expect(onFire).toHaveBeenCalledTimes(1);
      // Countdown self-clears after firing so a duplicate fire is impossible
      expect(isAutoStartActive('GAME')).toBe(false);
    });

    it('does not restart/reset a countdown already in flight', () => {
      const onTick = vi.fn();
      const onFire = vi.fn();
      startAutoStartCountdown('GAME', { onTick, onFire }, 5);
      vi.advanceTimersByTime(2000); // now at 3
      onTick.mockClear();
      // Second trigger (e.g. a redundant all-ready) must be ignored
      startAutoStartCountdown('GAME', { onTick, onFire }, 5);
      expect(onTick).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenLastCalledWith(2); // still the original clock
    });

    it('defaults to AUTO_START_SECONDS', () => {
      const onTick = vi.fn();
      startAutoStartCountdown('GAME', { onTick, onFire: vi.fn() });
      expect(onTick).toHaveBeenLastCalledWith(AUTO_START_SECONDS);
    });
  });

  describe('cancelAutoStartCountdown', () => {
    it('stops the countdown, fires onCancel, and prevents onFire', () => {
      const onFire = vi.fn();
      const onCancel = vi.fn();
      startAutoStartCountdown('GAME', { onTick: vi.fn(), onFire }, 3);

      const cancelled = cancelAutoStartCountdown('GAME', onCancel);
      expect(cancelled).toBe(true);
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(isAutoStartActive('GAME')).toBe(false);

      vi.advanceTimersByTime(5000);
      expect(onFire).not.toHaveBeenCalled();
    });

    it('returns false (no-op) when nothing is running', () => {
      const onCancel = vi.fn();
      expect(cancelAutoStartCountdown('GAME', onCancel)).toBe(false);
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('clearAutoStartState', () => {
    it('silently tears down a running countdown without firing callbacks', () => {
      const onFire = vi.fn();
      const onCancel = vi.fn();
      startAutoStartCountdown('GAME', { onTick: vi.fn(), onFire }, 3);
      clearAutoStartState('GAME');
      expect(isAutoStartActive('GAME')).toBe(false);
      vi.advanceTimersByTime(5000);
      expect(onFire).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});
