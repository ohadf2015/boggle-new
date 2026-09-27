/**
 * Tests for Auto-Promotion Module
 * Verifies automatic word promotion pipeline logic.
 *
 * As of dictionary-self-improvement (2026-05-23):
 * - the unverified submission_count>=N path is REMOVED (unsafe: promoted any
 *   string with no content check). Verification is now the only auto gate.
 * - every promotion is gated through isOffensiveWord() — slurs/offensive/vulgar
 *   words are blocked even when Wiktionary-"verified".
 */

import { vi } from 'vitest';
import type { AutoPromotionResult } from '../autoPromotion';

// Mock supabaseServer
const { mockRpc, mockUpsert, mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockUpsert = vi.fn();
  const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));
  const mockSupabase = { rpc: mockRpc, from: mockFrom };
  return { mockRpc, mockUpsert, mockFrom, mockSupabase };
});
vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => mockSupabase),
}));

// Mock communityWordManager
const {
  mockAddToCommunityCache,
  mockGetVerifiedWords,
  mockGetVerifiedEnglishWords,
  mockGetVerifiedSpanishWords,
  mockGetVerifiedByLang,
  mockIsOffensiveWord,
} = vi.hoisted(() => ({
  mockAddToCommunityCache: vi.fn(),
  mockGetVerifiedWords: vi.fn(),
  mockGetVerifiedEnglishWords: vi.fn(),
  mockGetVerifiedSpanishWords: vi.fn(),
  mockGetVerifiedByLang: vi.fn(),
  mockIsOffensiveWord: vi.fn(),
}));
vi.mock('../../modules/communityWordManager', () => ({
  addToCommunityCache: mockAddToCommunityCache,
}));

vi.mock('../../services/milogWordVerifier', () => ({
  getVerifiedWordsForPromotion: mockGetVerifiedWords,
}));
vi.mock('../../services/wiktionaryEnVerifier', () => ({
  getVerifiedEnglishWordsForPromotion: mockGetVerifiedEnglishWords,
}));
vi.mock('../../services/wiktionaryEsVerifier', () => ({
  getVerifiedSpanishWordsForPromotion: mockGetVerifiedSpanishWords,
}));
vi.mock('../../services/wiktionaryVerifier', () => ({
  getVerifiedWordsForPromotionByLang: mockGetVerifiedByLang,
}));
vi.mock('../../services/wiktionaryOffensiveFilter', () => ({
  isOffensiveWord: mockIsOffensiveWord,
}));

vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('AutoPromotion', () => {
  let runAutoPromotion: () => Promise<AutoPromotionResult>;
  let _resetLockForTesting: () => void;

  beforeAll(async () => {
    const mod = await import('../autoPromotion');
    runAutoPromotion = mod.runAutoPromotion;
    _resetLockForTesting = mod._resetLockForTesting;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    _resetLockForTesting();
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockAddToCommunityCache.mockResolvedValue(undefined);
    mockGetVerifiedWords.mockResolvedValue([]);
    mockGetVerifiedEnglishWords.mockResolvedValue([]);
    mockGetVerifiedSpanishWords.mockResolvedValue([]);
    mockGetVerifiedByLang.mockResolvedValue([]);
    mockIsOffensiveWord.mockResolvedValue(false); // clean by default
  });

  it('returns correct result structure', async () => {
    const result = await runAutoPromotion();
    expect(result).toEqual(
      expect.objectContaining({
        promoted: expect.any(Number),
        failed: expect.any(Number),
        blocked: expect.any(Number),
        words: expect.objectContaining({
          milogBased: expect.any(Array),
          wiktionaryBased: expect.any(Array),
          wiktionaryEsBased: expect.any(Array),
        }),
      })
    );
  });

  it('NEVER queries the unverified submission-count path', async () => {
    await runAutoPromotion();
    expect(mockRpc).not.toHaveBeenCalledWith(
      'get_auto_promotion_candidates',
      expect.anything()
    );
  });

  it('promotes wiktionary-verified English words (clean)', async () => {
    mockGetVerifiedEnglishWords.mockResolvedValueOnce([
      { id: 'wk-1', word: 'pleat', url: 'https://en.wiktionary.org/wiki/pleat' },
      { id: 'wk-2', word: 'quark', url: 'https://en.wiktionary.org/wiki/quark' },
    ]);

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(2);
    expect(result.words.wiktionaryBased).toEqual(['pleat', 'quark']);
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('pleat', 'en');
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', {
      p_word_id: 'wk-1',
      p_source: 'wiktionary_verified',
    });
  });

  it('promotes wiktionary-verified Spanish words (clean)', async () => {
    mockGetVerifiedSpanishWords.mockResolvedValueOnce([
      { id: 'es-1', word: 'gato', url: 'https://en.wiktionary.org/wiki/gato' },
    ]);

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(1);
    expect(result.words.wiktionaryEsBased).toEqual(['gato']);
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('gato', 'es');
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', {
      p_word_id: 'es-1',
      p_source: 'wiktionary_es_verified',
    });
  });

  it('promotes Swedish (wiktionary) and Japanese (jisho) verified words', async () => {
    // generic getter is called once per lang ('sv' then 'ja'); return per call
    mockGetVerifiedByLang
      .mockResolvedValueOnce([{ id: 'sv-1', word: 'hund', url: 'u' }])   // sv
      .mockResolvedValueOnce([{ id: 'ja-1', word: 'ねこ', url: 'u' }]);   // ja

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(2);
    expect(result.words.wiktionarySvBased).toEqual(['hund']);
    expect(result.words.jishoBased).toEqual(['ねこ']);
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('hund', 'sv');
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('ねこ', 'ja');
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', { p_word_id: 'sv-1', p_source: 'wiktionary_sv_verified' });
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', { p_word_id: 'ja-1', p_source: 'jisho_verified' });
  });

  it('BLOCKS an offensive word even when Wiktionary-verified', async () => {
    mockGetVerifiedEnglishWords.mockResolvedValueOnce([
      { id: 'wk-bad', word: 'wop', url: 'https://en.wiktionary.org/wiki/wop' },
      { id: 'wk-ok', word: 'pleat', url: 'https://en.wiktionary.org/wiki/pleat' },
    ]);
    mockIsOffensiveWord.mockImplementation(async (w: string) => w === 'wop');

    const result = await runAutoPromotion();

    // only the clean word is promoted
    expect(result.promoted).toBe(1);
    expect(result.blocked).toBe(1);
    expect(result.words.wiktionaryBased).toEqual(['pleat']);
    // the slur is never written to word_scores nor community cache
    expect(mockAddToCommunityCache).not.toHaveBeenCalledWith('wop', 'en');
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('pleat', 'en');
    // the slur is marked so it won't be re-promoted next run
    expect(mockRpc).toHaveBeenCalledWith(
      'update_verification_result',
      expect.objectContaining({ p_word_id: 'wk-bad', p_source: 'offensive_filter' })
    );
    // and it is NOT marked auto-promoted
    expect(mockRpc).not.toHaveBeenCalledWith('mark_word_auto_promoted', {
      p_word_id: 'wk-bad',
      p_source: 'wiktionary_verified',
    });
  });

  it('promotes milog-verified Hebrew words (offensive filter is a no-op for he)', async () => {
    mockGetVerifiedWords.mockResolvedValueOnce([
      { id: 'milog-1', word: 'מילה', url: 'https://milog.co.il/x' },
      { id: 'milog-2', word: 'שפה', url: 'https://milog.co.il/y' },
    ]);

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(2);
    expect(result.words.milogBased).toEqual(['מילה', 'שפה']);
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('מילה', 'he');
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', {
      p_word_id: 'milog-1',
      p_source: 'milog_verified',
    });
  });

  it('individual failure does not stop the batch', async () => {
    mockGetVerifiedEnglishWords.mockResolvedValueOnce([
      { id: 'id-1', word: 'good', url: 'u' },
      { id: 'id-2', word: 'bad', url: 'u' },
      { id: 'id-3', word: 'alsogood', url: 'u' },
    ]);
    mockAddToCommunityCache
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Cache failure'))
      .mockResolvedValueOnce(undefined);

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.words.wiktionaryBased).toEqual(['good', 'alsogood']);
  });

  it('upserts word_scores with the correct shape', async () => {
    mockGetVerifiedEnglishWords.mockResolvedValueOnce([
      { id: 'id-1', word: 'hello', url: 'u' },
    ]);

    await runAutoPromotion();

    expect(mockFrom).toHaveBeenCalledWith('word_scores');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'hello',
        language: 'en',
        likes_count: expect.any(Number),
        dislikes_count: 0,
        first_submitter: 'auto_promoted',
      }),
      { onConflict: 'word,language' }
    );
  });

  it('concurrent run guard prevents double execution', async () => {
    let resolveFirst: (v: Array<never>) => void;
    const slow = new Promise<Array<never>>((resolve) => { resolveFirst = resolve; });
    mockGetVerifiedEnglishWords.mockReturnValueOnce(slow);

    const firstRun = runAutoPromotion();
    const secondRun = runAutoPromotion();
    resolveFirst!([]);

    const [result1, result2] = await Promise.all([firstRun, secondRun]);
    expect(result2.skipped).toBe(true);
    expect(result1.skipped).toBeUndefined();
  });

  it('handles empty queues gracefully', async () => {
    const result = await runAutoPromotion();
    expect(result.promoted).toBe(0);
    expect(result.words.wiktionaryBased).toEqual([]);
    expect(result.words.milogBased).toEqual([]);
  });
});
