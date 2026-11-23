// pluralKeyOf asks for <base>_one/_few/_other; a locale missing a form renders the raw key for that count.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const LOCALES: Record<string, unknown> = { en, he, es, sv, ja, ru };

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree);
}

const bases = new Set<string>();
for (const dir of ['app', 'components', 'lib', 'hooks']) {
  for (const file of sourceFiles(path.join(ROOT, dir))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/pluralKeyOf\(\s*'([^']+)'/g)) bases.add(m[1]);
  }
}

describe('pluralKeyOf bases', () => {
  it('Given the source, When scanned, Then it finds plural bases to check', () => {
    expect(bases.size).toBeGreaterThan(5);
  });

  it('Given every pluralKeyOf base, When each locale is read, Then _one and _other exist and ru also has _few', () => {
    const missing: string[] = [];
    for (const base of bases) {
      for (const [locale, tree] of Object.entries(LOCALES)) {
        const forms = locale === 'ru' ? ['_one', '_few', '_other'] : ['_one', '_other'];
        for (const form of forms) {
          if (typeof lookup(tree, base + form) !== 'string') missing.push(`${locale}:${base}${form}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
