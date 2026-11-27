import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

const headline = (tree: unknown) =>
  'education.student.join.flow.codeHeadline'
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], tree) as string;

describe('join code headline', () => {
  it.each(Object.entries({ en, he, es, sv, ja, ru }))('reads in sentence case in %s', (_locale, tree) => {
    const text = headline(tree);
    expect(text).toBeTruthy();
    expect(text.charAt(0)).toBe(text.charAt(0).toLocaleUpperCase());
    expect(text.slice(1)).toBe(text.slice(1).toLocaleLowerCase());
  });
});
