import { renderHook, waitFor, act } from '@testing-library/react';
import { useOverviewPulse } from '../useOverviewPulse';

const DAY = 86_400_000;
const day = (daysAgo: number, games: number) => ({
  date: new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10),
  games, guestGames: 0, totalGames: games, uniquePlayers: 5, uniqueGuests: 0, totalUniquePlayers: 5,
});
const DAILY = Array.from({ length: 60 }, (_, i) => day(59 - i, 10));
const ok = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const bad = () => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });

function mockFetch(overrides: Record<string, () => Promise<unknown>> = {}) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    const hit = Object.keys(overrides).find((k) => url.includes(k));
    if (hit) return overrides[hit]();
    if (url.includes('/activity/daily')) return ok({ daily: DAILY });
    if (url.includes('/signup-growth')) return ok({ growth: [] });
    if (url.includes('/analytics/revenue')) return ok({ revenue: { paying: 1, trialing: 0, pastDue: 0, checkoutsStarted30d: 0, paidOrders30d: 1 } });
    if (url.includes('/notifications')) return ok({ items: [{ kind: 'user_report', read_at: null }, { kind: 'user_report', read_at: 'x' }, { kind: 'pro_paid', read_at: null }] });
    return bad();
  }) as unknown as typeof fetch;
}

afterEach(() => vi.restoreAllMocks());

describe('useOverviewPulse', () => {
  it('does nothing without a token', () => {
    mockFetch();
    const { result } = renderHook(() => useOverviewPulse(null, null, null));
    expect(result.current.pulse).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('builds the pulse from the four feeds and counts only unread user reports', async () => {
    mockFetch();
    const { result } = renderHook(() => useOverviewPulse('tok', null, null));
    await waitFor(() => expect(result.current.pulse).not.toBeNull());
    expect(result.current.pulse!.games.current).toBe(70);
    expect(result.current.pulse!.findings.find((f) => f.id === 'reports_waiting')?.params.count).toBe(1);
    expect(result.current.pulse!.findings.some((f) => f.id === 'revenue_flowing')).toBe(true);
  });

  it('switching the window recomputes from the same data without refetching', async () => {
    mockFetch();
    const { result } = renderHook(() => useOverviewPulse('tok', null, null));
    await waitFor(() => expect(result.current.pulse).not.toBeNull());
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => result.current.setWindowDays(30));
    expect(result.current.pulse!.games.current).toBe(300);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls);
  });

  it('keeps working when one feed fails, and reports failure only when all three data feeds do', async () => {
    mockFetch({ '/analytics/revenue': bad });
    const { result } = renderHook(() => useOverviewPulse('tok', null, null));
    await waitFor(() => expect(result.current.pulse).not.toBeNull());
    expect(result.current.failed).toBe(false);

    mockFetch({ '/activity/daily': bad, '/signup-growth': bad, '/analytics/revenue': bad });
    const down = renderHook(() => useOverviewPulse('tok', null, null));
    await waitFor(() => expect(down.result.current.failed).toBe(true));
    expect(down.result.current.pulse).toBeNull();
  });
});
