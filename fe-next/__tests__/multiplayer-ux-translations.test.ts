/** @jest-environment jsdom */
// Tests that all required UX translation keys exist in all 4 languages.
import { en } from '../translations/en';
import { he } from '../translations/he';
import { sv } from '../translations/sv';
import { ja } from '../translations/ja';
import { es } from '../translations/es';
import { ru } from '../translations/ru';

describe('Multiplayer UX translation keys', () => {

  const langs: Record<string, any> = { en, he, sv, ja, es, ru };

  it.each(Object.entries(langs))('%s: has hostView.roomChat key', (_name, t) => {
    expect(t.hostView?.roomChat).toBeDefined();
    expect(typeof t.hostView.roomChat).toBe('string');
    expect(t.hostView.roomChat.length).toBeGreaterThan(0);
  });

  // Regression: OpponentWordFeed keys were missing in EVERY locale, so t()
  // returned the raw key path ("multiplayer.opponentFoundWord") which rendered
  // as a long untranslated Latin string in the floating in-game feed — the
  // stack of items grew tall enough to cover the bottom rows of the letter
  // grid on phones (user report 2026-07-28: "השמות מסתירים את האותיות").
  // The keys are selected via a runtime variable (translationKey), so the
  // static check:translations scanner cannot see them.
  it.each(Object.entries(langs))('%s: has multiplayer.opponentFoundWord / opponentFoundLongWord', (_name, t) => {
    for (const key of ['opponentFoundWord', 'opponentFoundLongWord']) {
      expect(typeof t.multiplayer?.[key]).toBe('string');
      expect(t.multiplayer[key].length).toBeGreaterThan(0);
      // Must interpolate the player name — the feed passes { name, length }.
      expect(t.multiplayer[key]).toContain('{{name}}');
    }
    expect(t.multiplayer.opponentFoundLongWord).toContain('{{length}}');
  });
});
