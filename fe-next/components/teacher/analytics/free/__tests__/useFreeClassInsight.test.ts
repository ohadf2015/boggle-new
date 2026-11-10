import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: vi.fn() }));

import { fetchWithAuth } from '@/utils/authFetch';
import { useFreeClassInsight } from '../useFreeClassInsight';

const free = { pulse: { needsHelp: [], counts: { needsHelp: 0, inactive: 0, notStarted: 0, steady: 0, thriving: 0 }, totalStudents: 0 }, hardestWords: [], sessionsThisWeek: 0 };
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as Response;

beforeEach(() => vi.clearAllMocks());

describe('useFreeClassInsight', () => {
  it('given the server sends the free slice, when loaded, then the insight is ready', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(reply(200, { ok: true, scope: 'free', free }));
    const { result } = renderHook(() => useFreeClassInsight('c1', true));
    await waitFor(() => expect(result.current.kind).toBe('free'));
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/education/classroom/c1/analytics');
    expect(result.current.kind === 'free' && result.current.insight).toEqual(free);
  });

  it('given the class is not the free one (402), when loaded, then it is locked, not an error', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(reply(402, { ok: false, error: 'Teacher Pro required' }));
    const { result } = renderHook(() => useFreeClassInsight('c2', true));
    await waitFor(() => expect(result.current.kind).toBe('locked'));
  });

  it('given the read fails, when loaded, then it is an error the page can retry', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce(reply(500, { ok: false })).mockResolvedValueOnce(reply(200, { ok: true, scope: 'free', free }));
    const { result } = renderHook(() => useFreeClassInsight('c1', true));
    await waitFor(() => expect(result.current.kind).toBe('error'));
    await act(async () => { await result.current.retry(); });
    expect(result.current.kind).toBe('free');
  });

  it('given a 200 without the free slice (a Pro answer), when loaded, then it is not shown as free', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue(reply(200, { ok: true, metrics: {} }));
    const { result } = renderHook(() => useFreeClassInsight('c1', true));
    await waitFor(() => expect(result.current.kind).toBe('locked'));
  });

  it('given it is disabled (Pro or still checking), when mounted, then nothing is fetched', () => {
    const { result } = renderHook(() => useFreeClassInsight('c1', false));
    expect(result.current.kind).toBe('idle');
    expect(fetchWithAuth).not.toHaveBeenCalled();
  });
});
