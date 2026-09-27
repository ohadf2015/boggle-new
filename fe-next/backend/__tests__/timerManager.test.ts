/**
 * Timer Manager Tests
 * Tests for centralized timer management and cleanup
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import timerManager, { TimerManager, setGameTimer, clearGameTimer } from '../utils/timerManager';

describe('TimerManager', () => {

  // Use a fresh instance for each test to avoid interference
  let manager: TimerManager;

  beforeEach(() => {
    manager = new TimerManager();
  });

  afterEach(() => {
    // Clean up all timers
    manager.clearAll();
  });

  describe('setInterval', () => {

    test('creates an interval timer and returns key', () => {
      const callback = vi.fn();
      const key = manager.setInterval('test-interval', callback, 1000);

      expect(key).toBe('test-interval');
      expect(manager.hasTimer('test-interval')).toBe(true);
    });

    test('callback is called at interval', async () => {
      const callback = vi.fn();
      manager.setInterval('interval-test', callback, 50);

      // Wait for enough time to ensure at least 2 calls
      // Using 300ms for 50ms interval (6x buffer) to handle timer imprecision and CI load
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    test('replaces existing timer with same key', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.setInterval('same-key', callback1, 1000);
      manager.setInterval('same-key', callback2, 1000);

      expect(manager.getTimerCount()).toBe(1);
    });
  });

  describe('setTimeout', () => {

    test('creates a timeout timer and returns key', () => {
      const callback = vi.fn();
      const key = manager.setTimeout('test-timeout', callback, 1000);

      expect(key).toBe('test-timeout');
      expect(manager.hasTimer('test-timeout')).toBe(true);
    });

    test('callback is called after delay', async () => {
      const callback = vi.fn();
      manager.setTimeout('timeout-test', callback, 50);

      expect(callback).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('replaces existing timer with same key', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.setTimeout('same-key', callback1, 1000);
      manager.setTimeout('same-key', callback2, 1000);

      expect(manager.getTimerCount()).toBe(1);
    });
  });

  describe('clearTimer', () => {

    test('clears existing interval timer', () => {
      const callback = vi.fn();
      manager.setInterval('to-clear', callback, 100);

      expect(manager.hasTimer('to-clear')).toBe(true);

      const result = manager.clearTimer('to-clear');

      expect(result).toBe(true);
      expect(manager.hasTimer('to-clear')).toBe(false);
    });

    test('clears existing timeout timer', () => {
      const callback = vi.fn();
      manager.setTimeout('to-clear', callback, 100);

      const result = manager.clearTimer('to-clear');

      expect(result).toBe(true);
      expect(manager.hasTimer('to-clear')).toBe(false);
    });

    test('returns false for non-existent timer', () => {
      const result = manager.clearTimer('nonexistent');
      expect(result).toBe(false);
    });

    test('prevents callback from firing after clear', async () => {
      const callback = vi.fn();
      manager.setTimeout('prevent-fire', callback, 50);

      manager.clearTimer('prevent-fire');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callback).not.toHaveBeenCalled();
    });

    test('stops interval from continuing after clear', async () => {
      const callback = vi.fn();
      manager.setInterval('stop-interval', callback, 30);

      // Let it fire once
      await new Promise(resolve => setTimeout(resolve, 50));
      const countBefore = callback.mock.calls.length;

      manager.clearTimer('stop-interval');

      // Wait more time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have fired more times
      expect(callback.mock.calls.length).toBe(countBefore);
    });
  });

  describe('clearTimersWithPrefix', () => {

    test('clears all timers with matching prefix', () => {
      manager.setInterval('game:ABC:timer1', vi.fn(), 1000);
      manager.setInterval('game:ABC:timer2', vi.fn(), 1000);
      manager.setTimeout('game:ABC:timeout', vi.fn(), 1000);
      manager.setInterval('game:XYZ:timer1', vi.fn(), 1000);

      const cleared = manager.clearTimersWithPrefix('game:ABC');

      expect(cleared).toBe(3);
      expect(manager.hasTimer('game:ABC:timer1')).toBe(false);
      expect(manager.hasTimer('game:ABC:timer2')).toBe(false);
      expect(manager.hasTimer('game:ABC:timeout')).toBe(false);
      expect(manager.hasTimer('game:XYZ:timer1')).toBe(true);
    });

    test('returns 0 when no timers match prefix', () => {
      manager.setInterval('other:timer', vi.fn(), 1000);

      const cleared = manager.clearTimersWithPrefix('game:');

      expect(cleared).toBe(0);
    });

    test('handles empty timer map', () => {
      const cleared = manager.clearTimersWithPrefix('any');
      expect(cleared).toBe(0);
    });
  });

  describe('clearAll', () => {

    test('clears all timers', () => {
      manager.setInterval('timer1', vi.fn(), 1000);
      manager.setInterval('timer2', vi.fn(), 1000);
      manager.setTimeout('timeout1', vi.fn(), 1000);
      manager.setTimeout('timeout2', vi.fn(), 1000);

      expect(manager.getTimerCount()).toBe(4);

      const cleared = manager.clearAll();

      expect(cleared).toBe(4);
      expect(manager.getTimerCount()).toBe(0);
    });

    test('returns 0 for empty manager', () => {
      const cleared = manager.clearAll();
      expect(cleared).toBe(0);
    });

    test('prevents all callbacks from firing', async () => {
      const callbacks = [vi.fn(), vi.fn(), vi.fn()];

      manager.setTimeout('t1', callbacks[0], 50);
      manager.setTimeout('t2', callbacks[1], 50);
      manager.setInterval('i1', callbacks[2], 50);

      manager.clearAll();

      await new Promise(resolve => setTimeout(resolve, 100));

      callbacks.forEach(cb => {
        expect(cb).not.toHaveBeenCalled();
      });
    });
  });

  describe('hasTimer', () => {

    test('returns true for existing timer', () => {
      manager.setInterval('exists', vi.fn(), 1000);
      expect(manager.hasTimer('exists')).toBe(true);
    });

    test('returns false for non-existent timer', () => {
      expect(manager.hasTimer('nonexistent')).toBe(false);
    });

    test('returns false after timer is cleared', () => {
      manager.setInterval('was-here', vi.fn(), 1000);
      manager.clearTimer('was-here');
      expect(manager.hasTimer('was-here')).toBe(false);
    });
  });

  describe('getTimerCount', () => {

    test('returns 0 for empty manager', () => {
      expect(manager.getTimerCount()).toBe(0);
    });

    test('returns correct count', () => {
      manager.setInterval('i1', vi.fn(), 1000);
      manager.setTimeout('t1', vi.fn(), 1000);

      expect(manager.getTimerCount()).toBe(2);

      manager.setInterval('i2', vi.fn(), 1000);

      expect(manager.getTimerCount()).toBe(3);
    });

    test('decreases after clear', () => {
      manager.setInterval('i1', vi.fn(), 1000);
      manager.setInterval('i2', vi.fn(), 1000);

      expect(manager.getTimerCount()).toBe(2);

      manager.clearTimer('i1');

      expect(manager.getTimerCount()).toBe(1);
    });
  });

  describe('getTimerKeys', () => {

    test('returns all keys without prefix', () => {
      manager.setInterval('game:A:timer', vi.fn(), 1000);
      manager.setInterval('game:B:timer', vi.fn(), 1000);
      manager.setTimeout('other:timer', vi.fn(), 1000);

      const keys = manager.getTimerKeys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('game:A:timer');
      expect(keys).toContain('game:B:timer');
      expect(keys).toContain('other:timer');
    });

    test('returns filtered keys with prefix', () => {
      manager.setInterval('game:A:timer', vi.fn(), 1000);
      manager.setInterval('game:B:timer', vi.fn(), 1000);
      manager.setTimeout('other:timer', vi.fn(), 1000);

      const keys = manager.getTimerKeys('game:');

      expect(keys).toHaveLength(2);
      expect(keys).toContain('game:A:timer');
      expect(keys).toContain('game:B:timer');
      expect(keys).not.toContain('other:timer');
    });

    test('returns empty array when no matches', () => {
      manager.setInterval('other:timer', vi.fn(), 1000);

      const keys = manager.getTimerKeys('game:');

      expect(keys).toHaveLength(0);
    });
  });
});

describe('Game Timer Convenience Functions', () => {

  afterEach(() => {
    // Clear the singleton's timers
    timerManager.clearAll();
  });

  test('setGameTimer registers timer with game prefix', () => {
    const intervalId = setInterval(vi.fn(), 1000) as unknown as ReturnType<typeof setInterval>;
    setGameTimer('ABC123', intervalId);

    expect(timerManager.hasTimer('game:ABC123')).toBe(true);

    // Clean up
    clearInterval(intervalId);
  });

  test('clearGameTimer clears game timer', () => {
    const intervalId = setInterval(vi.fn(), 1000) as unknown as ReturnType<typeof setInterval>;
    setGameTimer('XYZ789', intervalId);

    const result = clearGameTimer('XYZ789');

    expect(result).toBe(true);
    expect(timerManager.hasTimer('game:XYZ789')).toBe(false);

    // Clean up
    clearInterval(intervalId);
  });

  test('clearGameTimer returns false for non-existent game', () => {
    const result = clearGameTimer('NONEXISTENT');
    expect(result).toBe(false);
  });
});

describe('Timer Manager - Memory Leak Prevention', () => {

  let manager: TimerManager;

  beforeEach(() => {
    manager = new TimerManager();
  });

  afterEach(() => {
    manager.clearAll();
  });

  test('replacing timers clears old ones to prevent leaks', async () => {
    const oldCallback = vi.fn();
    const newCallback = vi.fn();

    manager.setInterval('leak-test', oldCallback, 30);

    // Wait for old callback to fire
    await new Promise(resolve => setTimeout(resolve, 50));
    const oldCount = oldCallback.mock.calls.length;

    // Replace with new timer
    manager.setInterval('leak-test', newCallback, 30);

    // Wait more
    await new Promise(resolve => setTimeout(resolve, 100));

    // Old callback should not have fired more times
    expect(oldCallback.mock.calls.length).toBe(oldCount);
    // New callback should have fired
    expect(newCallback).toHaveBeenCalled();
  });

  test('multiple game cleanup scenario', () => {
    // Simulate multiple games starting and ending
    for (let i = 0; i < 10; i++) {
      const gameCode = `GAME${i}`;
      manager.setInterval(`game:${gameCode}:main`, vi.fn(), 1000);
      manager.setTimeout(`game:${gameCode}:end`, vi.fn(), 60000);
    }

    expect(manager.getTimerCount()).toBe(20);

    // Clean up half the games
    for (let i = 0; i < 5; i++) {
      manager.clearTimersWithPrefix(`game:GAME${i}`);
    }

    expect(manager.getTimerCount()).toBe(10);

    // Clean up rest
    manager.clearAll();

    expect(manager.getTimerCount()).toBe(0);
  });
});

describe('Timer Manager - Concurrent Operations', () => {

  let manager: TimerManager;

  beforeEach(() => {
    manager = new TimerManager();
  });

  afterEach(() => {
    manager.clearAll();
  });

  test('handles rapid timer creation and deletion', () => {
    const operations: Promise<void>[] = [];

    // Create many timers rapidly
    for (let i = 0; i < 100; i++) {
      manager.setTimeout(`rapid:${i}`, vi.fn(), 10000);
    }

    expect(manager.getTimerCount()).toBe(100);

    // Delete half of them
    for (let i = 0; i < 50; i++) {
      manager.clearTimer(`rapid:${i}`);
    }

    expect(manager.getTimerCount()).toBe(50);

    // Keys should only contain remaining timers
    const keys = manager.getTimerKeys('rapid:');
    expect(keys).toHaveLength(50);
    expect(keys).toContain('rapid:50');
    expect(keys).not.toContain('rapid:0');
  });

  test('isolation between different timer keys', async () => {
    const callbacks: Record<string, Mock> = {
      'a': vi.fn(),
      'b': vi.fn(),
      'c': vi.fn()
    };

    manager.setInterval('timer:a', callbacks.a, 20);
    manager.setInterval('timer:b', callbacks.b, 20);
    manager.setInterval('timer:c', callbacks.c, 20);

    await new Promise(resolve => setTimeout(resolve, 50));

    // All should have fired
    expect(callbacks.a).toHaveBeenCalled();
    expect(callbacks.b).toHaveBeenCalled();
    expect(callbacks.c).toHaveBeenCalled();

    // Clear only 'a'
    manager.clearTimer('timer:a');

    const countA = callbacks.a.mock.calls.length;
    const countB = callbacks.b.mock.calls.length;
    const countC = callbacks.c.mock.calls.length;

    await new Promise(resolve => setTimeout(resolve, 50));

    // 'a' should not have increased
    expect(callbacks.a.mock.calls.length).toBe(countA);
    // 'b' and 'c' should have increased
    expect(callbacks.b.mock.calls.length).toBeGreaterThan(countB);
    expect(callbacks.c.mock.calls.length).toBeGreaterThan(countC);
  });
});
