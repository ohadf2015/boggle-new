/**
 * Sentry JAVASCRIPT-NEXTJS-2A8: /ru/word-tower asked /api/dictionary-words?lang=ru,
 * which only serves the Word Craft locales, so the route 400'd twice and the game
 * showed its dictionary-error screen. Word Craft has no ru bag — getTileBag and
 * wordCraftLocaleFor already fall back to en — so the dictionary must too.
 */
import { describe, it, expect, vi } from 'vitest';
import { loadWordCraftDictionary } from '../dictionary';
import { toWordCraftLocale } from '../tileBag';
import { spinWheel } from '@/lib/wordTowerV2/wheel';

describe('unsupported locale (ru) falls back to en', () => {
  it('fetches the en list instead of a lang the route rejects', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => 'cat\ndog' });
    const dict = await loadWordCraftDictionary('ru' as never, { fetchFn: fetchFn as never, storage: null as never });
    expect(String(fetchFn.mock.calls[0][0])).toBe('/api/dictionary-words?lang=en');
    expect(dict.size).toBeGreaterThan(0);
  });

  it('keeps supported locales as-is', () => {
    for (const l of ['en', 'sv', 'he', 'es', 'ja']) expect(toWordCraftLocale(l)).toBe(l);
    expect(toWordCraftLocale('ru')).toBe('en');
  });

  it('deals the Word Tower v2 wheel from the same en letters the dictionary uses', () => {
    expect(spinWheel('ru', 0, 's1')).toEqual(spinWheel('en', 0, 's1'));
  });
});
