import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useTeacherLiveGameRunning } from '../useTeacherLiveGameRunning';

const fetchMock = vi.fn();

function answer(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('useTeacherLiveGameRunning', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('given the teacher has no classrooms, when disabled, then it never asks and stays false', () => {
    const { result } = renderHook(() => useTeacherLiveGameRunning(false));
    expect(result.current).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('given a live game in one classroom, when the read lands, then running is true', async () => {
    answer({ live: true });
    const { result } = renderHook(() => useTeacherLiveGameRunning(true));
    await waitFor(() => expect(result.current).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith('/api/education/classroom/live-status', expect.anything());
  });

  it('given no live game, when the read lands, then running is false', async () => {
    answer({ live: false });
    const { result } = renderHook(() => useTeacherLiveGameRunning(true));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('given a signed-out answer, when the read lands, then running is false (no offer suppression without evidence)', async () => {
    answer({ error: 'Unauthorized' }, 401);
    const { result } = renderHook(() => useTeacherLiveGameRunning(true));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('given the read fails, when it rejects, then the last answer stands (fail open)', async () => {
    answer({ live: true });
    const { result } = renderHook(() => useTeacherLiveGameRunning(true));
    await waitFor(() => expect(result.current).toBe(true));
    fetchMock.mockRejectedValue(new Error('network'));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(result.current).toBe(true);
  });
});
