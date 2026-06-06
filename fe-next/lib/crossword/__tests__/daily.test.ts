import { describe, it, expect } from 'vitest';
import { pickDaily } from '../daily';
import type { CrosswordPuzzle } from '../types';

const mk = (id: string): CrosswordPuzzle => ({
  id,
  locale: 'en',
  size: 5,
  rtl: false,
  cells: [],
  slots: [],
  difficulty: 'easy',
  source: 'authored',
});

const pool = [mk('p1'), mk('p2'), mk('p3'), mk('p4'), mk('p5')];

describe('pickDaily', () => {
  it('is deterministic for the same (date, locale)', () => {
    const a = pickDaily(pool, '2026-06-06', 'en');
    const b = pickDaily(pool, '2026-06-06', 'en');
    expect(a?.id).toBe(b?.id);
  });

  it('varies across dates (not always the same puzzle)', () => {
    const picks = new Set(
      ['2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10'].map(
        (d) => pickDaily(pool, d, 'en')?.id,
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it('differs by locale for the same date (independent seeds)', () => {
    // Not guaranteed different every date, but the seed string includes locale,
    // so the selection function must incorporate it. Check the seed wiring by
    // ensuring at least one date diverges across a small window.
    const diverges = ['2026-06-06', '2026-06-07', '2026-06-08'].some(
      (d) => pickDaily(pool, d, 'en')?.id !== pickDaily(pool, d, 'he')?.id,
    );
    expect(diverges).toBe(true);
  });

  it('returns null for an empty pool', () => {
    expect(pickDaily([], '2026-06-06', 'en')).toBeNull();
  });
});
