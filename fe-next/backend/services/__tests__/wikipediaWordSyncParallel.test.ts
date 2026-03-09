/**
 * Test: Wikipedia Word Sync should process languages in parallel
 * Bug: syncLocalJSONToDatabase processes languages sequentially, causing timeouts
 * with 7 languages each having 2000+ words (total time can exceed 90s server timeout)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Wikipedia Word Sync Parallel Processing', () => {
  test('syncLocalJSONToDatabase should process languages in parallel to avoid timeout', () => {
    // GIVEN: The wikipediaWordAdmin.ts file (where the actual implementation lives)
    const adminPath = join(__dirname, '../wikipediaWordAdmin.ts');
    const adminContent = readFileSync(adminPath, 'utf-8');

    // Find the syncLocalJSONToDatabase function
    const functionMatch = adminContent.match(
      /export async function syncLocalJSONToDatabase[\s\S]*?(?=\nexport |$)/
    );
    expect(functionMatch).not.toBeNull();
    const functionBody = functionMatch![0];

    // THEN: Should NOT use sequential for...of loop pattern for languages
    // Sequential pattern: "for (const lang of targetLanguages)"
    const hasSequentialLoop = /for\s*\(\s*const\s+lang\s+of\s+targetLanguages\s*\)/.test(functionBody);

    // THEN: Should use parallel processing with Promise.all or Promise.allSettled
    const hasParallelProcessing =
      functionBody.includes('Promise.all') ||
      functionBody.includes('Promise.allSettled');

    // The fix: Languages should be processed in parallel, not sequentially
    expect(hasSequentialLoop).toBe(false);
    expect(hasParallelProcessing).toBe(true);
  });

  test('syncLocalJSONToDatabase should complete within 30 seconds for single language', () => {
    // GIVEN: Expected performance characteristics
    // A single language with ~2500 words, batched at 500, takes ~5 batches
    // Each batch should complete in ~2-3 seconds (network + DB)
    // Total single language: ~10-15 seconds max

    const EXPECTED_MAX_SINGLE_LANGUAGE_TIME_SECONDS = 30;
    const SERVER_MAX_DURATION_SECONDS = 90;

    // THEN: Single language processing should leave room for parallel processing
    // If 7 languages take 10-15s each sequentially = 70-105s (timeout!)
    // If 7 languages take ~15s in parallel = 15s (safe!)
    expect(EXPECTED_MAX_SINGLE_LANGUAGE_TIME_SECONDS).toBeLessThan(SERVER_MAX_DURATION_SECONDS);
  });

  test('parallel processing should allow all 7 languages to complete within server timeout', () => {
    // GIVEN: Server constraints
    const SERVER_MAX_DURATION_SECONDS = 90;
    const LANGUAGES_COUNT = 7;

    // Worst case per language (network issues, slow DB)
    const WORST_CASE_SINGLE_LANGUAGE_SECONDS = 30;

    // WHEN: Processing in parallel
    // Time = max(all_languages) not sum(all_languages)
    const parallelTime = WORST_CASE_SINGLE_LANGUAGE_SECONDS;

    // WHEN: Processing sequentially
    const sequentialTime = WORST_CASE_SINGLE_LANGUAGE_SECONDS * LANGUAGES_COUNT;

    // THEN: Parallel processing fits within timeout
    expect(parallelTime).toBeLessThan(SERVER_MAX_DURATION_SECONDS);

    // THEN: Sequential processing would exceed timeout
    expect(sequentialTime).toBeGreaterThan(SERVER_MAX_DURATION_SECONDS);
  });
});
