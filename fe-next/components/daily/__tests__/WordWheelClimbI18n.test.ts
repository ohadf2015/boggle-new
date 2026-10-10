import { describe, it, expect } from 'vitest';
import * as en from '@/translations/en';
import * as es from '@/translations/es';
import * as he from '@/translations/he';
import * as ja from '@/translations/ja';
import * as ru from '@/translations/ru';
import * as sv from '@/translations/sv';

const bundles = { en: en.en, es: es.es, he: he.he, ja: ja.ja, ru: ru.ru, sv: sv.sv } as Record<string, any>;

describe('wordWheel.climb copy', () => {
  it.each(Object.keys(bundles))('%s has top, showBoard and hideBoard', (locale) => {
    const climb = bundles[locale].wordWheel?.climb;
    expect(climb?.top).toEqual(expect.any(String));
    expect(climb?.showBoard).toEqual(expect.any(String));
    expect(climb?.hideBoard).toEqual(expect.any(String));
  });
});
