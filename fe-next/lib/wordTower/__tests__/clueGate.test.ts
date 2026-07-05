/**
 * Word Tower — daily clue gate (#6): one free clue/day, per UTC date.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { freeClueUsedToday, markFreeClueUsed } from '../clueGate';

describe('clueGate', () => {
  beforeEach(() => localStorage.clear());

  it('reports the free clue as unused until it is marked', () => {
    expect(freeClueUsedToday('2026-07-06')).toBe(false);
    markFreeClueUsed('2026-07-06');
    expect(freeClueUsedToday('2026-07-06')).toBe(true);
  });

  it('is scoped per UTC date — a new day resets the free clue', () => {
    markFreeClueUsed('2026-07-06');
    expect(freeClueUsedToday('2026-07-06')).toBe(true);
    expect(freeClueUsedToday('2026-07-07')).toBe(false); // next day is free again
  });

  it('is idempotent — marking twice keeps it used', () => {
    markFreeClueUsed('2026-07-06');
    markFreeClueUsed('2026-07-06');
    expect(freeClueUsedToday('2026-07-06')).toBe(true);
  });
});
