import { describe, it, expect } from 'vitest';
import { LOBBY_EMOTES } from '@/lib/lobby/lobbyEmotes';
import { loadTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';

/**
 * Regression guard for the duplicate top-level `lobby` key bug.
 *
 * Each translation file accidentally declared `lobby` twice at the top level:
 *   "lobby": { "emote": { ... } }   // the namespace we need
 *   "lobby": "Lobby"                // a legacy, UNUSED label string
 * In a JS object literal the LAST key wins, so at runtime `lobby` collapsed to
 * the string and every `lobby.emote.*` label resolved to `undefined` — firing
 * Sentry "Translation missing for key: lobby.emote.* " for whichever language a
 * user actually opened the lobby emote tray in (es + he in prod). The bug was
 * universal across all 5 languages; en simply hadn't been triggered.
 *
 * This walks the labelKeys through the REAL loader (loadTranslation +
 * normalizeMessages) so it mirrors the runtime resolution path exactly.
 */

const LANGS: readonly Language[] = ['en', 'he', 'sv', 'ja', 'es'];

function resolvePath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

describe('lobby emote labels — i18n resolution (duplicate-key regression)', () => {
  it.each(LANGS)(
    'resolves every LOBBY_EMOTES labelKey to a real string in %s',
    async (lang) => {
      const data = await loadTranslation(lang);
      for (const e of LOBBY_EMOTES) {
        const value = resolvePath(data, e.labelKey);
        expect(
          typeof value,
          `${lang}: "${e.labelKey}" must resolve to a translation string, not ${JSON.stringify(value)}`,
        ).toBe('string');
        // A missing key falls back to the raw path — guard against that too.
        expect(value).not.toBe(e.labelKey);
        expect((value as string).length).toBeGreaterThan(0);
      }
    },
  );

  it.each(LANGS)('resolves the lobby.emote.title heading in %s', async (lang) => {
    const data = await loadTranslation(lang);
    const value = resolvePath(data, 'lobby.emote.title');
    expect(typeof value).toBe('string');
    expect((value as string).length).toBeGreaterThan(0);
  });
});
