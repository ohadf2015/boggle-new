import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { en } from '../../../../translations/en';
import { he } from '../../../../translations/he';
import { sv } from '../../../../translations/sv';
import { ja } from '../../../../translations/ja';
import { es } from '../../../../translations/es';
import { ru } from '../../../../translations/ru';

const ROOT = resolve(__dirname, '../../../..');
const SCAN = ['components/education', 'components/multiplayer/wordcraft', 'host'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '__tests__' && name !== 'node_modules') walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const keys = Array.from(
  new Set(
    SCAN.flatMap((d) => walk(join(ROOT, d))).flatMap((f) =>
      Array.from(readFileSync(f, 'utf8').matchAll(/['"`](eduLive\.[a-zA-Z.]+)['"`]/g), (m) => m[1])
    )
  )
).sort();

function lookup(bundle: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), bundle);
}

const placeholders = (s: string) => Array.from(s.matchAll(/\{\{\s*(\w+)\s*\}\}/g), (m) => m[1]).sort();

const BUNDLES = { en, he, sv, ja, es, ru } as const;

describe('eduLive.* keys resolve in every locale bundle', () => {
  it('finds the keys the live classroom surfaces use', () => {
    expect(keys.length).toBeGreaterThan(20);
  });

  for (const [lang, bundle] of Object.entries(BUNDLES)) {
    it(`${lang}: every key is a non-empty string with the same placeholders as English`, () => {
      for (const key of keys) {
        const value = lookup(bundle, key);
        expect(typeof value, `${lang} ${key}`).toBe('string');
        expect((value as string).trim().length, `${lang} ${key}`).toBeGreaterThan(0);
        expect(placeholders(value as string), `${lang} ${key}`).toEqual(placeholders(lookup(en, key) as string));
      }
    });
  }

  it('non-English bundles are translated, not copied (beyond brand words)', () => {
    const same = keys.filter((k) => ['he', 'ja', 'ru'].some((l) => lookup(BUNDLES[l as 'he'], k) === lookup(en, k)));
    expect(same).toEqual([]);
  });
});
