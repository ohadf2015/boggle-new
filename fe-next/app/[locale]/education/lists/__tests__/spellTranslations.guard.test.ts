import { describe, expect, it } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { es } from '@/translations/es.js';
import { ja } from '@/translations/ja.js';
import { ru } from '@/translations/ru.js';
import { sv } from '@/translations/sv.js';
import { SPELL_LABEL_KEYS } from '../_components/spellLabels';

type Dict = Record<string, unknown>;
const spell = (d: Dict) => ((d.eg2Seo as Dict)?.practice as Dict)?.spell as Record<string, string> | undefined;

describe('spelling practice copy', () => {
  it('Given every locale, When the spelling practice renders, Then each label exists natively, not as the English fallback', () => {
    const base = spell(en as Dict)!;
    for (const key of SPELL_LABEL_KEYS) expect(base?.[key], `en.${key}`).toBeTruthy();
    for (const [code, dict] of Object.entries({ he, es, ja, ru, sv })) {
      const s = spell(dict as Dict);
      for (const key of SPELL_LABEL_KEYS) {
        expect(s?.[key], `${code}.${key}`).toBeTruthy();
        expect(s?.[key], `${code}.${key} is English`).not.toBe(base[key]);
      }
    }
  });

  it('keeps every {placeholder} the English copy uses', () => {
    const base = spell(en as Dict)!;
    for (const [code, dict] of Object.entries({ he, es, ja, ru, sv })) {
      const s = spell(dict as Dict)!;
      for (const key of SPELL_LABEL_KEYS) {
        const vars = (t: string) => (t.match(/\{\w+\}/g) ?? []).sort();
        expect(vars(s[key]), `${code}.${key}`).toEqual(vars(base[key]));
      }
    }
  });
});
