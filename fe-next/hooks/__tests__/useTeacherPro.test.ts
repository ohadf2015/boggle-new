/**
 * `has_pro` is the only entitlement signal the client has, and it decides whether a paid
 * surface renders. The default when we cannot answer must be "not Pro" — an optimistic
 * default hands the paid feature to everyone whose request happens to fail.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useTeacherPro } from '../useTeacherPro';

describe('useTeacherPro', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockStatus(body: unknown, ok = true) {
    global.fetch = vi.fn().mockResolvedValue({
      ok,
      json: async () => body,
    }) as unknown as typeof fetch;
  }

  it('starts pessimistic while the entitlement is still unknown', () => {
    mockStatus({ has_pro: true });
    const { result } = renderHook(() => useTeacherPro());
    // Pre-resolution paint must not leak the paid surface (recurring class-1 bug in this repo:
    // an optimistic default that a later source flips).
    expect(result.current.hasPro).toBe(false);
    expect(result.current.loading).toBe(true);
  });

  it('reports Pro once the subscription endpoint confirms it', async () => {
    mockStatus({ has_pro: true });
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(true);
  });

  it('reports free for a free teacher', async () => {
    mockStatus({ has_pro: false, tier: 'free' });
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(false);
  });

  it('stays free when the endpoint errors instead of unlocking the paid surface', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(false);
  });

  it('stays free on a non-ok response', async () => {
    mockStatus({}, false);
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(false);
  });
});
