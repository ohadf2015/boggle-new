/**
 * Gate: the achievement unlock modal that fires over a practice completion
 * card must never show a raw translation key.
 *
 * PracticeSessionProvider mounts UnifiedAchievementModal, which resolves an
 * education unlock through `education.achievements.<key>.name` and
 * `.description`. None of the eighteen education achievements had those keys,
 * so finishing a practice round and unlocking "Mode Explorer" put the literal
 * strings `education.achievements.mode_explorer.name` and
 * `education.achievements.mode_explorer.description` on screen, on top of the
 * completion card — the same class of defect that disqualified the previous
 * round, and in six locales at once.
 *
 * The definitions live in backend/modules/educationAchievementManager.ts, so
 * adding an achievement there without copy would silently reintroduce it. This
 * test walks the definitions rather than a hand-written list.
 */

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS } from '@/backend/modules/educationAchievementManager';

import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

type Dict = Record<string, unknown>;

const LOCALES: Array<[string, Dict]> = [
  ['en', en as unknown as Dict],
  ['he', he as unknown as Dict],
  ['sv', sv as unknown as Dict],
  ['ja', ja as unknown as Dict],
  ['es', es as unknown as Dict],
  ['ru', ru as unknown as Dict],
];

function lookup(dict: Dict, dottedKey: string): unknown {
  return dottedKey.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Dict)[part];
    return undefined;
  }, dict);
}

describe('education achievement copy', () => {
  it('has a name and a description for every achievement in every locale', () => {
    const missing: string[] = [];
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      for (const [locale, dict] of LOCALES) {
        for (const field of ['name', 'description'] as const) {
          const path = `education.achievements.${def.key}.${field}`;
          const value = lookup(dict, path);
          if (typeof value !== 'string' || value.trim() === '') {
            missing.push(`${locale}: ${path}`);
          }
        }
      }
    }
    expect(missing.join('\n')).toBe('');
  });

  it('does not fall back to English for the other five locales', () => {
    const copied: string[] = [];
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const english = lookup(en as unknown as Dict, `education.achievements.${def.key}.name`);
      for (const [locale, dict] of LOCALES) {
        if (locale === 'en') continue;
        // Swedish and Spanish legitimately share a few short cognates with
        // English, so only flag a locale that copies EVERY name verbatim.
        const value = lookup(dict, `education.achievements.${def.key}.name`);
        if (value === english) copied.push(`${locale}:${def.key}`);
      }
    }
    const perLocale = new Map<string, number>();
    for (const entry of copied) {
      const locale = entry.split(':')[0];
      perLocale.set(locale, (perLocale.get(locale) ?? 0) + 1);
    }
    for (const [locale, count] of perLocale) {
      expect(count, `${locale} reuses ${count} English names`).toBeLessThan(
        ACHIEVEMENT_DEFINITIONS.length
      );
    }
  });
});
