/**
 * @vitest-environment happy-dom
 *
 * The classroom-detection fetch is load-bearing for navigation: a student who
 * typed a classroom code into the arcade lobby has no `?classroom=true`, so the
 * room's live record is the ONLY signal that their exits must stay in
 * education. Two failure shapes must never read as "arcade":
 *  - a fetch still in flight (status 'loading' → context 'pending')
 *  - a 429 from the shared rate-limit bucket (retried with backoff; only a
 *    definitive answer resolves the status)
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useClassroomLiveGame, useLiveClassroomGameInfo } from '../useLiveClassroomGameInfo';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const CLASSROOM_RECORD = {
  gameCode: 'ABC123',
  classroomId: 'cls-1',
  classroomName: 'Grade 5',
  lessonNames: ['Animals'],
  gameMode: 'classic',
  settings: { timerMinutes: null, boardSize: null, allowLateJoin: true, vocabQuizQuestionCount: null, vocabQuizSeconds: null },
};

describe('useClassroomLiveGame', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolves found with the record on a 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, CLASSROOM_RECORD)));
    const { result } = renderHook(() => useClassroomLiveGame('ABC123', true));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(result.current.info?.classroomName).toBe('Grade 5');
  });

  it('resolves absent on a 404 (ordinary arcade room)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, { error: 'no' })));
    const { result } = renderHook(() => useClassroomLiveGame('ZZZ999', true));
    await waitFor(() => expect(result.current.status).toBe('absent'));
    expect(result.current.info).toBeNull();
  });

  it('stays loading through a 429 and retries until a definitive answer', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(429, { error: 'Too many requests' }))
      .mockResolvedValueOnce(jsonResponse(200, CLASSROOM_RECORD));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useClassroomLiveGame('ABC123', true));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current.status).toBe('loading');
    await act(async () => { vi.advanceTimersByTime(2000); });
    await waitFor(() => expect(result.current.status).toBe('found'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resolves error, never absent, when every attempt is rate limited', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(429, { error: 'Too many requests' }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useClassroomLiveGame('ABC123', true));
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.status).not.toBe('absent');
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it('stays idle without a usable code or when disabled', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { result: noCode } = renderHook(() => useClassroomLiveGame(undefined, true));
    expect(noCode.current.status).toBe('idle');
    const { result: disabled } = renderHook(() => useClassroomLiveGame('ABC123', false));
    expect(disabled.current.status).toBe('idle');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('useLiveClassroomGameInfo (compat wrapper)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('still returns the record or null, no status shape change', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, CLASSROOM_RECORD)));
    const { result } = renderHook(() => useLiveClassroomGameInfo('ABC123', true));
    await waitFor(() => expect(result.current?.classroomName).toBe('Grade 5'));
  });
});
