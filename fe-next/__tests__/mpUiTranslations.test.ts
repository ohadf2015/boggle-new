/**
 * The multiplayer UI rebuild's own translation block. Resolved through the
 * real imported bundles, never grep (sv.js once carried a duplicate top-level
 * key, and a grep audit invented bugs from it).
 *
 * FOUNDATION seeds `mpUi.{shell,entry,lobby,round,results}` in every locale;
 * each piece adds keys ONLY inside its own sub-block.
 */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const get = (o: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], o);

const SUB_BLOCKS = ['shell', 'entry', 'lobby', 'round', 'results'];
const SHELL_KEYS = [
  'back', 'home', 'leave', 'close', 'copyCode', 'copied', 'timeLeft', 'rankOf',
  'host', 'bot', 'ready', 'emptySeat', 'playersCount', 'backToArenas',
];
const PARAMS: Record<string, string[]> = {
  timeLeft: ['{seconds}'],
  rankOf: ['{rank}', '{total}'],
  playersCount: ['{count}', '{max}'],
};

describe.each(Object.entries({ en, he, sv, ja, es, ru }))('%s mpUi', (locale, bundle) => {
  it.each(SUB_BLOCKS)('mpUi.%s is seeded as an object', (block) => {
    const v = get(bundle, `mpUi.${block}`);
    expect(v && typeof v === 'object' && !Array.isArray(v)).toBe(true);
  });

  it.each(SHELL_KEYS)('mpUi.shell.%s is a non-empty string', (key) => {
    const v = get(bundle, `mpUi.shell.${key}`);
    expect(typeof v, `${locale} mpUi.shell.${key}`).toBe('string');
    expect((v as string).length).toBeGreaterThan(0);
  });

  it('keeps every interpolation placeholder', () => {
    for (const [key, params] of Object.entries(PARAMS)) {
      for (const p of params) expect(get(bundle, `mpUi.shell.${key}`), `${locale} ${key}`).toContain(p);
    }
  });

  it('is not a copy of English outside en (a real translation)', () => {
    if (locale === 'en') return;
    expect(get(bundle, 'mpUi.shell.leave')).not.toBe(get(en, 'mpUi.shell.leave'));
  });
});
