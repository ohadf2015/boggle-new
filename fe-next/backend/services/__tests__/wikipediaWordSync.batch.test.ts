/**
 * Test: Wikipedia Word Sync Batching
 *
 * Tests that large JSON files are processed in batches to avoid timeout.
 * Bug: Syncing 2687 words in single upsert causes database timeout.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { storeWikipediaWordCandidates } from '../wikipediaWordFetcher';

// Track upsert calls
let upsertCalls: Array<{ data: unknown[]; options: unknown }> = [];

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      upsert: (data: unknown[], options: unknown) => {
        upsertCalls.push({ data, options });
        return Promise.resolve({ error: null });
      }
    })
  })
}));

describe('Wikipedia Word Sync Batching', () => {
  beforeEach(() => {
    // Reset tracking
    upsertCalls = [];

    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('should batch large datasets to prevent timeout', async () => {
    // GIVEN: A large dataset with 2687 words (similar to en.json)
    const largeWordList = Array.from({ length: 2687 }, (_, i) => ({
      word: `WORD${i}`,
      source: 'test_source',
      url: `https://example.com/${i}`,
      score: 50 + (i % 50)
    }));

    // WHEN: We store the candidates
    await storeWikipediaWordCandidates('en', new Date(), largeWordList);

    // THEN: Multiple batch calls should be made (not a single huge upsert)
    // Each batch should be <= 500 records to avoid timeout

    // Should have multiple batches, not just 1
    expect(upsertCalls.length).toBeGreaterThan(1);

    // Each batch should have at most 500 records
    for (const call of upsertCalls) {
      expect((call.data as unknown[]).length).toBeLessThanOrEqual(500);
    }

    // Total records should match original count
    const totalRecords = upsertCalls.reduce(
      (sum, call) => sum + (call.data as unknown[]).length,
      0
    );
    expect(totalRecords).toBe(2687);
  });

  it('should process small datasets in single batch', async () => {
    // GIVEN: A small dataset with 50 words
    const smallWordList = Array.from({ length: 50 }, (_, i) => ({
      word: `SMALL${i}`,
      source: 'test_source',
      score: 50
    }));

    // WHEN: We store the candidates
    await storeWikipediaWordCandidates('he', new Date(), smallWordList);

    // THEN: Should use a single batch call
    expect(upsertCalls.length).toBe(1);
    expect((upsertCalls[0].data as unknown[]).length).toBe(50);
  });
});
