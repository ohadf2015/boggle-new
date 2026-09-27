/**
 * Which class-streak number is allowed on screen — RED first.
 *
 * The assignment card had TWO sources for one number: a localStorage copy that
 * paints instantly and a server copy that lands a moment later. That is exactly
 * pitfalls Class 1 — the late source flips the early one and the student sees
 * "7-day streak" blink down to "2-day streak". A device that finished on seven
 * days the server has never heard of is not a smaller number, it is a WRONG one.
 *
 * Rule: nothing is claimed until the server answers. The device copy is only a
 * fallback for a server we could not reach at all.
 */
import { describe, it, expect } from 'vitest';
import { resolveClassStreak } from '../missGapStreakSource';

describe('resolveClassStreak', () => {
  it('shows nothing while the server read is still in flight', () => {
    expect(resolveClassStreak({ server: null, device: 7, failed: false })).toEqual({
      streak: 0,
      resolved: false,
      source: 'pending',
    });
  });

  it('never lets the device copy outrank a server answer', () => {
    expect(resolveClassStreak({ server: 2, device: 7, failed: false })).toEqual({
      streak: 2,
      resolved: true,
      source: 'server',
    });
  });

  it('accepts a server zero as the truth', () => {
    expect(resolveClassStreak({ server: 0, device: 4, failed: false })).toEqual({
      streak: 0,
      resolved: true,
      source: 'server',
    });
  });

  it('falls back to the device copy only when the server could not be read', () => {
    expect(resolveClassStreak({ server: null, device: 4, failed: true })).toEqual({
      streak: 4,
      resolved: true,
      source: 'device',
    });
  });

  it('clamps nonsense to a non-negative integer', () => {
    expect(resolveClassStreak({ server: -3, device: 0, failed: false }).streak).toBe(0);
    expect(resolveClassStreak({ server: 2.6, device: 0, failed: false }).streak).toBe(3);
  });
});
