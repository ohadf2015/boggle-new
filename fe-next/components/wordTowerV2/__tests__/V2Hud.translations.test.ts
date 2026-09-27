import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { sv } from '@/translations/sv';

const locales = { en, es, he, ja, ru, sv } as const;

/**
 * Helper to resolve a dotted key path through a nested object.
 * e.g., 'wordTowerV2.hud.menu' resolves i18n.wordTowerV2.hud.menu
 */
function resolvePath(obj: Record<string, any>, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

describe('V2Hud translation keys', () => {
  const requiredKeys = [
    'wordTowerV2.hud.menu',
    'wordTowerV2.hud.banked',
    'wordTowerV2.hud.effect',
    'wordTowerV2.hud.floorA11y',
    'wordTowerV2.hud.exit',
    'wordTowerV2.hud.daily',
    'wordTowerV2.hud.dailyBadge',
    'wordTowerV2.unitM',
    'wordTowerV2.streak.label',
    'wordTowerV2.reward.steady.name',
    'wordTowerV2.reward.plumb.name',
    'wordTowerV2.reward.wide.name',
    'wordTowerV2.results.close',
    'wordTowerV2.wreck.balls',
    'wordTowerV2.tenants',
    'wordTowerV2.estate.open',
  ];

  requiredKeys.forEach((key) => {
    it(`should have '${key}' in all locales`, () => {
      Object.entries(locales).forEach(([locale, translations]) => {
        const value = resolvePath(translations, key);
        expect(
          value,
          `${locale}: '${key}' should exist and be non-empty`,
        ).toBeDefined();
        expect(
          typeof value === 'string' && value.length > 0,
          `${locale}: '${key}' should be a non-empty string, got ${JSON.stringify(value)}`,
        ).toBe(true);
        expect(
          value !== key,
          `${locale}: '${key}' appears to be the key itself (not translated)`,
        ).toBe(true);
      });
    });

    if (!['wordTowerV2.unitM'].includes(key)) {
      // These keys might legitimately be short or identical across all languages
      it(`should have different values for '${key}' between en and other locales`, () => {
        const enValue = resolvePath(locales.en, key);
        Object.entries(locales).forEach(([locale, translations]) => {
          if (locale === 'en') return; // skip self-comparison
          const value = resolvePath(translations, key);
          expect(
            value !== enValue,
            `${locale}: '${key}' should differ from English: "${enValue}"`,
          ).toBe(true);
        });
      });
    }
  });
});
