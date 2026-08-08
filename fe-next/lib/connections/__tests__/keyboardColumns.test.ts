/**
 * The keyboard sizes every letter key off ONE column width so a 6-key row
 * renders keys identical to a 10-key row (commit 96a7f46f3, "uniform key widths
 * across all keyboard rows"). That budget has to include the submit and
 * backspace keys, which share the LAST row with letters.
 *
 * Dividing by the longest row alone over-subscribes the last row whenever
 * lastRowLetters + action keys exceeds it. Letters carry flex-shrink while the
 * action keys hold a min-width, so the letters silently give up the difference
 * and the bottom row renders narrower than the rest — the exact property the
 * uniform-width work set out to guarantee.
 *
 * Hebrew is the locale this actually breaks (rows 6/8/8: the last row is
 * already as long as the longest), and Hebrew is the locale with real players.
 */
import { describe, it, expect } from 'vitest';
import { getKeyboardRows, letterColumnCount, ACTION_KEY_COLUMNS } from '../keyboard';

describe('letterColumnCount', () => {
  it('uses the longest row when the last row has room for the action keys', () => {
    // QWERTY: longest 10, last row 7 letters + 3 action columns = 10 → no change.
    expect(letterColumnCount(getKeyboardRows('en'))).toBe(10);
  });

  it('uses the longest row for Russian, which also fits exactly', () => {
    // ЙЦУКЕН: longest 12, last row 9 + 3 = 12.
    expect(letterColumnCount(getKeyboardRows('ru'))).toBe(12);
  });

  it('widens the budget for Hebrew, whose last row leaves no room for the action keys', () => {
    // Hebrew rows are 6/8/8 — the last row is already the longest, so the
    // submit + backspace keys have nothing to sit in without squashing letters.
    const rows = getKeyboardRows('he');
    expect(Math.max(...rows.map((r) => r.length))).toBe(8);
    expect(letterColumnCount(rows)).toBe(8 + ACTION_KEY_COLUMNS);
  });

  it('never returns fewer columns than the longest row', () => {
    for (const locale of ['en', 'he', 'ru', 'es', 'sv']) {
      const rows = getKeyboardRows(locale);
      expect(letterColumnCount(rows)).toBeGreaterThanOrEqual(Math.max(...rows.map((r) => r.length)));
    }
  });

  it('is safe on degenerate input', () => {
    expect(letterColumnCount([])).toBeGreaterThan(0);
    expect(letterColumnCount([[]])).toBeGreaterThan(0);
  });
});
