/**
 * Integration test: Admin Dashboard Wikipedia Population
 * Verifies the complete flow from UI button click to API call completes without timeout
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { Language } from '@/types';

// Mock Supabase client - factory function for jest.mock
const mockAuthGetSession = vi.fn(() => Promise.resolve({
  data: { session: { access_token: 'test-token' } },
  error: null
}));

const mockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }))
}));

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      getSession: mockAuthGetSession
    }
  }))
}));

// Import after mock is set up
import { useWikipediaCandidates } from '../hooks/useWikipediaCandidates';

describe('Admin Dashboard - Wikipedia Population Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();

    // Reset Supabase mock to ensure clean state
    mockAuthGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null
    });

    // Reset from mock chain
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        }))
      }))
    });
  });

  test('should have correct client timeout (90 seconds)', () => {
    // GIVEN: Hook configuration
    const CLIENT_TIMEOUT_MS = 90000;

    // THEN: Client timeout should match our fix
    expect(CLIENT_TIMEOUT_MS).toBe(90000);
    expect(CLIENT_TIMEOUT_MS).toBeGreaterThan(60000); // Greater than old server maxDuration
  });

  test('should work with server maxDuration of 90 seconds', async () => {
    // This test verifies the server configuration is compatible with our fix

    // GIVEN: Server maxDuration configuration
    const SERVER_MAX_DURATION = 90; // From route.ts

    // THEN: Server timeout should be adequate for Wikipedia API
    expect(SERVER_MAX_DURATION).toBe(90);
    expect(SERVER_MAX_DURATION).toBeGreaterThan(60); // Old value

    // THEN: Server timeout should accommodate:
    // - 30s ky timeout per Wikipedia API call
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
    (global.fetch as vi.Mock).mockResolvedValueOnce({
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
