import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { es } from '@/translations/es';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';

type Tree = { [k: string]: string | Tree };
const LOCALES = { en, he, es, sv, ja, ru } as unknown as Record<string, Tree>;
const FILES = ['../BubblePopGame.tsx', '../WaitingGameDock.tsx'].map((f) => path.resolve(__dirname, f));
const QUIPS = Array.from({ length: 6 }, (_, i) => `lobby.fun.quip${i + 1}`);

const resolve = (tree: Tree, key: string): unknown => key.split('.').reduce<unknown>((n, p) => (n as Tree | undefined)?.[p], tree);

function usedKeys(): string[] {
  const keys = new Set(QUIPS);
  for (const file of FILES) {
    for (const m of readFileSync(file, 'utf8').matchAll(/'(lobby\.fun\.[a-zA-Z0-9]+)'/g)) keys.add(m[1]);
  }
  return [...keys];
}

describe('lobby waiting game copy', () => {
  it.each(Object.keys(LOCALES))('every lobby.fun key the lobby renders exists in %s', (locale) => {
    const missing = usedKeys().filter((k) => typeof resolve(LOCALES[locale], k) !== 'string');
    expect(missing).toEqual([]);
  });
});
