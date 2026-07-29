import { describe, it, expect } from 'vitest';
import { GeneratedLevelSource } from '../generated-level-source';
import { LOCALE_CONFIGS } from '../../locale-config';
import { findExtraWords } from '../../engine/extra-word-check';
import { getBlastCommonWords, clearBlastCommonWordsCache } from '../../engine/common-words';

describe('GeneratedLevelSource — no extra common words', () => {
  it('emits levels whose lines contain no common word outside level.words', async () => {
    clearBlastCommonWordsCache();
    const source = new GeneratedLevelSource(LOCALE_CONFIGS);
    const isCommon = await getBlastCommonWords('en');
    const minLen = LOCALE_CONFIGS.en.wordLengthRange.min;
    for (let n = 31; n <= 45; n++) {
      const level = await source.resolve(n, 'en');
      const extra = findExtraWords(level, isCommon, minLen);
      expect(extra, `level ${n} produced extra words: ${extra.join(', ')}`).toEqual([]);
    }
  }, 60_000);
});
