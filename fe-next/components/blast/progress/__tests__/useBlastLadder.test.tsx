import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const getWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({ getWithAuth: (...a: unknown[]) => getWithAuth(...a) }));

import { useBlastLadder } from '../useBlastLadder';

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('useBlastLadder', () => {
  beforeEach(() => {
    getWithAuth.mockReset();
    window.localStorage.clear();
  });

  it('loads the personal best and the weekly rivals for the run language', async () => {
    getWithAuth.mockReturnValue(json({
      personalBests: { medium: { bestScore: 900 } },
      ladder: { rank: 4, total: 30, rivals: [{ name: 'Zoe', score: 950 }] },
    }));

    const { result } = renderHook(() => useBlastLadder({ language: 'he', difficulty: 'medium', runId: 1 }));

    await waitFor(() => expect(result.current.rivals).toHaveLength(1));
    expect(getWithAuth).toHaveBeenCalledWith('/api/blast/result?difficulty=medium&ladder=he', { requireSession: true });
    expect(result.current).toMatchObject({ personalBest: 900, rank: 4, rivals: [{ name: 'Zoe', score: 950 }] });
  });

  it('stays empty for guests (401) without throwing', async () => {
    getWithAuth.mockReturnValue(json({ error: 'Unauthorized' }, 401));
    const { result } = renderHook(() => useBlastLadder({ language: 'en', difficulty: 'medium', runId: 1 }));
    await waitFor(() => expect(getWithAuth).toHaveBeenCalled());
    expect(result.current).toEqual({ personalBest: null, rank: null, rivals: [] });
  });

  it('falls back to the on-device best for guests, with no rank', async () => {
    window.localStorage.setItem('blast:best:v1:medium', '730');
    getWithAuth.mockReturnValue(json({ error: 'Unauthorized' }, 401));
    const { result } = renderHook(() => useBlastLadder({ language: 'en', difficulty: 'medium', runId: 1 }));
    await waitFor(() => expect(result.current.personalBest).toBe(730));
    expect(result.current.rank).toBeNull();
  });

  it('prefers the server best over the on-device one when signed in', async () => {
    window.localStorage.setItem('blast:best:v1:medium', '5000');
    getWithAuth.mockReturnValue(json({ personalBests: { medium: { bestScore: 900 } }, ladder: { rank: 2, total: 9, rivals: [] } }));
    const { result } = renderHook(() => useBlastLadder({ language: 'en', difficulty: 'medium', runId: 1 }));
    await waitFor(() => expect(result.current.rank).toBe(2));
    expect(result.current.personalBest).toBe(900);
  });

  it('refetches only when a new run starts', async () => {
    getWithAuth.mockReturnValue(json({ personalBests: {}, ladder: { rank: null, total: null, rivals: [] } }));
    const { rerender } = renderHook((p: { runId: number }) => useBlastLadder({ language: 'en', difficulty: 'medium', runId: p.runId }), { initialProps: { runId: 1 } });
    rerender({ runId: 1 });
    rerender({ runId: 2 });
    await waitFor(() => expect(getWithAuth).toHaveBeenCalledTimes(2));
  });
});
