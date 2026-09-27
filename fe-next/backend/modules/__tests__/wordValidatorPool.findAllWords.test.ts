/**
 * WordValidatorPool - findAllWordsAsync tests
 * Verifies that findAllWords can be executed off the hot path via the pool,
 * returning the same results as the synchronous boggleSolver.findAllWords.
 */

vi.mock('../../modules/boggleSolver', () => ({
  findAllWords: vi.fn(),
  getCachedTrie: vi.fn(),
}));

vi.mock('../../modules/wordValidator', () => ({
  isWordOnBoard: vi.fn(),
  getWordPath: vi.fn(),
  makePositionsMap: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { WordValidatorPool } from '../wordValidatorPool';
import * as boggleSolver from '../../modules/boggleSolver';
import type { FindWordsOptions } from '../../modules/boggleSolver';

const mockFindAllWords = boggleSolver.findAllWords as MockedFunction<typeof boggleSolver.findAllWords>;
const mockGetCachedTrie = boggleSolver.getCachedTrie as MockedFunction<typeof boggleSolver.getCachedTrie>;

const SIMPLE_GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['E', 'F', 'S'],
];

describe('WordValidatorPool.findAllWordsAsync', () => {
  let pool: WordValidatorPool;

  beforeEach(() => {
    pool = new WordValidatorPool();
    // Force sync-only mode (no worker file in test env)
    (pool as unknown as { syncOnly: boolean }).syncOnly = true;
    (pool as unknown as { isInitialized: boolean }).isInitialized = true;
    mockFindAllWords.mockReset();
    mockGetCachedTrie.mockReset();
  });

  it('returns words from findAllWords sync fallback', async () => {
    mockFindAllWords.mockReturnValue(['cat', 'dog', 'cog']);

    const result = await pool.findAllWordsAsync(SIMPLE_GRID, 'en', { minLength: 3 });

    expect(result).toEqual(['cat', 'dog', 'cog']);
    expect(mockFindAllWords).toHaveBeenCalledWith(SIMPLE_GRID, 'en', { minLength: 3 });
  });

  it('passes options through to findAllWords', async () => {
    mockFindAllWords.mockReturnValue(['cats']);
    const opts: FindWordsOptions = { minLength: 4, maxLength: 10, maxWords: 100 };

    await pool.findAllWordsAsync(SIMPLE_GRID, 'he', opts);

    expect(mockFindAllWords).toHaveBeenCalledWith(SIMPLE_GRID, 'he', opts);
  });

  it('returns empty array when findAllWords returns empty', async () => {
    mockFindAllWords.mockReturnValue([]);

    const result = await pool.findAllWordsAsync(SIMPLE_GRID, 'sv', {});

    expect(result).toEqual([]);
  });

  it('rejects when findAllWords throws', async () => {
    mockFindAllWords.mockImplementation(() => { throw new Error('solver error'); });

    await expect(pool.findAllWordsAsync(SIMPLE_GRID, 'en', {})).rejects.toThrow('solver error');
  });
});

describe('findAllWordsAsync module export', () => {
  it('is exported from wordValidatorPool', async () => {
    const mod = await import('../wordValidatorPool');
    expect(typeof mod.findAllWordsAsync).toBe('function');
  });
});
