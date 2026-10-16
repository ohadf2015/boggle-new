import { describe, it, expect } from 'vitest';
import { generateRandomTable as serverDeal, hebrewLetters } from '../gameUtils';
import { generateRandomTable as clientDeal } from '@/utils/utils';

const HEBREW_SET = new Set(hebrewLetters);
const VOWELLED_FOOD = ['לֶחֶם', 'חָלָב', 'גְּבִינָה', 'תַּפּוּחַ', 'בֵּיצָה', 'מַיִם', 'עוּגָה', 'אֹרֶז'];

describe.each([
  ['server', serverDeal],
  ['client', clientDeal],
])('%s deal with vowelled lesson words', (_side, deal) => {
  it('GIVEN a Hebrew list written with niqqud WHEN a 6x6 board is dealt THEN every tile is a base Hebrew letter', () => {
    for (let run = 0; run < 20; run++) {
      const cells = deal(6, 6, 'he', VOWELLED_FOOD).flat();
      expect(cells.filter((c) => !HEBREW_SET.has(c))).toEqual([]);
    }
  });

  it('GIVEN a Spanish word typed with a decomposed accent WHEN dealt THEN no tile is a lone combining mark', () => {
    for (let run = 0; run < 10; run++) {
      const cells = deal(5, 5, 'es', ['jardín', 'canción']).flat();
      expect(cells.filter((c) => /^\p{M}+$/u.test(c))).toEqual([]);
    }
  });
});
