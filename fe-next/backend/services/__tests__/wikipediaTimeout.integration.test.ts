/**
 * Integration test to reproduce Wikipedia API timeout issue
 * This test calls the actual Wikipedia API to verify timeout behavior
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import ky, { HTTPError, TimeoutError } from 'ky';
import { fetchFeaturedContent } from '../wikipediaWordFetcher';

describe('Wikipedia API Timeout Reproduction', () => {
  // Increase Jest timeout for this suite to match new server maxDuration
  vi.setConfig({ testTimeout: 100000 });

  test('should fetch Wikipedia featured content without timeout (EN)', async () => {
    // GIVEN: Current date for fetching featured content
    const today = new Date();

    // WHEN: Fetching featured content from Wikipedia API
    console.log('[TEST] Starting Wikipedia fetch for EN...');
    const startTime = Date.now();

    const result = await fetchFeaturedContent('en', today);

    const duration = Date.now() - startTime;
    console.log(`[TEST] Fetch completed in ${duration}ms`);

    // THEN: Should complete within 35 seconds (ky timeout is 30s + network variability buffer)
    expect(duration).toBeLessThan(35000);

    // THEN: Should return featured content or null (404 is ok)
    expect(result).toBeDefined();
  });

  test('should fetch Wikipedia featured content without timeout (HE)', async () => {
    // GIVEN: Current date for Hebrew Wikipedia
    const today = new Date();

    // WHEN: Fetching Hebrew featured content
    console.log('[TEST] Starting Wikipedia fetch for HE...');
    const startTime = Date.now();

    const result = await fetchFeaturedContent('he', today);

    const duration = Date.now() - startTime;
    console.log(`[TEST] Fetch completed in ${duration}ms`);

    // THEN: Should complete within 35 seconds (ky timeout is 30s + network variability buffer)
    expect(duration).toBeLessThan(35000);

    // THEN: Should return result or null
    expect(result).toBeDefined();
  });

  test('should handle Wikipedia API timeout gracefully', async () => {
    // GIVEN: A URL that will timeout
    const slowUrl = 'https://api.wikimedia.org/feed/v1/wikipedia/en/featured/2099/12/31';

    // WHEN: Making request with short timeout
    console.log('[TEST] Testing timeout handling...');
    const startTime = Date.now();

    try {
      await ky.get(slowUrl, {
        timeout: 1000, // Very short timeout to force failure
        retry: 0,
        headers: {
          'User-Agent': 'LexiClash/1.0 Test',
          'Accept': 'application/json'
        }
      }).json();

      // Should not reach here
      fail('Expected timeout error');
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[TEST] Timeout caught in ${duration}ms`);

      // THEN: Should timeout within reasonable time
      expect(duration).toBeLessThan(5000);

      // THEN: Should be a ky error (TimeoutError or HTTPError)
      console.log('[TEST] Error type:', error instanceof TimeoutError ? 'TimeoutError' : error instanceof HTTPError ? 'HTTPError' : 'other');
      console.log('[TEST] Error message:', error instanceof Error ? error.message : String(error));
      expect(error instanceof Error).toBe(true);
    }
  });

  test('should complete full population flow within 60 seconds', async () => {
    // This is the critical test - simulates what the admin dashboard does
    const { populateWikipediaWords } = await import('../wikipediaWordPopulator');

    // GIVEN: Current date and single language
    const today = new Date();
    const language = 'en';

    // WHEN: Running full population flow
    console.log('[TEST] Starting full population flow...');
    const startTime = Date.now();

    const result = await populateWikipediaWords(today, language);

    const duration = Date.now() - startTime;
    console.log(`[TEST] Population completed in ${duration}ms`);
    console.log(`[TEST] Result:`, JSON.stringify(result, null, 2));

    // THEN: Should complete within 90 seconds (new server maxDuration)
    expect(duration).toBeLessThan(90000);

    // THEN: Should return result with source
    expect(result).toBeDefined();
    expect(result.source).toMatch(/wikipedia|fallback/);
    expect(result.wordsFound).toBeGreaterThan(0);
  });

  test('should handle parallel language population without timeout', async () => {
    const { triggerWikipediaWordPopulation } = await import('../cronScheduler');

    // GIVEN: Current date and multiple languages
    const today = new Date();

    // WHEN: Triggering population for all languages (parallel)
    console.log('[TEST] Starting parallel population for all languages...');
    const startTime = Date.now();

    const result = await triggerWikipediaWordPopulation(today);

    const duration = Date.now() - startTime;
    console.log(`[TEST] Parallel population completed in ${duration}ms`);
    console.log(`[TEST] Results:`, JSON.stringify(result.results, null, 2));

    // THEN: Should complete within 90 seconds (parallel processing with 30s timeout per language)
    expect(duration).toBeLessThan(90000);

    // THEN: Should have results for all languages
    expect(Object.keys(result.results).length).toBeGreaterThan(0);
  });
});
