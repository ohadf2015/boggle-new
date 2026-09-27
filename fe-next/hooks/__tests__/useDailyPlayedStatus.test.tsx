import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isAuthenticated: true }),
}));

import { useDailyPlayedStatus } from '../useDailyPlayedStatus';

/*
 * An authed player starts on `loading: true` (the results CTA shows a skeleton
 * rather than guessing). A failed status fetch used to return without ever
 * clearing it, so the CTA stayed a skeleton forever.
 */
describe('useDailyPlayedStatus — failed fetch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('given the status endpoint answers non-OK, stops loading', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('given the status fetch throws, stops loading', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { result } = renderHook(() => useDailyPlayedStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});
