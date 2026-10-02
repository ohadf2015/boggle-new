import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

type Tree = { [key: string]: string | Tree };

const BUNDLES: Record<string, Tree> = { en, he, sv, ja, es, ru } as unknown as Record<string, Tree>;

function leaves(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : leaves(v, `${prefix}${k}.`)
  );
}

function resolve(tree: Tree, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Tree)[part] : undefined), tree);
}

const enKeys = leaves((en as unknown as Tree).eduStudent as Tree, 'eduStudent.');

describe('eduStudent translations', () => {
  it('has a non-trivial English namespace', () => {
    expect(enKeys.length).toBeGreaterThan(20);
  });

  for (const [lang, bundle] of Object.entries(BUNDLES)) {
    it(`${lang}: every English eduStudent key resolves to non-empty copy`, () => {
      const missing = enKeys.filter((key) => {
        const value = resolve(bundle, key);
        return typeof value !== 'string' || value.trim() === '';
      });
      expect(missing).toEqual([]);
    });

    it(`${lang}: keeps every {placeholder} the English copy uses`, () => {
      const broken = enKeys.filter((key) => {
        const want = (String(resolve(en as unknown as Tree, key)).match(/\{\w+\}/g) ?? []).sort();
        const got = (String(resolve(bundle, key)).match(/\{\w+\}/g) ?? []).sort();
        return want.join() !== got.join();
      });
      expect(broken).toEqual([]);
    });

    it(`${lang}: offers at least a dozen distinct fun names`, () => {
      const names = String(resolve(bundle, 'eduStudent.join.funNames')).split('|').map((n) => n.trim()).filter(Boolean);
      expect(new Set(names).size).toBeGreaterThanOrEqual(12);
      expect(names.every((n) => n.length <= 20)).toBe(true);
    });
  }

  it('Hebrew copy is actually Hebrew, not English left in place', () => {
    const untranslated = enKeys.filter((key) => key !== 'eduStudent.join.funNames' && resolve(he as unknown as Tree, key) === resolve(en as unknown as Tree, key));
    expect(untranslated).toEqual([]);
  });
});
