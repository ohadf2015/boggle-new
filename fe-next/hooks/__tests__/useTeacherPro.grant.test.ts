import { renderHook, waitFor } from '@testing-library/react';
import { useTeacherPro } from '../useTeacherPro';

/**
 * The hook now carries WHERE Pro came from and until WHEN, so the dashboard can
 * say "gifted until …" and show the one-time celebration. The original contract
 * (hasPro false + loading true until the answer, fail-closed) is unchanged.
 */
describe('useTeacherPro — grant details', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; vi.restoreAllMocks(); });

  it('exposes source, period end and the grant record', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        has_pro: true, source: 'admin_grant', current_period_end: '2027-09-05T00:00:00Z',
        grant: { id: 'g1', expires_at: '2027-09-05T00:00:00Z', days: 365, note: 'hi', welcomed: false },
      }),
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(true);
    expect(result.current.source).toBe('admin_grant');
    expect(result.current.periodEnd).toBe('2027-09-05T00:00:00Z');
    expect(result.current.grant?.welcomed).toBe(false);
  });

  it('defaults to a provider source with no grant', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ has_pro: false }) }) as unknown as typeof fetch;
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.source).toBe('polar');
    expect(result.current.grant).toBeNull();
    expect(result.current.grantExpired).toBe(false);
  });

  it('refresh() re-reads the entitlement', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ has_pro: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ has_pro: true, source: 'admin_grant' }) });
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useTeacherPro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(false);
    await result.current.refresh();
    await waitFor(() => expect(result.current.hasPro).toBe(true));
  });
});
