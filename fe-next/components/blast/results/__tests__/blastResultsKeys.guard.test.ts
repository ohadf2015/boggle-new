import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

type Tree = { [k: string]: string | Tree };
const LOCALES = { en, he, es, sv, ja, ru } as unknown as Record<string, Tree>;
const RESULTS_DIR = path.resolve(__dirname, '..');
const LEGACY = ['BlastResultsSummary.tsx', 'BlastMpResults.tsx'].map((f) => path.resolve(RESULTS_DIR, '../legacy', f));
const SCENE = path.resolve(RESULTS_DIR, '../../results/BlastResultsScene.tsx');

function resolve(tree: Tree, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], tree);
}

function literalKeys(): string[] {
  const files = [
    ...readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.tsx')).map((f) => path.join(RESULTS_DIR, f)),
    ...LEGACY,
    SCENE,
  ];
  const keys = new Set<string>();
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) keys.add(m[1]);
  }
  return [...keys];
}

const DYNAMIC = [
  ...['coins', 'diamonds', 'bombs', 'combo', 'words', 'waves'].map((id) => `blast.results.reveal.${id}`),
  ...['Low', 'Mid', 'High', 'NewBest'].map((tier) => `blast.results.reveal.headline${tier}`),
  'blast.mpResults.coinKing',
  'blast.mpResults.mostDiamonds',
];

describe('Blast results translation keys', () => {
  const keys = [...literalKeys(), ...DYNAMIC];

  it('finds the keys it guards', () => {
    expect(keys.length).toBeGreaterThan(20);
  });

  for (const [lang, tree] of Object.entries(LOCALES)) {
    it(`resolves every key in ${lang}`, () => {
      const missing = keys.filter((k) => typeof resolve(tree, k) !== 'string');
      expect(missing).toEqual([]);
    });
  }
});
