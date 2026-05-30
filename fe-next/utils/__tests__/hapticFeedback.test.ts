/**
 * Haptic feedback SSR-safety + behavior.
 *
 * Regression: ConnectionsGame (a client component) still renders once on the
 * server. useHapticFeedback() calls isHapticSupported() at render time, which
 * dereferenced a bare `window.navigator` → "ReferenceError: window is not
 * defined" during SSR (Sentry JAVASCRIPT-NEXTJS-1K8). Guard the sink so every
 * caller is safe regardless of render phase.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  triggerHaptic,
  triggerCustomHaptic,
  isHapticSupported,
  stopHaptic,
} from '../hapticFeedback';

describe('hapticFeedback — SSR safety (no window)', () => {
  const realWindow = globalThis.window;

  beforeEach(() => {
    // Simulate server render: `window` is not defined.
    delete (globalThis as { window?: unknown }).window;
  });

  afterEach(() => {
    globalThis.window = realWindow;
  });

  it('isHapticSupported returns false instead of throwing', () => {
    expect(() => isHapticSupported()).not.toThrow();
    expect(isHapticSupported()).toBe(false);
  });

  it('triggerHaptic returns false instead of throwing', () => {
    expect(() => triggerHaptic('light')).not.toThrow();
    expect(triggerHaptic('light')).toBe(false);
  });

  it('triggerCustomHaptic returns false instead of throwing', () => {
    expect(() => triggerCustomHaptic(50)).not.toThrow();
    expect(triggerCustomHaptic(50)).toBe(false);
  });

  it('stopHaptic is a no-op instead of throwing', () => {
    expect(() => stopHaptic()).not.toThrow();
  });
});

describe('hapticFeedback — browser behavior', () => {
  const vibrate = vi.fn();

  beforeEach(() => {
    vibrate.mockReset();
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vibrate,
      configurable: true,
      writable: true,
    });
  });

  it('isHapticSupported is true when navigator.vibrate exists', () => {
    expect(isHapticSupported()).toBe(true);
  });

  it('triggerHaptic forwards the predefined pattern', () => {
    expect(triggerHaptic('success')).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([20, 30, 20]);
  });

  it('triggerCustomHaptic forwards the given duration', () => {
    expect(triggerCustomHaptic([100, 50, 100])).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('stopHaptic vibrates 0 to cancel', () => {
    stopHaptic();
    expect(vibrate).toHaveBeenCalledWith(0);
  });
});
