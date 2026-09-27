/**
 * Bug Fix Test: useWordBank missing Authorization header
 *
 * Issue: useWordBank hook doesn't include Bearer token in fetch requests,
 * causing 401 errors even when admin is logged in.
 *
 * Root cause: Unlike useAdminOperation, useWordBank doesn't get session
 * and inject Authorization header into requests.
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWordBank } from '../useWordBank';
import type { Language } from '@/types';

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-admin-token-12345',
            user: { id: 'admin-user-id', email: 'admin@test.com' },
          },
        },
        error: null,
      }),
    },
  })),
}));

describe('useWordBank - Bug Fix: Missing Authorization Header', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        words: [{ id: '1', word: 'test', language: 'en' }],
        pagination: { hasMore: false },
        stats: { total: 1, active: 1, blocked: 0, bySource: {}, pending: 0, approved: 0, rejected: 0 },
      }),
    });
  });

  it('should include Authorization header with Bearer token in fetch requests', async () => {
    const filters = {
      language: 'en' as Language,
    };

    renderHook(() => useWordBank(filters));

    // Wait for initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Check that fetch was called with Authorization header
    const fetchCalls = (global.fetch as any).mock.calls;

    // At least one call should exist
    expect(fetchCalls.length).toBeGreaterThan(0);

    // Check each fetch call has Authorization header
    for (const call of fetchCalls) {
      const url = call[0] as string;
      const options = call[1] as RequestInit | undefined;

      // API calls to word-bank should include Authorization header
      if (url.includes('/api/admin/daily-word/word-bank')) {
        expect(options).toBeDefined();
        expect(options?.headers).toBeDefined();

        const headers = options?.headers as Record<string, string>;
        expect(headers['Authorization']).toBeDefined();
        expect(headers['Authorization']).toMatch(/^Bearer .+$/);
      }
    }
  });

  it('should include Authorization header in POST requests (deleteWord)', async () => {
    const filters = {
      language: 'en' as Language,
    };

    const { result } = renderHook(() => useWordBank(filters));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous fetch calls
    (global.fetch as any).mockClear();

    // Call deleteWord
    await result.current.deleteWord('test-word');

    // Check that POST fetch was called with Authorization header
    const fetchCalls = (global.fetch as any).mock.calls;
    const postCall = fetchCalls.find(call => {
      const options = call[1] as RequestInit;
      return options?.method === 'POST';
    });

    expect(postCall).toBeDefined();
    const options = postCall![1] as RequestInit;
    const headers = options?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization']).toMatch(/^Bearer test-admin-token-12345$/);
  });

  it('should include Authorization header in bulk operations', async () => {
    const filters = {
      language: 'en' as Language,
    };

    const { result } = renderHook(() => useWordBank(filters));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear previous fetch calls
    (global.fetch as any).mockClear();

    // Call bulkApprove
    await result.current.bulkApprove(['word-id-1', 'word-id-2']);

    // Check that POST fetch was called with Authorization header
    const fetchCalls = (global.fetch as any).mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(0);

    const postCall = fetchCalls.find(call => {
      const options = call[1] as RequestInit;
      return options?.method === 'POST';
    });

    expect(postCall).toBeDefined();
    const options = postCall![1] as RequestInit;
    const headers = options?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization']).toMatch(/^Bearer .+$/);
  });
});
