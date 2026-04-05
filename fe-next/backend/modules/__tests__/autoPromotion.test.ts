/**
 * Tests for Auto-Promotion Module
 * Verifies automatic word promotion pipeline logic
 */

import { vi, type Mock, type MockInstance } from 'vitest';
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
const { mockAddToCommunityCache, mockGetVerifiedWords, mockMarkWordPromoted } = vi.hoisted(() => ({
  mockAddToCommunityCache: vi.fn(),
  mockGetVerifiedWords: vi.fn(),
  mockMarkWordPromoted: vi.fn(),
}));
vi.mock('../../modules/communityWordManager', () => ({
  addToCommunityCache: mockAddToCommunityCache,
}));

// Mock milogWordVerifier
vi.mock('../../services/milogWordVerifier', () => ({
  getVerifiedWordsForPromotion: mockGetVerifiedWords,
  markWordPromoted: mockMarkWordPromoted,
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AutoPromotion', () => {
  // Import after mocks
  let runAutoPromotion: () => Promise<AutoPromotionResult>;
  let AUTO_PROMOTION_CONFIG: { MIN_SUBMISSIONS: number; BATCH_LIMIT: number; VOTES_TO_ADD: number };
  let _resetLockForTesting: () => void;

  beforeAll(async () => {
    const mod = await import('../autoPromotion');
    runAutoPromotion = mod.runAutoPromotion;
    AUTO_PROMOTION_CONFIG = mod.AUTO_PROMOTION_CONFIG;
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
    mockMarkWordPromoted.mockResolvedValue(true);
  });

  it('returns correct result structure', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await runAutoPromotion();

    expect(result).toEqual(
      expect.objectContaining({
        promoted: expect.any(Number),
        failed: expect.any(Number),
        words: expect.objectContaining({
          submissionBased: expect.any(Array),
          milogBased: expect.any(Array),
        }),
      })
    );
  });

  it('promotes words with count >= MIN_SUBMISSIONS and reason = not_in_dictionary', async () => {
    const candidates = [
      { id: 'id-1', word: 'testword', language: 'en', submission_count: 15, reason: 'not_in_dictionary' },
      { id: 'id-2', word: 'another', language: 'sv', submission_count: 10, reason: 'not_in_dictionary' },
    ];
    mockRpc.mockResolvedValueOnce({ data: candidates, error: null });

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(2);
    expect(result.words.submissionBased).toEqual(['testword', 'another']);

    // Should call addToCommunityCache for each word
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('testword', 'en');
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('another', 'sv');

    // Should upsert word_scores for each word
    expect(mockFrom).toHaveBeenCalledWith('word_scores');
    expect(mockUpsert).toHaveBeenCalledTimes(2);

    // Should mark as auto-promoted via RPC
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', {
      p_word_id: 'id-1',
      p_source: 'submission_threshold',
    });
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', {
      p_word_id: 'id-2',
      p_source: 'submission_threshold',
    });
  });

  it('only fetches candidates with reason = not_in_dictionary via RPC params', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await runAutoPromotion();

    expect(mockRpc).toHaveBeenCalledWith('get_auto_promotion_candidates', {
      p_min_submissions: AUTO_PROMOTION_CONFIG.MIN_SUBMISSIONS,
      p_limit: AUTO_PROMOTION_CONFIG.BATCH_LIMIT,
    });
  });

  it('skips already-approved words (handled by RPC WHERE clause)', async () => {
    // RPC only returns unapproved words, so empty result means nothing to promote
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(0);
    expect(mockAddToCommunityCache).not.toHaveBeenCalled();
  });

  it('promotes milog-verified Hebrew words immediately', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null }); // no submission candidates

    const milogWords = [
      { id: 'milog-1', word: 'מילה', url: 'https://milog.co.il/מילה' },
      { id: 'milog-2', word: 'שפה', url: 'https://milog.co.il/שפה' },
    ];
    mockGetVerifiedWords.mockResolvedValueOnce(milogWords);

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(2);
    expect(result.words.milogBased).toEqual(['מילה', 'שפה']);

    // Should add to community cache with 'he' language
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('מילה', 'he');
    expect(mockAddToCommunityCache).toHaveBeenCalledWith('שפה', 'he');

    // Should mark via RPC
    expect(mockRpc).toHaveBeenCalledWith('mark_word_auto_promoted', {
      p_word_id: 'milog-1',
      p_source: 'milog_verified',
    });
  });

  it('individual failure does not stop batch', async () => {
    const candidates = [
      { id: 'id-1', word: 'good', language: 'en', submission_count: 10, reason: 'not_in_dictionary' },
      { id: 'id-2', word: 'bad', language: 'en', submission_count: 10, reason: 'not_in_dictionary' },
      { id: 'id-3', word: 'also-good', language: 'en', submission_count: 10, reason: 'not_in_dictionary' },
    ];
    mockRpc.mockResolvedValueOnce({ data: candidates, error: null });

    // Make the second word fail
    mockAddToCommunityCache
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Cache failure'))
      .mockResolvedValueOnce(undefined);

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.words.submissionBased).toEqual(['good', 'also-good']);
  });

  it('calls addToCommunityCache and upserts word_scores with correct data', async () => {
    const candidates = [
      { id: 'id-1', word: 'hello', language: 'en', submission_count: 12, reason: 'not_in_dictionary' },
    ];
    mockRpc.mockResolvedValueOnce({ data: candidates, error: null });

    await runAutoPromotion();

    expect(mockAddToCommunityCache).toHaveBeenCalledWith('hello', 'en');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'hello',
        language: 'en',
        likes_count: AUTO_PROMOTION_CONFIG.VOTES_TO_ADD,
        dislikes_count: 0,
        first_submitter: 'auto_promoted',
      }),
      { onConflict: 'word,language' }
    );
  });

  it('concurrent run guard prevents double execution', async () => {
    // First call returns slowly
    let resolveFirst: (v: { data: never[]; error: null }) => void;
    const slowPromise = new Promise<{ data: never[]; error: null }>((resolve) => {
      resolveFirst = resolve;
    });
    mockRpc.mockReturnValueOnce(slowPromise);

    // Start first run (will be slow)
    const firstRun = runAutoPromotion();

    // Start second run immediately (should be blocked)
    const secondRun = runAutoPromotion();

    // Resolve first call
    resolveFirst!({ data: [], error: null });

    const [result1, result2] = await Promise.all([firstRun, secondRun]);

    // Second run should indicate it was skipped
    expect(result2.skipped).toBe(true);
    // First run should complete normally
    expect(result1.skipped).toBeUndefined();
  });

  it('handles RPC error gracefully', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('handles null data from RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await runAutoPromotion();

    expect(result.promoted).toBe(0);
    expect(result.words.submissionBased).toEqual([]);
    expect(result.words.milogBased).toEqual([]);
  });
});
