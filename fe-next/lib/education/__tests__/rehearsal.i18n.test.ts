import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

const LOCALES = { en, he, es, sv, ja, ru } as Record<string, Record<string, unknown>>;
const KEYS = [
  'education.projectorLobby.rehearseCta',
  'education.projectorLobby.rehearsePrivate',
  'education.projectorLobby.rehearseBotsBlocked',
  'education.projectorLobby.rehearseUseClassic',
  'hostView.demoBotsFailed',
];

function lookup(tree: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);
}

describe('rehearsal copy exists in every locale', () => {
  it.each(Object.keys(LOCALES))('%s has every rehearsal key, translated', (lang) => {
    for (const key of KEYS) {
      const value = lookup(LOCALES[lang], key);
      expect(typeof value, `${lang}:${key}`).toBe('string');
      if (lang !== 'en') expect(value, `${lang}:${key}`).not.toBe(lookup(en, key));
    }
  });
});
