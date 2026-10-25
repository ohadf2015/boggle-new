/**
 * `has_pro` is the only entitlement signal the client has, and it decides whether a paid
 * surface renders. The default when we cannot answer must be "not Pro" — an optimistic
 * default hands the paid feature to everyone whose request happens to fail.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTeacherPro } from '../useTeacherPro';

const auth = vi.hoisted(() => ({ user: { id: 'teacher-a' } as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

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

  it('a later failed read keeps the last answer this tab saw (no paywall flash for a paying teacher)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.resetModules();
      const fresh = await import('../useTeacherPro');
      mockStatus({ has_pro: true });
      const first = renderHook(() => fresh.useTeacherPro());
      await waitFor(() => expect(first.result.current.loading).toBe(false));
      first.unmount();
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
      const { result } = renderHook(() => fresh.useTeacherPro());
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(result.current.loading).toBe(false);
      expect(result.current.hasPro).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('never reuses another account\'s answer on a shared computer when the read fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.resetModules();
      const fresh = await import('../useTeacherPro');
      auth.user = { id: 'teacher-a' };
      mockStatus({ has_pro: true });
      const first = renderHook(() => fresh.useTeacherPro());
      await waitFor(() => expect(first.result.current.loading).toBe(false));
      first.unmount();
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      auth.user = { id: 'teacher-b' };
      global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
      const { result } = renderHook(() => fresh.useTeacherPro());
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(result.current.hasPro).toBe(false);
      expect(result.current.loading).toBe(true);
    } finally {
      auth.user = { id: 'teacher-a' };
      vi.useRealTimers();
    }
  });

  it('reports free for a free teacher', async () => {
    mockStatus({ has_pro: false, tier: 'free' });
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(false);
  });

  it('never unlocks Pro on a network failure and stays unresolved instead of painting the paywall', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
      vi.resetModules();
      const fresh = await import('../useTeacherPro');
      const { result } = renderHook(() => fresh.useTeacherPro());
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(result.current.hasPro).toBe(false);
      expect(result.current.known).toBe(false);
      expect(result.current.loading).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries a failed read once and resolves to the real answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
        .mockResolvedValue({ ok: true, status: 200, json: async () => ({ has_pro: true }) }) as unknown as typeof fetch;
      const { result } = renderHook(() => useTeacherPro());
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasPro).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves a signed-out (401) read to free once the retry confirms it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }) as unknown as typeof fetch;
      const { result } = renderHook(() => useTeacherPro());
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasPro).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
