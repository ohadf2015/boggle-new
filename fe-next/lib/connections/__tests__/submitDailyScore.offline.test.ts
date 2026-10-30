import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const enqueueScore = vi.fn();
const getOfflineStore = vi.fn(async () => ({ sql: {} }));
const getSession = vi.fn();

vi.mock('@/lib/offline/scoreQueue', () => ({ enqueueScore: (...a: unknown[]) => enqueueScore(...a) }));
vi.mock('@/lib/offline', () => ({ getOfflineStore: () => getOfflineStore() }));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: () => getSession() } }),
}));

import { submitDailyScore, type SubmitPayload } from '../dailyClient';

const payload: SubmitPayload = {
  puzzleDate: '2026-06-05',
  language: 'en',
  displayName: 'Ada',
  score: 500,
  timeTakenSeconds: 42,
  puzzlesSolved: 3,
};

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
}

describe('submitDailyScore — offline enqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    enqueueScore.mockResolvedValue('queued-id');
  });
  afterEach(() => setOnline(true));

  it('queues the result (no network) when offline and authenticated', async () => {
    setOnline(false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const res = await submitDailyScore(payload);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(enqueueScore).toHaveBeenCalledTimes(1);
    const [, mode, queued] = enqueueScore.mock.calls[0];
    expect(mode).toBe('connections');
    expect(queued).toMatchObject({ puzzleDate: '2026-06-05', score: 500, language: 'en' });
    expect(res).toEqual({ status: 'queued' });
  });

  it('does not queue when offline but unauthenticated (guest — no session)', async () => {
    setOnline(false);
    getSession.mockResolvedValue({ data: { session: null } });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const res = await submitDailyScore(payload);
    expect(enqueueScore).not.toHaveBeenCalled();
    expect(res).toEqual({ status: 'failed', retryable: true });
  });

  it('uses the normal fetch path when online (does not enqueue)', async () => {
    setOnline(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, streak: 2, score: 500, currentRank: 3, totalPlayers: 9 }), { status: 200 }),
    );

    const res = await submitDailyScore(payload);
    expect(enqueueScore).not.toHaveBeenCalled();
    expect(res).toMatchObject({ status: 'saved', result: { currentRank: 3, totalPlayers: 9 } });
  });

  it('a server rejection is final; a server error is worth retrying', async () => {
    setOnline(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 400 }));
    expect(await submitDailyScore(payload)).toEqual({ status: 'failed', retryable: false });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 503 }));
    expect(await submitDailyScore(payload)).toEqual({ status: 'failed', retryable: true });
  });
});
