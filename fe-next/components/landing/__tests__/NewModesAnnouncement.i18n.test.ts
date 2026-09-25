import { describe, it, expect } from 'vitest';
import { pickLandingMessages } from '@/lib/i18n/pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '@/lib/i18n/landingNamespaces';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

/**
 * Verify that NewModesAnnouncement keys are in the landing i18n subset for all locales.
 * Without these keys in LANDING_NAMESPACES/LANDING_EXTRA_KEYS, the production landing
 * bundle renders raw key strings ('newModes.title', etc.) instead of translations.
 * See recurring pitfall: "08-30->09-06 cluster" in MEMORY.md.
 */
describe('NewModesAnnouncement i18n coverage', () => {
  const locales = [
    { name: 'en', catalogue: en as Record<string, unknown> },
    { name: 'he', catalogue: he as Record<string, unknown> },
    { name: 'sv', catalogue: sv as Record<string, unknown> },
    { name: 'ja', catalogue: ja as Record<string, unknown> },
    { name: 'es', catalogue: es as Record<string, unknown> },
    { name: 'ru', catalogue: ru as Record<string, unknown> },
  ];

  const resolve = (root: Record<string, unknown>, path: string): unknown =>
    path.split('.').reduce<unknown>(
      (o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined),
      root,
    );

  const requiredKeys = [
    'newModes.title',
    'newModes.description',
    'newModes.playAdventure',
    'newModes.playWordTower',
    'common.close', // aria-label on close button
  ];

  describe.each(locales)('$name', ({ catalogue }) => {
    it.each(requiredKeys)('resolves %s to a string in landing subset', (key) => {
      const subset = pickLandingMessages(catalogue, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);
      const value = resolve(subset, key);
      expect(typeof value).toBe('string');
    });
  });
});
