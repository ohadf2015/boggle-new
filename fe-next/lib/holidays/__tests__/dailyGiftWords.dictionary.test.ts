import { describe, expect, it } from 'vitest';
import { ensureLanguageLoaded, isValidWord } from '@/backend/dictionary';
import { normalizeWordForComparison } from '@/backend/routes/dailyChallenge/utils';
import type { Language } from '@/types';
import { GIFT_WORDS } from '../dailyGiftWords';

describe('GIFT_WORDS against the dictionary', () => {
  it('Given every gift word, Then the dictionary accepts it, so the server pays the gift when it is traced', async () => {
    const rejected: string[] = [];
    for (const [lang, words] of Object.entries(GIFT_WORDS)) {
      await ensureLanguageLoaded(lang as Language);
      for (const w of words) if (isValidWord(normalizeWordForComparison(w, lang as Language), lang as Language) !== true) rejected.push(`${lang}:${w}`);
    }
    expect(rejected).toEqual([]);
  }, 120_000);
});
