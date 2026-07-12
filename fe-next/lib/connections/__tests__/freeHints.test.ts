import { describe, it, expect, beforeEach } from 'vitest';
import { freeHintsRemaining, consumeFreeHint, FREE_HINTS_PER_DAY } from '../freeHints';

describe('free hints', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('every player starts with 2 free hints per day', () => {
    expect(FREE_HINTS_PER_DAY).toBe(2);
    expect(freeHintsRemaining()).toBe(2);
  });

  it('consuming decrements down to zero and not below', () => {
    expect(consumeFreeHint()).toBe(1);
    expect(consumeFreeHint()).toBe(0);
    expect(consumeFreeHint()).toBe(0);
    expect(freeHintsRemaining()).toBe(0);
  });

  it('a stale (previous-day) counter resets to the full allowance', () => {
    // Simulate yesterday's exhausted counter under a different day key.
    window.localStorage.setItem('connections:freeHints', '2000-01-01:2');
    expect(freeHintsRemaining()).toBe(2);
  });

  it('ignores corrupted stored values', () => {
    window.localStorage.setItem('connections:freeHints', 'garbage');
    expect(freeHintsRemaining()).toBe(2);
    expect(consumeFreeHint()).toBe(1);
  });
});
