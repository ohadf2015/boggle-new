import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { ChainPackSource } from '../chain-pack-source';
import { LOCALE_CONFIGS } from '../locale-config';
import { findExtraWords } from '../engine/extra-word-check';
import { getBlastDictionary } from '../engine/blast-dictionary';
import type { Locale } from '../types';

const basePath = resolve(process.cwd(), 'content/blast/packs');

describe('chain packs — no extra dictionary words', () => {
  for (const locale of ['en', 'he'] as Locale[]) {
    it.skip(`${locale} chain levels 1-15 contain no unintended dictionary words`, async () => {
      const source = new ChainPackSource(basePath);
      const isWord = await getBlastDictionary(locale);
      const minLen = LOCALE_CONFIGS[locale].wordLengthRange.min;
      for (let n = 1; n <= 15; n++) {
        const level = await source.resolve(n, locale);
        const extra = findExtraWords(level, isWord, minLen);
        expect(extra, `${locale} level ${n}: ${extra.join(', ')}`).toEqual([]);
      }
    }, 20_000);
  }
});
