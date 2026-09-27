import { describe, it, expect, afterEach, vi } from 'vitest';
import { isReducedMotionPreferred } from '../accessibility';

/**
 * Imperative sibling to the `useReducedMotion` hook — safe to call from
 * non-React contexts (Pixi effect callbacks, RAF loops). Must be SSR-safe
 * (no crash when `window` is undefined) and must honor the
 * `(prefers-reduced-motion: reduce)` media query on the client.
 */
describe('isReducedMotionPreferred', () => {
  const originalMatchMedia = globalThis.window?.matchMedia;

  afterEach(() => {
    if (typeof globalThis.window !== 'undefined') {
      // Restore whatever jsdom provided (or clear our stub)
      globalThis.window.matchMedia = originalMatchMedia as typeof window.matchMedia;
    }
  });

  it('returns false when window is undefined (SSR)', () => {
    // Temporarily remove window to simulate server environment
    const savedWindow = globalThis.window;
    (globalThis as { window?: Window }).window = undefined;
    try {
      expect(isReducedMotionPreferred()).toBe(false);
    } finally {
      globalThis.window = savedWindow;
    }
  });

  it('returns false when matchMedia is unavailable', () => {
    (globalThis.window as { matchMedia?: typeof window.matchMedia }).matchMedia = undefined;
    expect(isReducedMotionPreferred()).toBe(false);
  });

  it('returns true when user prefers reduced motion', () => {
    globalThis.window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }) as unknown as typeof window.matchMedia;
    expect(isReducedMotionPreferred()).toBe(true);
  });

  it('returns false when user has no motion preference', () => {
    globalThis.window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }) as unknown as typeof window.matchMedia;
    expect(isReducedMotionPreferred()).toBe(false);
  });

  it('queries the correct media query string', () => {
    const matchMediaSpy = vi.fn().mockReturnValue({ matches: false });
    globalThis.window.matchMedia = matchMediaSpy as unknown as typeof window.matchMedia;
    isReducedMotionPreferred();
    expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
});
