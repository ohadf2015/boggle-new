import { describe, it, expect } from 'vitest';
import { matchSecretWord, normalizeSecret, isEggId, secretWordIds, EGG_IDS } from '../eggs';

describe('matchSecretWord', () => {
  it('Given an English Hanukkah board, then MACCABEE and LATKE are secrets in any case', () => {
    expect(matchSecretWord('Maccabee', 'en', 'hanukkah')).toBe('word_maccabee');
    expect(matchSecretWord('LATKE', 'en', 'hanukkah')).toBe('word_latke');
    expect(matchSecretWord('santa', 'en', 'hanukkah')).toBeNull();
  });

  it('Given Hebrew with final letters, then סופגניה and מכבי match', () => {
    expect(matchSecretWord('סופגניה', 'he', 'hanukkah')).toBe('word_sufganiyah');
    expect(matchSecretWord('סביבון', 'he', 'hanukkah')).toBe('word_dreidel');
    expect(normalizeSecret('סביבון', 'he')).toBe('סביבונ');
  });

  it('Given Russian, then ЁЛКА matches with or without Ё', () => {
    expect(matchSecretWord('ЁЛКА', 'ru', 'christmas')).toBe('word_yolka');
    expect(matchSecretWord('елка', 'ru', 'christmas')).toBe('word_yolka');
  });

  it('Given locale extras, then es REYES and sv LUCIA count only on their own boards', () => {
    expect(matchSecretWord('reyes', 'es', 'christmas')).toBe('word_reyes');
    expect(matchSecretWord('lucia', 'sv', 'christmas')).toBe('word_lucia');
    expect(matchSecretWord('lucia', 'en', 'christmas')).toBeNull();
  });

  it('Given Japanese, then no secret words (kana boards)', () => {
    expect(secretWordIds('ja', 'christmas')).toEqual([]);
  });
});

describe('isEggId', () => {
  it('Given every secret word id, then the server accepts it; junk is rejected', () => {
    for (const lang of ['en', 'he', 'es', 'sv', 'ru']) {
      for (const h of ['hanukkah', 'christmas'] as const) for (const id of secretWordIds(lang, h)) expect(isEggId(id)).toBe(true);
    }
    expect(EGG_IDS).toContain('lost_latke');
    expect(isEggId('free_coins')).toBe(false);
  });
});
