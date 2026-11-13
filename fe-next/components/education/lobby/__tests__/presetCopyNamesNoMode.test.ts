import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { catalogueModes } from '../../ClassroomModeCatalogueData';

const locales = { en, he, es, sv, ja, ru } as Record<string, unknown>;
const PRESET_KEYS = ['standard', 'fridayBattle', 'sped'];

function get(obj: unknown, path: string): string | undefined {
  const v = path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
  return typeof v === 'string' ? v : undefined;
}

describe('lobby preset copy', () => {
  it.each(Object.keys(locales))('Given %s, When a teacher reads a preset card, Then it never names a game mode the preset does not pick', (lang) => {
    const dict = locales[lang];
    const modeNames = catalogueModes()
      .map((m) => get(dict, m.nameKey))
      .filter((n): n is string => !!n)
      .map((n) => n.toLocaleLowerCase(lang));
    for (const key of PRESET_KEYS) {
      for (const field of ['name', 'desc']) {
        const copy = get(dict, `teacher.classroom.presets.${key}.${field}`)?.toLocaleLowerCase(lang) ?? '';
        expect(copy, `${lang} ${key}.${field}`).not.toBe('');
        for (const mode of modeNames) expect(copy, `${lang} ${key}.${field} names "${mode}"`).not.toContain(mode);
      }
    }
  });
});
