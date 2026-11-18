import { describe, it, expect } from 'vitest';
import { generateRandomTable as serverDeal, spanishLetterPool, spanishLetters } from '../gameUtils';
import { generateRandomTable as clientDeal } from '@/utils/utils';
import { spanishLetters as clientAlphabet } from '@/utils/consts';

const COMMON = new Set(['A', 'E', 'O', 'S', 'R', 'N', 'I', 'D', 'L', 'C', 'T', 'U']);
const RARE = new Set(['J', 'K', 'W', 'X', 'Z', 'Q', 'Ü']);

function shares(cells: string[]) {
  const n = cells.length;
  return {
    common: cells.filter((c) => COMMON.has(c)).length / n,
    rare: cells.filter((c) => RARE.has(c)).length / n,
  };
}

describe.each([
  ['server', serverDeal],
  ['client', clientDeal],
])('%s Spanish deal', (_side, deal) => {
  it('GIVEN many 6x6 boards WHEN dealt THEN common letters dominate and rare letters are scarce', () => {
    const cells: string[] = [];
    for (let i = 0; i < 400; i++) cells.push(...deal(6, 6, 'es').flat());
    const { common, rare } = shares(cells);
    expect(common).toBeGreaterThan(0.65);
    expect(rare).toBeLessThan(0.04);
  });

  it('GIVEN a deal WHEN tiles are drawn THEN Ñ can appear and accented vowels stay rare', () => {
    const cells: string[] = [];
    for (let i = 0; i < 400; i++) cells.push(...deal(6, 6, 'es').flat());
    expect(cells).toContain('Ñ');
    expect(cells.filter((c) => /[ÁÉÍÓÚ]/.test(c)).length / cells.length).toBeLessThan(0.03);
  });
});

describe('Spanish alphabet vs deal pool', () => {
  it('GIVEN the full alphabet WHEN the pool is read THEN the alphabet keeps every letter and the pool is a subset', () => {
    expect(spanishLetters).toEqual(clientAlphabet);
    expect(spanishLetters).toEqual(expect.arrayContaining(['K', 'W', 'X', 'Ü', 'Ñ', 'Á']));
    expect(spanishLetterPool.every((l) => spanishLetters.includes(l))).toBe(true);
  });
});
