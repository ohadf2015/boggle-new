/**
 * Per-locale, per-mode practice completion tracking. Keyed in localStorage so
 * the hub can show a green check next to any mode the player has finished and
 * the chain CTA can read state without re-running game logic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  markPracticeMode,
  isPracticeModeComplete,
  getCompletedPracticeModes,
  resetPracticeProgress,
  PRACTICE_GOALS,
} from '../practiceProgress';
import { getPracticeStreak, resetPracticeStreak } from '@/hooks/usePracticeStreak';

// jsdom test env exposes window.localStorage but reset between tests.
beforeEach(() => {
  window.localStorage.clear();
  resetPracticeStreak();
});

describe('practiceProgress', () => {
  it('returns false for an unfinished mode', () => {
    expect(isPracticeModeComplete('classic', 'en')).toBe(false);
  });

  it('marks a mode complete and reads it back', () => {
    markPracticeMode('classic', 'en');
    expect(isPracticeModeComplete('classic', 'en')).toBe(true);
  });

  it('isolates progress per locale', () => {
    markPracticeMode('classic', 'en');
    expect(isPracticeModeComplete('classic', 'he')).toBe(false);
  });

  it('isolates progress per mode', () => {
    markPracticeMode('classic', 'en');
    expect(isPracticeModeComplete('wordHunt', 'en')).toBe(false);
  });

  it('returns the set of completed modes for a locale', () => {
    markPracticeMode('classic', 'en');
    markPracticeMode('wordHunt', 'en');
    const done = getCompletedPracticeModes('en');
    expect(done.has('classic')).toBe(true);
    expect(done.has('wordHunt')).toBe(true);
    expect(done.has('wheelRush')).toBe(false);
  });

  it('resetPracticeProgress clears all completed marks for a locale', () => {
    markPracticeMode('classic', 'en');
    markPracticeMode('wordHunt', 'en');
    resetPracticeProgress('en');
    expect(getCompletedPracticeModes('en').size).toBe(0);
  });

  it('exposes completion goal counts for the hub progress headline', () => {
    expect(PRACTICE_GOALS.classic).toBeGreaterThan(0);
    expect(PRACTICE_GOALS.wordHunt).toBe(1); // solving target = 1 success
    expect(PRACTICE_GOALS.wheelRush).toBeGreaterThan(0);
  });

  it('survives missing localStorage gracefully (SSR / private mode)', () => {
    const original = window.localStorage;
    // Simulate localStorage throwing — practice progress should never crash the page.
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } },
      configurable: true,
    });
    expect(() => isPracticeModeComplete('classic', 'en')).not.toThrow();
    expect(() => markPracticeMode('classic', 'en')).not.toThrow();
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
  });
});

describe('markPracticeMode side effects', () => {
  it('does not throw when called twice for the same mode', () => {
    markPracticeMode('classic', 'en');
    expect(() => markPracticeMode('classic', 'en')).not.toThrow();
    expect(isPracticeModeComplete('classic', 'en')).toBe(true);
  });

  it('fires a custom event so the hub can re-read without page reload', () => {
    const listener = vi.fn();
    window.addEventListener('practice:progress', listener);
    markPracticeMode('classic', 'en');
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('practice:progress', listener);
  });

  it('records a practice streak session on first completion of the day', () => {
    expect(getPracticeStreak().current).toBe(0);
    markPracticeMode('classic', 'en');
    expect(getPracticeStreak().current).toBe(1);
  });

  it('records the streak even when the mode was already marked (replay-on-new-day)', () => {
    // First mark + reset streak to simulate "yesterday" completion.
    markPracticeMode('classic', 'en');
    resetPracticeStreak();
    expect(getPracticeStreak().current).toBe(0);

    // Re-mark — even though the mode-set short-circuits as already done,
    // the streak side-effect must still tick.
    markPracticeMode('classic', 'en');
    expect(getPracticeStreak().current).toBe(1);
  });
});
