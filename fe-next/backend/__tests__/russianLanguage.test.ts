import { describe, it, expect, vi } from 'vitest';
import { generateRandomTable, russianLetterPool } from '../utils/gameUtils';
import { loadRussianDictionary } from '../dictionaryLoaders';
import { normalizeRussianWord, normalizeWord } from '@/shared/utils/wordNormalization';

const RU_POOL = new Set(russianLetterPool);
const cellsOf = (grid: string[][]): string[] => grid.flat();

/**
 * Exercises the REAL Russian game-language functions (not a re-implementation):
 * board generation, dictionary load + ё→е folding, and shared normalization.
 */
describe('Russian board generation', () => {
  it('GIVEN ru WHEN generating THEN every cell is in the weighted Cyrillic pool', () => {
    const grid = generateRandomTable(5, 5, 'ru');
    for (const cell of cellsOf(grid)) {
      expect(RU_POOL.has(cell)).toBe(true);
    }
  });

  it('GIVEN ru board THEN never produces Ё or hard-sign Ъ (dead/foldable tiles)', () => {
    // Sample many boards — these letters are excluded from the pool by design.
    for (let i = 0; i < 50; i++) {
      const cells = cellsOf(generateRandomTable(5, 5, 'ru'));
      expect(cells.includes('Ё')).toBe(false);
      expect(cells.includes('Ъ')).toBe(false);
      for (const c of cells) expect(/[А-Я]/.test(c)).toBe(true);
    }
  });

  it('weighted pool surfaces common vowels more than rare consonants', () => {
    const count = (l: string) => russianLetterPool.filter((x) => x === l).length;
    expect(count('О')).toBeGreaterThan(count('Ф'));
    expect(count('Е')).toBeGreaterThan(count('Щ'));
  });
});

describe('Russian normalization (ё→е fold, shared client+server source)', () => {
  it('folds ё→е and lowercases', () => {
    expect(normalizeRussianWord('МЁД')).toBe('мед');
    expect(normalizeRussianWord('Ёлка')).toBe('елка');
    expect(normalizeRussianWord('СЛОВО')).toBe('слово');
  });

  it('is wired into the generic normalizeWord dispatcher for ru', () => {
    expect(normalizeWord('ПЁС', 'ru')).toBe('пес');
    expect(normalizeWord('Игра', 'ru')).toBe('игра');
  });
});

describe('loadRussianDictionary', () => {
  it('folds ё→е at load so a board Е tile matches a ё-spelled dictionary word', async () => {
    // Main file ships "мёд"/"ёлка"; both must be stored folded so validate-time
    // (which also folds) hits them. Mirrors the Spanish accent-symmetry test.
    const dict = await loadRussianDictionary(async (p) => (p.includes('approved') ? '' : 'мёд\nёлка\nслово\n'));
    expect(dict.has('мед')).toBe(true);
    expect(dict.has('елка')).toBe(true);
    expect(dict.has('слово')).toBe(true);
    // The unfolded ё form must NOT be stored — every lookup folds, so it'd be unreachable.
    expect(dict.has('мёд')).toBe(false);
  });

  it('lowercases and deduplicates', async () => {
    const dict = await loadRussianDictionary(async (p) => (p.includes('approved') ? '' : 'Слово\nСЛОВО\nслово\n'));
    expect(dict.has('слово')).toBe(true);
    expect(dict.size).toBe(1);
  });

  it('merges approved words', async () => {
    const dict = await loadRussianDictionary(async (p) => (p.includes('approved') ? 'новое\n' : 'слово\n'));
    expect(dict.has('слово')).toBe(true);
    expect(dict.has('новое')).toBe(true);
  });
});
