/**
 * The catalogue reaches the browser as a hashed `public/i18n/<lang>.<hash>.js`
 * asset that assigns `globalThis.__LEXI_MESSAGES__`, instead of being serialised
 * into every page's RSC flight payload (measured 2026-08-07: 525kB raw / ~165kB
 * gz inline in the HTML of every page, uncacheable).
 *
 * The script runs in <head> before hydration, so `getCachedTranslation` must
 * find it synchronously — if it doesn't, `t()` returns raw key paths and React
 * repaints the server-rendered text.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const GLOBAL = '__LEXI_MESSAGES__';

describe('getCachedTranslation — global seed', () => {
  let mod: typeof import('@/translations/loadTranslation');

  beforeEach(async () => {
    delete (globalThis as Record<string, unknown>)[GLOBAL];
    // Fresh module per test: the loader memoises into a module-level cache.
    vi.resetModules();
    mod = await import('@/translations/loadTranslation');
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[GLOBAL];
  });

  it('reads the catalogue the <head> script assigned', () => {
    (globalThis as Record<string, unknown>)[GLOBAL] = {
      en: { nav: { howToPlay: 'How to Play' } },
    };

    expect(mod.getCachedTranslation('en')).toEqual({ nav: { howToPlay: 'How to Play' } });
  });

  it('prefers an explicitly seeded catalogue over the global', () => {
    (globalThis as Record<string, unknown>)[GLOBAL] = { en: { nav: { howToPlay: 'from global' } } };
    mod.seedTranslationCache('en', { nav: { howToPlay: 'seeded' } });

    expect(mod.getCachedTranslation('en')).toEqual({ nav: { howToPlay: 'seeded' } });
  });

  it('ignores a global that has no entry for the requested language', () => {
    (globalThis as Record<string, unknown>)[GLOBAL] = { he: { nav: { howToPlay: 'איך משחקים' } } };

    // No `sv` key on the global and no cache entry — the caller must fall back
    // to the async import rather than receiving another language's strings.
    expect(mod.getCachedTranslation('sv')).not.toEqual({ nav: { howToPlay: 'איך משחקים' } });
  });

  it('warns once when i18n assets are missing in development (browser)', () => {
    // Simulate a browser environment in development where the global is not set
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      // stubEnv, not direct assignment: NODE_ENV is typed readonly, and a raw
      // assignment fails `next build`'s typecheck even though vitest tolerates it.
      vi.stubEnv('NODE_ENV', 'development');
      // Make sure we're treating this as a browser (typeof window !== 'undefined' is true in jsdom)

      // First call should warn
      mod.getCachedTranslation('en');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Translation assets missing')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('npm run build:i18n')
      );

      const callCountAfterFirst = warnSpy.mock.calls.length;

      // Second call should NOT warn again (once-per-page guard)
      mod.getCachedTranslation('he');
      expect(warnSpy.mock.calls.length).toBe(callCountAfterFirst);
    } finally {
      vi.unstubAllEnvs();
      warnSpy.mockRestore();
    }
  });

  it('does not warn when i18n assets are missing in production', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      vi.stubEnv('NODE_ENV', 'production');

      mod.getCachedTranslation('en');
      // Should not warn in production
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Translation assets missing')
      );
    } finally {
      vi.unstubAllEnvs();
      warnSpy.mockRestore();
    }
  });

  it('does not warn when global is present', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      vi.stubEnv('NODE_ENV', 'development');
      (globalThis as Record<string, unknown>)[GLOBAL] = {
        en: { nav: { howToPlay: 'How to Play' } },
      };

      mod.getCachedTranslation('en');
      // Should not warn when the global is present
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Translation assets missing')
      );
    } finally {
      vi.unstubAllEnvs();
      warnSpy.mockRestore();
    }
  });
});
