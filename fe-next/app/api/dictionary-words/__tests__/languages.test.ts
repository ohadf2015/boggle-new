/**
 * Coverage guard: every language in SUPPORTED_GAME_LANGUAGES must serve a
 * non-empty client dictionary from /api/dictionary-words.
 *
 * Regression: `ru` was marketed and playable (SUPPORTED_GAME_LANGUAGES) but the
 * route's hardcoded allow-list was ['en','es','he','sv','ja'], so every Russian
 * game's dictionary cache fetch got a 400 "Invalid language" and the client
 * fell back to per-word server validation (t_2a7bb6a8, 2026-10-26). The
 * allow-list is now DERIVED from SUPPORTED_GAME_LANGUAGES, so adding a locale
 * without a loader fails this test instead of 400ing players in prod.
 */
import { describe, it, expect, vi } from 'vitest';
import { SUPPORTED_GAME_LANGUAGES } from '@/lib/languageConfig';

vi.mock('@/lib/server/sharedWordSets', () => ({
  getEnglishWordSet: async () => new Set(['alpha']),
  getSpanishBaseWordSet: async () => new Set(['uno']),
  getHebrewWordSet: () => new Set(['אחת']),
  getSwedishWordSet: () => new Set(['ett']),
}));

// ja/ru read their word lists from backend/*.txt. Stub just those reads with
// known content (including an ё so the Russian ё→е fold is observable).
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    readFile: (p: unknown, ...args: unknown[]) => {
      const s = String(p);
      if (s.endsWith('japanese_words.txt')) return Promise.resolve('あいう\n');
      if (s.endsWith('japanese_words_approved.txt')) return Promise.resolve('');
      if (s.endsWith('russian_words.txt')) return Promise.resolve('ёлка\nабажур\n');
      if (s.endsWith('russian_words_approved.txt')) return Promise.resolve('');
      return (actual.readFile as (...a: unknown[]) => Promise<string>)(p, ...args);
    },
  };
});

const call = (lang: string) =>
  import('../route').then(({ GET }) =>
    GET({
      url: `http://localhost/api/dictionary-words?lang=${lang}`,
      headers: { get: () => null },
    } as never),
  );

describe('GET /api/dictionary-words — SUPPORTED_GAME_LANGUAGES coverage', () => {
  it.each(SUPPORTED_GAME_LANGUAGES)('serves 200 with >0 words for %s', async (lang) => {
    const res = await call(lang);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body.split('\n').filter((w) => w.length > 0).length).toBeGreaterThan(0);
  });

  it('normalizes Russian exactly like server validation (lowercase, ё→е)', async () => {
    const res = await call('ru');
    const body = await res.text();
    // The client cache must match normalizeRussianWord, or the client would
    // reject words the server accepts (and vice versa).
    expect(body.split('\n')).toContain('елка');
    expect(body.split('\n')).not.toContain('ёлка');
  });

  it('still rejects a language outside SUPPORTED_GAME_LANGUAGES with 400', async () => {
    const res = await call('fr');
    expect(res.status).toBe(400);
  });
});
