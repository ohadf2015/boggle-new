/**
 * Test for bulk approval performance
 *
 * Bug: Bulk approval of words is "stuck" because addToCommunityWords
 * is called sequentially for each word, causing timeouts on large batches.
 *
 * Fix: Use batchAddToCommunityWords with single upsert operation.
 */

import { bulkUpdateValidationStatus } from '../wordBankService';

// Mock Supabase client
const createMockSupabase = () => {
  let communityWordsUpsertCount = 0;
  let communityWordsInsertCount = 0;

  return {
    client: {
      from: (table: string) => {
        if (table === 'community_words') {
          return {
            insert: () => {
              communityWordsInsertCount++;
              return { error: null };
            },
            upsert: (data: unknown[]) => {
              communityWordsUpsertCount++;
              // Should receive array of 50 words in one batch
              return { error: null };
            },
            update: () => ({
              eq: () => ({
                eq: () => ({ error: null }),
              }),
            }),
          };
        }
        // daily_challenge_word_bank table
        return {
          select: () => ({
            in: () => ({
              data: Array.from({ length: 50 }, (_, i) => ({
                id: `word-${i}`,
                word: `TESTWORD${i}`,
                language: 'en',
              })),
              error: null,
            }),
          }),
        };
      },
      rpc: (_name: string, params: { p_word_ids: string[]; p_validation_status: string }) => {
        // Return affected count
        return { data: params.p_word_ids.length, error: null };
      },
    },
    getUpsertCount: () => communityWordsUpsertCount,
    getInsertCount: () => communityWordsInsertCount,
  };
};

describe('bulkUpdateValidationStatus performance', () => {
  it('should complete bulk approval in reasonable time (< 5 seconds for 50 words)', async () => {
    const mock = createMockSupabase();
    const wordIds = Array.from({ length: 50 }, (_, i) => `word-${i}`);

    const startTime = Date.now();

    const result = await bulkUpdateValidationStatus(
      mock.client as unknown as Parameters<typeof bulkUpdateValidationStatus>[0],
      wordIds,
      'approved'
    );

    const duration = Date.now() - startTime;

    // The operation should complete quickly, not get "stuck"
    // Before fix: This would timeout or take 50+ seconds
    // After fix: Should complete in < 5 seconds
    expect(duration).toBeLessThan(5000);
    expect(result.success).toBe(true);
    expect(result.affected).toBe(50);
  }, 10000); // 10 second timeout for the test itself

  it('should use batch upsert instead of individual inserts for community_words', async () => {
    const mock = createMockSupabase();
    const wordIds = Array.from({ length: 50 }, (_, i) => `word-${i}`);

    await bulkUpdateValidationStatus(
      mock.client as unknown as Parameters<typeof bulkUpdateValidationStatus>[0],
      wordIds,
      'approved'
    );

    // After fix: Should use batch upsert (1 call) instead of 50 individual inserts
    // CRITICAL: This is the key assertion - we should have exactly 1 upsert call, not 50
    expect(mock.getUpsertCount()).toBe(1);
    expect(mock.getInsertCount()).toBe(0); // No individual inserts
  });

  it('should not add to community_words when rejecting', async () => {
    const mock = createMockSupabase();
    const wordIds = Array.from({ length: 50 }, (_, i) => `word-${i}`);

    await bulkUpdateValidationStatus(
      mock.client as unknown as Parameters<typeof bulkUpdateValidationStatus>[0],
      wordIds,
      'rejected'
    );

    // Should not touch community_words when rejecting
    expect(mock.getUpsertCount()).toBe(0);
    expect(mock.getInsertCount()).toBe(0);
  });
});
