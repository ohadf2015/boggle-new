import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
// @ts-expect-error — translations are untyped .js bundles
import { en } from '@/translations/en.js';
// @ts-expect-error — translations are untyped .js bundles
import { he } from '@/translations/he.js';
// @ts-expect-error — translations are untyped .js bundles
import { sv } from '@/translations/sv.js';
// @ts-expect-error — translations are untyped .js bundles
import { ja } from '@/translations/ja.js';
// @ts-expect-error — translations are untyped .js bundles
import { es } from '@/translations/es.js';
// @ts-expect-error — translations are untyped .js bundles
import { ru } from '@/translations/ru.js';
import { SCHOOL_LEAD_ROLES } from '@/lib/education/schoolLead';
import { UPGRADE_FAQ_KEYS } from '@/lib/education/pro/upgradeFaq';

const LOCALES: Record<string, unknown> = { en, he, sv, ja, es, ru };
const ROOT = process.cwd();

function resolve(dict: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    dict,
  );
}

const SOURCES = [
  ...readdirSync(join(ROOT, 'components/teacher/pro')).filter((f) => f.endsWith('.tsx')).map((f) => `components/teacher/pro/${f}`),
  'app/[locale]/teacher/upgrade/PageClient.tsx',
  'components/teacher/ProGate.tsx',
  'components/education/TeacherProCheckoutCta.tsx',
];

const literalKeys = new Set<string>();
for (const file of SOURCES) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  for (const m of src.matchAll(/['"`](eg2Pro\.[A-Za-z0-9_.]+)['"`]/g)) literalKeys.add(m[1]);
}
const dynamicKeys = [
  ...SCHOOL_LEAD_ROLES.map((r) => `eg2Pro.school.roles.${r}`),
  ...UPGRADE_FAQ_KEYS.flatMap((k) => [`eg2Pro.faq.${k}Q`, `eg2Pro.faq.${k}A`]),
  ...['schoolF1', 'schoolF2', 'schoolF3'].map((k) => `eg2Pro.plans.${k}`),
  ...['step1', 'step2', 'step3'].flatMap((k) => [`eg2Pro.school.${k}Title`, `eg2Pro.school.${k}Body`]),
];
const KEYS = [...literalKeys, ...dynamicKeys];

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('eg2Pro copy exists in every locale', () => {
  it('found the keys it checks', () => {
    expect(literalKeys.size).toBeGreaterThan(60);
  });

  it.each(KEYS)('%s resolves to a non-empty string in all six locales', (key) => {
    for (const [locale, dict] of Object.entries(LOCALES)) {
      const value = resolve(dict, key);
      expect(value, `${locale} is missing ${key}`).toBeTypeOf('string');
      expect((value as string).trim(), `${locale} ${key} is empty`).not.toBe('');
    }
  });

  it('keeps placeholders identical to English', () => {
    for (const key of KEYS) {
      const base = placeholders(resolve(en, key) as string);
      for (const [locale, dict] of Object.entries(LOCALES)) {
        expect(placeholders(resolve(dict, key) as string), `${locale} ${key}`).toEqual(base);
      }
    }
  });

  it('translates rather than copying English into he and ja', () => {
    const copied = KEYS.filter((k) => !/className$/.test(k)).filter(
      (k) => resolve(he, k) === resolve(en, k) || resolve(ja, k) === resolve(en, k),
    );
    expect(copied).toEqual([]);
  });

  it('names no competitor and no payment processor', () => {
    for (const [locale, dict] of Object.entries(LOCALES)) {
      for (const key of KEYS) {
        expect(resolve(dict, key) as string, `${locale} ${key}`).not.toMatch(/kahoot|blooket|gimkit|quizlet|polar/i);
      }
    }
  });
});
