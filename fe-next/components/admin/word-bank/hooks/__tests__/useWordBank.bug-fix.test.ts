/**
 * Bug Fix Test: Word Bank Flickering and Rate Limit Issues
 *
 * Issues to reproduce:
 * 1. Infinite loop causing flickering when admin enters word bank
 * 2. Too many requests triggering rate limit
 * 3. useEffect includes `refresh` in dependencies, causing recreation loop
 */

import { vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWordBank } from '../useWordBank';
import type { Language } from '@/types';

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null, count: 0 })),
    })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  })),
}));

describe('useWordBank - Bug Fix: Infinite Loop and Rate Limit', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        words: [],
        pagination: { hasMore: false },
        stats: { total: 0, active: 0, blocked: 0, bySource: {}, pending: 0, approved: 0, rejected: 0 },
      }),
    });
  });

  it('should NOT trigger infinite requests when filters remain constant', async () => {
    const filters = {
      language: 'en' as Language,
      status: undefined,
      validation_status: undefined,
      source: undefined,
      search: '',
    };

    renderHook(() => useWordBank(filters));

    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCallCount = (global.fetch as any).mock.calls.length;

    // Wait 500ms to see if additional calls happen (they shouldn't)
    await new Promise(resolve => setTimeout(resolve, 500));

    const finalCallCount = (global.fetch as any).mock.calls.length;

    // Should only have made initial calls (words + stats = 2 calls)
    expect(finalCallCount).toBe(initialCallCount);
    expect(finalCallCount).toBeLessThanOrEqual(2); // 1 for words, 1 for stats
  });

  it('should NOT call refresh more than once on mount', async () => {
    const filters = {
      language: 'en' as Language,
    };

    renderHook(() => useWordBank(filters));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should call fetch exactly 2 times: once for words, once for stats
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should only refetch when filters actually change', async () => {
    const { rerender } = renderHook(
      ({ filters }) => useWordBank(filters),
      {
        initialProps: {
          filters: { language: 'en' as Language },
        },
      }
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const callsAfterMount = (global.fetch as any).mock.calls.length;

    // Rerender with SAME filters
    rerender({ filters: { language: 'en' as Language } });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should NOT trigger new fetch calls
    expect((global.fetch as any).mock.calls.length).toBe(callsAfterMount);

    // Now change language
    rerender({ filters: { language: 'he' as Language } });

    await waitFor(() => {
      expect((global.fetch as any).mock.calls.length).toBeGreaterThan(callsAfterMount);
    });
  });
});
