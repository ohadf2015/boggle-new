import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

/**
 * Stale-copy guard: teacher/education strings must not point at UI that no
 * longer exists.
 *
 * Origin (2026-09-14, t_dc4e8fe6 slice 1): after the teacher dashboard's
 * one-screen redesign removed the `play | prepare | review` tab bar, the
 * LastGameInsights empty state kept telling teachers — in all six locales —
 * to "Start one from the Play tab". There is no Play tab. This is the same
 * defect class as the /education/classroom-game "Play tab" empty state fixed
 * after the 2026-09-10 dogfood (t_fdb9dfb5): copy outliving a redesign.
 *
 * The guard walks the `teacher` translation subtree of every locale and
 * rejects phrases that name the removed tab. Patterns are per-locale because
 * the stale copy was translated, not shared.
 */

type LocaleModule = Record<string, unknown>;

const LOCALES: Record<string, LocaleModule> = { en, he, sv, ja, es, ru };

/** Phrases that referenced the teacher dashboard's removed "Play" tab. */
const STALE_PATTERNS: Record<string, RegExp> = {
  en: /from the play tab/i,
  he: /מלשונית המשחק/,
  sv: /från fliken spela/i,
  ja: /「プレイ」タブから/,
  es: /desde la pestaña jugar/i,
  ru: /на вкладке «играть»/i,
};

function collectStrings(node: unknown, path: string, out: Array<{ path: string; value: string }>): void {
  if (typeof node === 'string') {
    out.push({ path, value: node });
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      collectStrings(child, path ? `${path}.${key}` : key, out);
    }
  }
}

describe('stale teacher copy guard (removed Play tab)', () => {
  for (const [locale, mod] of Object.entries(LOCALES)) {
    it(`${locale}: no teacher.* string references the removed Play tab`, () => {
      const teacher = (mod as { teacher?: unknown }).teacher;
      expect(teacher, `${locale} is missing the teacher translation subtree`).toBeTruthy();
      const strings: Array<{ path: string; value: string }> = [];
      collectStrings(teacher, 'teacher', strings);
      const offenders = strings.filter((s) => STALE_PATTERNS[locale].test(s.value));
      expect(
        offenders.map((o) => `${o.path} = ${JSON.stringify(o.value)}`),
        `${locale}: ${offenders.length} teacher.* string(s) still point at the removed Play tab`
      ).toEqual([]);
    });
  }
});
