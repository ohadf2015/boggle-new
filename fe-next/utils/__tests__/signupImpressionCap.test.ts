/**
 * signupImpressionCap — the results_inline daily cap (t_561836a1).
 * At most 3 renders per guest per LOCAL day; the date-stamped key resets on
 * its own at local midnight; a memory fallback covers storage-less contexts.
 */
import {
  RESULTS_INLINE_DAILY_CAP,
  __resetResultsInlineCapForTests,
  getResultsInlineImpressionCount,
  isResultsInlineCapped,
  localDayStamp,
  recordResultsInlineImpression,
  resultsInlineCapKey,
} from '../signupImpressionCap';

describe('signupImpressionCap', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetResultsInlineCapForTests();
  });

  it('starts uncapped at 0 impressions', () => {
    expect(getResultsInlineImpressionCount()).toBe(0);
    expect(isResultsInlineCapped()).toBe(false);
  });

  it('counts impressions 1..3, then caps', () => {
    expect(recordResultsInlineImpression()).toBe(1);
    expect(isResultsInlineCapped()).toBe(false);
    expect(recordResultsInlineImpression()).toBe(2);
    expect(isResultsInlineCapped()).toBe(false);
    expect(recordResultsInlineImpression()).toBe(3);
    expect(isResultsInlineCapped()).toBe(true);
    expect(getResultsInlineImpressionCount()).toBe(RESULTS_INLINE_DAILY_CAP);
  });

  it('keeps counting past the cap only if called (renderers must check first)', () => {
    for (let i = 0; i < 5; i++) recordResultsInlineImpression();
    expect(getResultsInlineImpressionCount()).toBe(5);
  });

  it('resets on a new local day (key is date-stamped, no cleanup pass)', () => {
    const today = new Date(2026, 9, 26, 23, 59); // Oct 26 2026, local
    const tomorrow = new Date(2026, 9, 27, 0, 1);
    for (let i = 0; i < 3; i++) recordResultsInlineImpression(today);
    expect(isResultsInlineCapped(today)).toBe(true);
    // A new day reads a different key — the guest is uncapped again.
    expect(resultsInlineCapKey(today)).not.toBe(resultsInlineCapKey(tomorrow));
    expect(getResultsInlineImpressionCount(tomorrow)).toBe(0);
    expect(isResultsInlineCapped(tomorrow)).toBe(false);
    expect(recordResultsInlineImpression(tomorrow)).toBe(1);
  });

  it('uses the LOCAL calendar day, not UTC', () => {
    // 2026-10-26 00:30 local — the stamp must follow the local date fields.
    const d = new Date(2026, 9, 26, 0, 30);
    expect(localDayStamp(d)).toBe('2026-10-26');
    expect(resultsInlineCapKey(d)).toBe('lexiclash_ri_cap_2026-10-26');
  });

  it('falls back to memory (still day-scoped) when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    try {
      expect(recordResultsInlineImpression()).toBe(1);
      expect(recordResultsInlineImpression()).toBe(2);
      expect(getResultsInlineImpressionCount()).toBe(2);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expect(getResultsInlineImpressionCount(tomorrow)).toBe(0);
    } finally {
      spy.mockRestore();
      setSpy.mockRestore();
    }
  });
});
