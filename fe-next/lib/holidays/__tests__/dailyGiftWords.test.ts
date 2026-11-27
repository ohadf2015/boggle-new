import { describe, expect, it } from 'vitest';
import { MAX_DISCOVERY_WORD_LENGTH, MIN_DISCOVERY_WORD_LENGTH } from '@/shared/constants/gameConstants';
import { GIFT_WORDS } from '../dailyGiftWords';

describe('GIFT_WORDS', () => {
  it('Given every gift word, Then the Word Hunt board accepts its length, so a gift can always be traced', () => {
    for (const [lang, words] of Object.entries(GIFT_WORDS)) {
      for (const w of words) {
        expect(w.length, `${lang}:${w}`).toBeGreaterThanOrEqual(MIN_DISCOVERY_WORD_LENGTH);
        expect(w.length, `${lang}:${w}`).toBeLessThanOrEqual(MAX_DISCOVERY_WORD_LENGTH);
      }
    }
  });

  it('Given every list, Then words are unique and written the way the board stores letters', () => {
    for (const [lang, words] of Object.entries(GIFT_WORDS)) {
      expect(new Set(words).size, lang).toBe(words.length);
      if (lang !== 'he') for (const w of words) expect(w, `${lang}:${w}`).toBe(w.toUpperCase());
    }
  });
});
