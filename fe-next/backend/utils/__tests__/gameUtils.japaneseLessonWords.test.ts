import { describe, it, expect } from 'vitest';
import { generateRandomTable as serverDeal } from '../gameUtils';
import { generateRandomTable as clientDeal } from '@/utils/utils';
import { isWordOnBoard } from '@/backend/modules/wordValidator';
import { japaneseHiragana } from '@/shared/constants/japaneseLetters';

const KANA = new Set(japaneseHiragana);

describe.each([
  ['server', serverDeal],
  ['client', clientDeal],
])('%s deal with Japanese lesson words', (_side, deal) => {
  it('GIVEN hiragana lesson words WHEN a ja board is dealt THEN each word is findable on it', () => {
    for (let run = 0; run < 20; run++) {
      const board = deal(5, 5, 'ja', ['がっこう', 'ねこ', 'さくら']);
      for (const word of ['がっこう', 'ねこ', 'さくら']) {
        expect(isWordOnBoard(word, board, undefined, 'ja')).toBe(true);
      }
    }
  });

  it('GIVEN kanji and katakana words mixed in WHEN dealt THEN every tile stays hiragana and the hiragana word is found', () => {
    for (let run = 0; run < 10; run++) {
      const board = deal(5, 5, 'ja', ['学校', 'ネコ', 'いぬ']);
      expect(board.flat().filter((c) => !KANA.has(c))).toEqual([]);
      expect(isWordOnBoard('いぬ', board, undefined, 'ja')).toBe(true);
    }
  });

  it('GIVEN no lesson words WHEN a ja board is dealt THEN it is a plain weighted hiragana grid', () => {
    const board = deal(4, 4, 'ja', []);
    expect(board).toHaveLength(4);
    expect(board.flat().filter((c) => !KANA.has(c))).toEqual([]);
  });
});
