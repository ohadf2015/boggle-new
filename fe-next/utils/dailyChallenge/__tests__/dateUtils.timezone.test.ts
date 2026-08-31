/**
 * Daily puzzle date key + hub display must share one UTC calendar day.
 *
 * Repro: 2026-08-31 00:30 Asia/Jerusalem (UTC+3) is still 2026-08-30 UTC.
 * Local getDate() labeled the hub "Aug 31" while Word Hunt used the UTC key
 * "2026-08-30" / "Aug 30".
 */
import { describe, it, expect } from 'vitest';
import {
  getDailyChallengeDate,
  getDailyChallengeDisplayParts,
  formatDailyPuzzleDate,
} from '../dateUtils';

describe('daily challenge calendar day (UTC)', () => {
  it('Jerusalem early morning uses the UTC date key, not the local calendar day', () => {
    // 2026-08-31 00:30 in Asia/Jerusalem == 2026-08-30 21:30 UTC
    const now = new Date('2026-08-30T21:30:00.000Z');
    const iso = getDailyChallengeDate(now);
    const parts = getDailyChallengeDisplayParts(now);

    expect(iso).toBe('2026-08-30');
    expect(parts.iso).toBe(iso);
    expect(parts.dayNum).toBe(30);
    expect(parts.monthAbbr).toBe('AUG');
  });

  it('US Pacific evening after UTC midnight still uses the UTC date, not local Aug 30', () => {
    // 2026-08-31 01:00 UTC == 2026-08-30 18:00 PDT (UTC-7)
    const now = new Date('2026-08-31T01:00:00.000Z');
    const iso = getDailyChallengeDate(now);
    const parts = getDailyChallengeDisplayParts(now);

    expect(iso).toBe('2026-08-31');
    expect(parts.iso).toBe(iso);
    expect(parts.dayNum).toBe(31);
    expect(parts.monthAbbr).toBe('AUG');
  });

  it('formats a puzzle ISO key as that UTC calendar day even in a UTC− locale offset', () => {
    const formatted = formatDailyPuzzleDate(
      '2026-08-31',
      (date, options) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...options }),
    );
    expect(formatted).toBe('Aug 31');
  });
});
