import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, TEACHER_ITEMS } from '../CommandPalette';

const CHROME_KEYS = [
  'common.search',
  'common.searchPlaceholder',
  'common.noResults',
  'common.navigation',
  'common.account',
  'teacher.nav.sidebarLabel',
  'common.toClose',
];

function resolve(bundle: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle);
}

describe('CommandPalette never renders a raw key', () => {
  const keys = [...NAV_ITEMS, ...TEACHER_ITEMS].map((i) => i.labelKey).concat(CHROME_KEYS);

  it.each(['en', 'he', 'sv', 'ja', 'es'])('every label resolves to a string in %s', async (lang) => {
    const mod = await import(`../../translations/${lang}.js`);
    const bundle = mod[lang] as Record<string, unknown>;
    const missing = keys.filter((k) => typeof resolve(bundle, k) !== 'string');
    expect(missing).toEqual([]);
  });
});
