import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const NAMESPACES = ['eg2Fix', 'eg2Polish'];

const leaves = (node: unknown, prefix: string): string[] =>
  node && typeof node === 'object'
    ? Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, `${prefix}.${k}`))
    : [prefix];

const get = (o: unknown, path: string) =>
  path.split('.').reduce((a: any, k) => a?.[k], o);

const enKeys = NAMESPACES.flatMap((ns) => leaves((en as any)[ns], ns));

describe('eg2 namespaces exist in every locale', () => {
  it('en defines every namespace', () => {
    for (const ns of NAMESPACES) expect((en as any)[ns], ns).toBeTruthy();
  });

  describe.each(Object.entries({ he, sv, ja, es, ru }))('%s', (_l, bundle) => {
    it.each(enKeys)('%s is a non-empty string', (key) => {
      const value = get(bundle, key);
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    });
  });
});
