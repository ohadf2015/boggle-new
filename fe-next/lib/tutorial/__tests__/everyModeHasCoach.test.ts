import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { GAME_MODE_RULES } from '@/backend/modes/rules';
import { MODE_COACH, ALL_COACH_MODES } from '@/lib/tutorial/modeCoachContent';
import { mpCoachMode } from '@/lib/tutorial/mpCoachMode';

const lookup = (bundle: unknown, key: string) =>
  key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], bundle);

describe('every mode teaches new players', () => {
  it.each(Object.keys(GAME_MODE_RULES))('multiplayer %s has a coach', (mode) => {
    const key = mpCoachMode(mode);
    expect(key, mode).toBeDefined();
    expect(MODE_COACH[key!]).toBeDefined();
  });

  it.each(ALL_COACH_MODES)('%s coach copy exists in all 6 locales', (mode) => {
    const c = MODE_COACH[mode];
    const keys = [c.titleKey, ...c.steps.map((s) => s.captionKey), c.scoreTipKey].filter(Boolean) as string[];
    for (const [lang, bundle] of Object.entries({ en, he, sv, ja, es, ru })) {
      for (const key of keys) expect(typeof lookup(bundle, key), `${lang}:${key}`).toBe('string');
    }
  });
});
