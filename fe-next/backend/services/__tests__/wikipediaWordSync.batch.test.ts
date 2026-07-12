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

// Mock logger
const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
};

vi.mock('../utils/logger', () => ({
  default: mockLogger
}));

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
    // GIVEN: A large dataset with 2687 words (similar to en.json), all valid 5-7 chars
    const largeWordList = Array.from({ length: 2687 }, (_, i) => ({
      word: `WORD${i % 1000}`, // 5-7 chars: WORD0-WORD999
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

  /**
   * Regression: 7 Sentry issues ("[Wikipedia] Batch upsert error" /
   * "Stored 0/50 candidates" for en/es/sv/he) all traced to the same cause —
   * insertData included validation_status/source_article_title/
   * source_article_url/interestingness_score/fetch_date, none of which are
   * real columns on daily_challenge_word_bank, so Postgres rejected every
   * upsert. Locks the row shape to only real columns.
   */
  it('only sends columns that exist on daily_challenge_word_bank', async () => {
    await storeWikipediaWordCandidates('en', new Date(), [
      { word: 'abcde', source: 'wikipedia', url: 'https://example.com/test', score: 75 },
    ]);

    expect(upsertCalls.length).toBe(1);
    const row = (upsertCalls[0].data as Array<Record<string, unknown>>)[0];
    expect(Object.keys(row).sort()).toEqual(['language', 'source', 'status', 'word']);
  });

  /**
   * Regression: 8 Sentry issues ("[Wikipedia] Batch N/M upsert error" /
   * "Stored 0/50 candidates") since 2026-07-04. Root cause: Wikipedia article
   * titles include multi-word phrases and names outside the 5-7 char band for
   * daily-challenge words. One invalid candidate per batch violates the
   * check_word_length constraint, failing the ENTIRE batch (all-or-nothing upsert).
   *
   * Fix: Filter candidates against the length constraint BEFORE upsert.
   * Valid candidates are inserted, invalid ones are logged + dropped.
   */
  it('should filter candidates violating word length constraint before upsert', async () => {
    // GIVEN: 5 valid EN words (5-7 chars) + 1 too-short (4 chars) + 1 too-long (8 chars)
    const candidatesWithInvalid = [
      { word: 'hello', source: 'wikipedia' },  // 5 chars, VALID
      { word: 'tests', source: 'wikipedia' },  // 5 chars, VALID
      { word: 'test', source: 'wikipedia' },   // 4 chars, INVALID (too short)
      { word: 'checking', source: 'wikipedia' }, // 8 chars, INVALID (too long)
      { word: 'coming', source: 'wikipedia' },  // 6 chars, VALID
      { word: 'wording', source: 'wikipedia' }, // 7 chars, VALID
    ];

    // WHEN: Store candidates with mixed validity
    await storeWikipediaWordCandidates('en', new Date(), candidatesWithInvalid);

    // THEN: Only valid words (5-7 chars) should be in the upsert call
    expect(upsertCalls.length).toBe(1);
    const upsertedWords = (upsertCalls[0].data as Array<Record<string, string>>).map(r => r.word);
    expect(upsertedWords.sort()).toEqual(['COMING', 'HELLO', 'TESTS', 'WORDING']);

    // Verify that invalid words are NOT in the upsert
    expect(upsertedWords).not.toContain('TEST');   // 4 chars, too short
    expect(upsertedWords).not.toContain('CHECKING'); // 8 chars, too long
  });

  it('should handle Japanese word length constraint (2-4 chars)', async () => {
    // GIVEN: Japanese words, some valid (2-4 chars) and some invalid
    const jaWords = [
      { word: 'あいう', source: 'wikipedia' }, // 3 chars, VALID
      { word: 'あい', source: 'wikipedia' },   // 2 chars, VALID
      { word: 'あ', source: 'wikipedia' },     // 1 char, INVALID (too short)
      { word: 'あいうえ', source: 'wikipedia' }, // 4 chars, VALID
      { word: 'あいうえお', source: 'wikipedia' }, // 5 chars, INVALID (too long)
    ];

    // WHEN: Store Japanese candidates
    await storeWikipediaWordCandidates('ja', new Date(), jaWords);

    // THEN: Only valid Japanese words (2-4 chars) should be in the upsert
    expect(upsertCalls.length).toBe(1);
    const upsertedWords = (upsertCalls[0].data as Array<Record<string, string>>).map(r => r.word);
    expect(upsertedWords.sort()).toEqual(['あい', 'あいう', 'あいうえ'].map(w => w.toUpperCase()));

    // Verify that invalid words are NOT in the upsert
    expect(upsertedWords).not.toContain('あ'.toUpperCase()); // 1 char, too short
    expect(upsertedWords).not.toContain('あいうえお'.toUpperCase()); // 5 chars, too long
  });
});
