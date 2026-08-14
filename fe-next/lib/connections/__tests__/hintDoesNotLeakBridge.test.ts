import { describe, it, expect } from 'vitest';
import { getPuzzlesForLocale } from '../puzzles';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/**
 * A hint must never hand the player the answer.
 *
 * This regressed invisibly for a long time in Japanese: 147 of 194 active ja
 * puzzles printed their own bridge inside the hint (火+[山]+頂 hinted "噴火する山").
 * The audit query that should have caught it carried a `length(bridge) >= 3`
 * guard — added for a good reason, to stop Hebrew's two-letter ים matching
 * inside unrelated words like גלים — and Japanese bridges are exactly ONE
 * character, so the guard excluded the entire language from the check.
 *
 * The fix is to match the way each language actually works rather than applying
 * one rule everywhere:
 *   - Japanese is written without spaces, so any occurrence of the bridge is
 *     visible to the player: plain substring.
 *   - Space-separated languages leak only when the bridge stands as its own
 *     word; a bridge buried inside a longer word (ים in גלים) is not readable
 *     as the answer and must not be flagged, or the check gets muted again.
 */
const NO_WORD_BOUNDARIES = new Set(['ja']);

const asStandaloneWord = (bridge: string) =>
  // \b is ASCII-only in JS, so bound on whitespace/punctuation/string edges instead —
  // otherwise every Hebrew and Cyrillic bridge would silently never match.
  new RegExp(`(^|[\\s,.:;!?"'()\\[\\]־–—-])${bridge}($|[\\s,.:;!?"'()\\[\\]־–—-])`, 'u');

describe('puzzle hints never contain their own bridge', () => {
  for (const locale of LOCALES) {
    it(`${locale}: no hint gives the answer away`, () => {
      const leaks = getPuzzlesForLocale(locale)
        .filter((p) => p.hint && p.bridge)
        .filter((p) =>
          NO_WORD_BOUNDARIES.has(locale)
            ? p.hint!.includes(p.bridge)
            : asStandaloneWord(p.bridge).test(p.hint!),
        )
        .map((p) => `${p.id}: ${p.word1}+[${p.bridge}]+${p.word2} — "${p.hint}"`);

      expect(leaks, `${leaks.length} hint(s) leak their bridge in ${locale}`).toEqual([]);
    });
  }

  it('the Japanese rule is substring-based, or it would miss single-character bridges', () => {
    // Guards the guard: ja bridges are 1 char, so any length threshold disables the check.
    const ja = getPuzzlesForLocale('ja');
    expect(ja.length).toBeGreaterThan(0);
    expect(Math.min(...ja.map((p) => [...p.bridge].length))).toBe(1);
    expect(NO_WORD_BOUNDARIES.has('ja')).toBe(true);
  });
});
