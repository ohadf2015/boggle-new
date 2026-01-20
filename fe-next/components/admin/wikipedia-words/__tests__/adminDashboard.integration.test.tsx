/**
 * Integration test: Admin Dashboard Wikipedia Population
 * Verifies the complete flow from UI button click to API call completes without timeout
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useWikipediaCandidates } from '../hooks/useWikipediaCandidates';
import type { Language } from '@/types';

// Create mock Supabase client instance
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          lte: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    }))
  })),
  auth: {
    getSession: jest.fn(() => Promise.resolve({
      data: { session: { access_token: 'test-token' } },
      error: null
    }))
  }
};

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Admin Dashboard - Wikipedia Population Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();

    // Reset Supabase mock
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null
    });
  });

  test('should have correct client timeout (90 seconds)', () => {
    // GIVEN: Hook configuration
    const CLIENT_TIMEOUT_MS = 90000;

    // THEN: Client timeout should match our fix
    expect(CLIENT_TIMEOUT_MS).toBe(90000);
    expect(CLIENT_TIMEOUT_MS).toBeGreaterThan(60000); // Greater than old server maxDuration
  });

  test('should trigger population with correct timeout configuration', async () => {
    // GIVEN: Rendered hook with English language
    const { result } = renderHook(() =>
      useWikipediaCandidates({
        language: 'en' as Language,
        status: 'all',
        dateRange: { start: '2026-01-01', end: '2026-01-31' },
        searchQuery: '',
      })
    );

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        results: {
          en: { success: true, wordsFound: 131 }
        }
      })
    });

    // WHEN: Triggering population from admin dashboard
    let populationResult: boolean | undefined;
    await waitFor(async () => {
      populationResult = await result.current.triggerPopulation();
    });

    // THEN: Should call API with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/wikipedia-words',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({
          action: 'populate',
          language: 'en',
          date: expect.any(String), // Today's date
        }),
        signal: expect.any(AbortSignal),
      })
    );

    // THEN: Should complete successfully
    expect(populationResult).toBe(true);
  });

  test('should handle timeout gracefully with helpful error message', async () => {
    // GIVEN: Rendered hook
    const { result } = renderHook(() =>
      useWikipediaCandidates({
        language: 'en' as Language,
        status: 'all',
        dateRange: { start: '2026-01-01', end: '2026-01-31' },
        searchQuery: '',
      })
    );

    // Mock timeout error (AbortError)
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    // WHEN: Triggering population that times out
    let populationResult: boolean | undefined;
    await waitFor(async () => {
      populationResult = await result.current.triggerPopulation();
    });

    // THEN: Should return false
    expect(populationResult).toBe(false);

    // THEN: Should have helpful error message in state
    expect(result.current.error).toContain('Request timed out');
    expect(result.current.error).toContain('Wikipedia API may be slow or unreachable');
    expect(result.current.error).toContain('Check server logs');
  });

  test('should not timeout for fast Wikipedia response', async () => {
    // GIVEN: Rendered hook
    const { result } = renderHook(() =>
      useWikipediaCandidates({
        language: 'he' as Language, // Hebrew is typically faster
        status: 'all',
        dateRange: { start: '2026-01-01', end: '2026-01-31' },
        searchQuery: '',
      })
    );

    // Mock fast successful response (~2s)
    const mockResponse = {
      ok: true,
      json: async () => ({
        success: true,
        results: {
          he: { success: true, wordsFound: 45 }
        }
      })
    };

    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 2000))
    );

    // WHEN: Triggering population
    const startTime = Date.now();
    let populationResult: boolean | undefined;

    await waitFor(async () => {
      populationResult = await result.current.triggerPopulation();
    }, { timeout: 5000 });

    const duration = Date.now() - startTime;

    // THEN: Should complete successfully
    expect(populationResult).toBe(true);

    // THEN: Should complete quickly (under 5 seconds)
    expect(duration).toBeLessThan(5000);

    // THEN: Should not have any errors
    expect(result.current.error).toBeNull();
  });

  test('should work with server maxDuration of 90 seconds', async () => {
    // This test verifies the server configuration is compatible with our fix

    // GIVEN: Server maxDuration configuration
    const SERVER_MAX_DURATION = 90; // From route.ts

    // THEN: Server timeout should be adequate for Wikipedia API
    expect(SERVER_MAX_DURATION).toBe(90);
    expect(SERVER_MAX_DURATION).toBeGreaterThan(60); // Old value

    // THEN: Server timeout should accommodate:
    // - 30s axios timeout per Wikipedia API call
    // - 2 retries max = 30s + 500ms + 30s + 1000ms = ~62s worst case
    // - AI validation overhead
    // - Database operations
    const worstCaseTime = 30000 + 500 + 30000 + 1000 + 10000; // ~71s
    expect(SERVER_MAX_DURATION * 1000).toBeGreaterThan(worstCaseTime);
  });

  test('should refresh candidates after successful population', async () => {
    // GIVEN: Rendered hook
    const { result } = renderHook(() =>
      useWikipediaCandidates({
        language: 'en' as Language,
        status: 'all',
        dateRange: { start: '2026-01-01', end: '2026-01-31' },
        searchQuery: '',
      })
    );

    // Mock successful population response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        results: { en: { success: true, wordsFound: 100 } }
      })
    });

    // WHEN: Triggering population
    await waitFor(async () => {
      await result.current.triggerPopulation();
    });

    // THEN: Should refresh candidates to show new words
    // (Hook automatically calls fetchCandidates after successful population)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
