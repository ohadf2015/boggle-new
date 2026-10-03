import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { HQ_MODES, hqModeFacts } from '../hqModes';

type Tree = { [k: string]: string | Tree };
const BUNDLES = { en, he, sv, ja, es, ru } as unknown as Record<string, Tree>;

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else Object.assign(acc, flatten(v, key));
    return acc;
  }, {});
}

function resolve(tree: Tree, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Tree)[part] : undefined), tree);
}

const ROOT = path.resolve(__dirname, '../../../..');
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(name) ? [full] : [];
  });
}

describe('eduHq translations resolve through the imported bundles', () => {
  const enKeys = flatten((BUNDLES.en.eduHq as Tree) ?? {}, 'eduHq');

  it('Given the en bundle, Then eduHq exists and is non-trivial', () => {
    expect(Object.keys(enKeys).length).toBeGreaterThan(40);
  });

  it.each(Object.keys(BUNDLES))('Given %s, Then every eduHq key resolves to a non-empty string with the same placeholders', (loc) => {
    for (const [key, enValue] of Object.entries(enKeys)) {
      const value = resolve(BUNDLES[loc], key);
      expect(typeof value, `${loc}:${key}`).toBe('string');
      expect((value as string).trim().length, `${loc}:${key}`).toBeGreaterThan(0);
      const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');
      expect(placeholders(value as string), `${loc}:${key}`).toBe(placeholders(enValue));
    }
  });

  it('Given the mode facts, Then each mode skill and pitch key resolves in en', () => {
    for (const m of HQ_MODES) {
      const facts = hqModeFacts(m.id);
      expect(typeof resolve(BUNDLES.en, facts.skillKey), facts.skillKey).toBe('string');
      expect(typeof resolve(BUNDLES.en, facts.pitchKey), facts.pitchKey).toBe('string');
    }
  });

  it.each(Object.keys(BUNDLES))('Given %s, Then each mode tile tagline resolves and stays short enough for one line on a 390px tile', (loc) => {
    for (const m of HQ_MODES) {
      const { tagKey } = hqModeFacts(m.id);
      const value = resolve(BUNDLES[loc], tagKey);
      expect(typeof value, `${loc}:${tagKey}`).toBe('string');
      expect(Array.from(value as string).length, `${loc}:${tagKey}`).toBeLessThanOrEqual(18);
    }
  });

  it('Given source code, Then every literal eduHq key it names exists in en', () => {
    const files = [
      ...sourceFiles(path.join(ROOT, 'components', 'teacher')),
      ...sourceFiles(path.join(ROOT, 'components', 'auth')),
      ...sourceFiles(path.join(ROOT, 'components', 'education')),
      ...sourceFiles(path.join(ROOT, 'app', '[locale]', 'education', 'access')),
    ];
    const missing: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(/['"`](eduHq\.[A-Za-z0-9_.]+)['"`]/g)) {
        if (typeof resolve(BUNDLES.en, match[1]) !== 'string') missing.push(`${path.relative(ROOT, file)}: ${match[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
