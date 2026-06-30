import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  cleanMeaning,
  parseHebrewExtract,
  fetchWiktionaryMeaning,
} from './wiktionaryMeaning';

// Real shapes captured live from he.wiktionary's action API (2026-06-30).
const HE_WINDOW = '\n== חַלּוֹן ==\n\nפתח מתוכנן כלשהו בקירות של מבנה ובחומות שמאפשר לאור ולאוויר לחדור דרכו.';
const HE_SEE_ALSO = 'ראו גם חתול.\n\n== חָתוּל ==\n\nיונק טורף מבוית מהמשפחה החתוליים.';

afterEach(() => vi.unstubAllGlobals());

describe('cleanMeaning', () => {
  it('collapses whitespace and trims', () => {
    expect(cleanMeaning('  a   small\ncat ')).toBe('a small cat');
  });
  it('strips a leading usage label', () => {
    expect(cleanMeaning('(Mexico) servant')).toBe('servant');
  });
  it('returns null for empty/whitespace', () => {
    expect(cleanMeaning('')).toBeNull();
    expect(cleanMeaning('   ')).toBeNull();
    expect(cleanMeaning(null)).toBeNull();
  });
  it('truncates long text on a word boundary with an ellipsis', () => {
    const long = 'word '.repeat(60).trim(); // 299 chars
    const out = cleanMeaning(long)!;
    expect(out.length).toBeLessThanOrEqual(141);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  ');
  });
});

describe('parseHebrewExtract', () => {
  it('returns the definition line after the headword header', () => {
    expect(parseHebrewExtract(HE_WINDOW)).toBe('פתח מתוכנן כלשהו בקירות של מבנה ובחומות שמאפשר לאור ולאוויר לחדור דרכו.');
  });
  it('skips a leading "see also" line before the header', () => {
    expect(parseHebrewExtract(HE_SEE_ALSO)).toBe('יונק טורף מבוית מהמשפחה החתוליים.');
  });
  it('returns null for an empty extract (page miss)', () => {
    expect(parseHebrewExtract('')).toBeNull();
    expect(parseHebrewExtract(null)).toBeNull();
  });
  it('returns null when there is no header at all', () => {
    expect(parseHebrewExtract('just some prose with no header')).toBeNull();
  });
});

describe('fetchWiktionaryMeaning', () => {
  it('returns null for non-Hebrew languages without a network call (phase 1)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    for (const lang of ['en', 'es', 'ja', 'ru', 'sv', 'fr']) {
      expect(await fetchWiktionaryMeaning('gato', lang)).toBeNull();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null for an empty word without a network call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await fetchWiktionaryMeaning('  ', 'he')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('he: hits he.wiktionary extracts and parses the native definition', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: { pages: { '123': { extract: HE_WINDOW } } } }),
    }));
    const out = await fetchWiktionaryMeaning('חלון', 'he');
    expect(out).toBe('פתח מתוכנן כלשהו בקירות של מבנה ובחומות שמאפשר לאור ולאוויר לחדור דרכו.');
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('he.wiktionary.org');
  });

  it('fails soft to null on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));
    expect(await fetchWiktionaryMeaning('חלון', 'he')).toBeNull();
  });

  it('returns null on a non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));
    expect(await fetchWiktionaryMeaning('zzzz', 'he')).toBeNull();
  });
});
