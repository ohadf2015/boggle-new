/**
 * The dead-room "Play now" offer (components/multiplayer/useRoomEndedOffer)
 * renders two keys. `t()` would show the raw key in a locale that lacks them,
 * so every shipped bundle must carry both. Resolved through the real bundles.
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

const KEYS = ['multiplayerFlow.roomEnded.line', 'multiplayerFlow.roomEnded.playNow'];

describe.each(Object.entries({ en, he, sv, ja, es, ru }))('%s room-ended offer', (locale, bundle) => {
  it.each(KEYS)('%s is a non-empty string', (key) => {
    const v = get(bundle, key);
    expect(typeof v, `${locale} ${key}`).toBe('string');
    expect((v as string).trim().length).toBeGreaterThan(0);
  });

  it('is translated (not the English copy) outside en', () => {
    if (locale === 'en') return;
    expect(get(bundle, KEYS[0])).not.toBe(get(en, KEYS[0]));
  });
});
