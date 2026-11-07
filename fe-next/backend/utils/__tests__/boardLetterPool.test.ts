import { describe, it, expect } from 'vitest';
import { boardLetterPool } from '../gameUtils';

describe('boardLetterPool', () => {
  it.each([
    ['ru', /^[А-ЯЁЪ]$/],
    ['ja', /^[ぁ-ゖー]$/],
    ['sv', /^[A-ZÅÄÖ]$/],
    ['es', /^[A-ZÑÁÉÍÓÚÜ]$/],
    ['he', /^[א-ת]$/],
  ])('deals %s boards from that language\'s own letters', (language, letterRe) => {
    const pool = boardLetterPool(language);
    expect(pool.length).toBeGreaterThan(20);
    expect(pool.every((l) => letterRe.test(l))).toBe(true);
  });

  it('includes each language\'s special letters', () => {
    expect(boardLetterPool('sv')).toEqual(expect.arrayContaining(['Å', 'Ä', 'Ö']));
    expect(boardLetterPool('es')).toContain('Ñ');
    expect(boardLetterPool('ru')).toEqual(expect.arrayContaining(['Й', 'Ы', 'Ь']));
    expect(boardLetterPool('ja')).toEqual(expect.arrayContaining(['が', 'っ', 'ゃ']));
  });

  it('weights Swedish tiles by Swedish letter frequency, not a flat alphabet', () => {
    const pool = boardLetterPool('sv');
    const count = (l: string) => pool.filter((x) => x === l).length;
    expect(count('E')).toBeGreaterThan(count('Å') * 3);
    expect(count('Ä')).toBeGreaterThan(0);
    expect(pool).not.toContain('Q');
    expect(pool).not.toContain('W');
  });
});
