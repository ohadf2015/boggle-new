/** @jest-environment jsdom */
// Tests that all required UX translation keys exist in all 4 languages.
import { en } from '../translations/en';
import { he } from '../translations/he';
import { sv } from '../translations/sv';
import { ja } from '../translations/ja';

describe('Multiplayer UX translation keys', () => {
   
  const langs: Record<string, any> = { en, he, sv, ja };

  it.each(Object.entries(langs))('%s: has hostView.roomChat key', (_name, t) => {
    expect(t.hostView?.roomChat).toBeDefined();
    expect(typeof t.hostView.roomChat).toBe('string');
    expect(t.hostView.roomChat.length).toBeGreaterThan(0);
  });
});
