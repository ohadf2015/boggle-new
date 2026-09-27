/**
 * dailyVariant — pure UTC-day parity selection between the two Word Bridge
 * daily flavors (regular 5-riddle chain vs pyramid).
 */
import { describe, it, expect } from 'vitest';
import { dailyConnectionsVariant } from '@/lib/connections/dailyVariant';

describe('dailyConnectionsVariant', () => {
  it('is a pure function of the date', () => {
    expect(dailyConnectionsVariant('2026-09-07')).toBe(dailyConnectionsVariant('2026-09-07'));
  });

  it('alternates between regular and pyramid on consecutive UTC days', () => {
    // 2026-09-06 → 2026-09-12 — seven consecutive days must strictly alternate.
    const seq = [
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ].map(dailyConnectionsVariant);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).not.toBe(seq[i - 1]);
    }
    expect(new Set(seq).size).toBe(2);
  });

  it('covers both variants across a month boundary', () => {
    // September has 30 days → both parities occur regardless of the epoch offset.
    const seq = Array.from({ length: 30 }, (_, i) =>
      dailyConnectionsVariant(`2026-09-${String(i + 1).padStart(2, '0')}`),
    );
    expect(seq).toContain('regular');
    expect(seq).toContain('pyramid');
  });

  it('falls back to regular on invalid input', () => {
    expect(dailyConnectionsVariant('not-a-date')).toBe('regular');
    expect(dailyConnectionsVariant('')).toBe('regular');
  });
});
