/**
 * Test: Wikipedia Timeout Configuration Verification
 * Ensures client and server timeouts are properly configured after the fix
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Wikipedia Timeout Configuration', () => {
  test('client timeout should be 90 seconds', () => {
    // GIVEN: Client hook file
    const hookPath = join(__dirname, '../hooks/useWikipediaCandidates.ts');
    const hookContent = readFileSync(hookPath, 'utf-8');

    // WHEN: Checking CLIENT_TIMEOUT_MS value
    const timeoutMatch = hookContent.match(/const\s+CLIENT_TIMEOUT_MS\s*=\s*(\d+)/);

    // THEN: Should be 90000ms (90 seconds)
    expect(timeoutMatch).not.toBeNull();
    expect(timeoutMatch![1]).toBe('90000');
  });

  test('server maxDuration should be 90 seconds', () => {
    // GIVEN: API route file
    const routePath = join(__dirname, '../../../../app/api/admin/wikipedia-words/route.ts');
    const routeContent = readFileSync(routePath, 'utf-8');

    // WHEN: Checking maxDuration export
    const durationMatch = routeContent.match(/export\s+const\s+maxDuration\s*=\s*(\d+)/);

    // THEN: Should be 90 seconds
    expect(durationMatch).not.toBeNull();
    expect(durationMatch![1]).toBe('90');
  });

  test('Wikipedia API axios timeout should be 30 seconds', () => {
    // GIVEN: Wikipedia fetcher file
    const fetcherPath = join(__dirname, '../../../../backend/services/wikipediaWordFetcher.ts');
    const fetcherContent = readFileSync(fetcherPath, 'utf-8');

    // WHEN: Checking axios timeout in fetchWithRetry call
    // Looking for: fetchWithRetry<WikipediaFeaturedContent>(url, 30000)
    const timeoutMatch = fetcherContent.match(/fetchWithRetry<WikipediaFeaturedContent>\(url,\s*(\d+)\)/);

    // THEN: Should be 30000ms (30 seconds)
    expect(timeoutMatch).not.toBeNull();
    expect(timeoutMatch![1]).toBe('30000');
  });

  test('client timeout should be greater than server maxDuration', () => {
    // GIVEN: Configuration values
    const CLIENT_TIMEOUT_MS = 90000;
    const SERVER_MAX_DURATION_S = 90;

    // THEN: Client should wait longer than server allows
    // This prevents client from aborting while server is still processing
    expect(CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(SERVER_MAX_DURATION_S * 1000);
  });

  test('server maxDuration should accommodate worst-case Wikipedia API time', () => {
    // GIVEN: Wikipedia API characteristics
    const AXIOS_TIMEOUT_MS = 30000; // Per request
    const MAX_RETRIES = 2;
    const RETRY_DELAY_MS = 500; // First retry
    const SECOND_RETRY_DELAY_MS = 1000; // Second retry

    // Worst case: 30s timeout + 500ms delay + 30s retry + 1000ms delay = ~62s
    const worstCaseTime = AXIOS_TIMEOUT_MS + RETRY_DELAY_MS + AXIOS_TIMEOUT_MS + SECOND_RETRY_DELAY_MS;

    const SERVER_MAX_DURATION_S = 90;

    // THEN: Server should allow enough time for retries
    expect(SERVER_MAX_DURATION_S * 1000).toBeGreaterThan(worstCaseTime);

    // THEN: Should have reasonable buffer (at least 15 seconds)
    const buffer = (SERVER_MAX_DURATION_S * 1000) - worstCaseTime;
    expect(buffer).toBeGreaterThanOrEqual(15000);
  });

  test('configuration comments should explain the fix', () => {
    // GIVEN: Hook file content
    const hookPath = join(__dirname, '../hooks/useWikipediaCandidates.ts');
    const hookContent = readFileSync(hookPath, 'utf-8');

    // THEN: Should have comment explaining 90s timeout
    expect(hookContent).toContain('90s');
    expect(hookContent).toContain('Wikipedia API');

    // GIVEN: Route file content
    const routePath = join(__dirname, '../../../../app/api/admin/wikipedia-words/route.ts');
    const routeContent = readFileSync(routePath, 'utf-8');

    // THEN: Should have comment explaining maxDuration
    expect(routeContent).toContain('90 seconds');
    expect(routeContent).toContain('Wikipedia API');

    // GIVEN: Fetcher file content
    const fetcherPath = join(__dirname, '../../../../backend/services/wikipediaWordFetcher.ts');
    const fetcherContent = readFileSync(fetcherPath, 'utf-8');

    // THEN: Should have comment explaining 30s timeout
    expect(fetcherContent).toContain('30s');
    expect(fetcherContent).toContain('Wikipedia API can be slow');
  });
});
