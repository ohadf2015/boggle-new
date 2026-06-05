import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BlastResultsData } from '../../types';

const enqueueScore = vi.fn();
const getOfflineStore = vi.fn(async () => ({ sql: {} }));
const getSession = vi.fn();

vi.mock('@/lib/offline/scoreQueue', () => ({
  enqueueScore: (...a: unknown[]) => enqueueScore(...a),
}));
vi.mock('@/lib/offline', () => ({
  getOfflineStore: () => getOfflineStore(),
}));
vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: () => getSession() } }),
}));

import { saveBlastResult } from '../saveBlastResult';

const results = {
  finalScore: 500,
  tilesCleared: 20,
  totalTiles: 25,
  clearPercentage: 80,
  wordsFound: ['hello', 'world'],
  bestWord: 'hello',
  maxCombo: 3,
  stars: 2,
} as unknown as BlastResultsData;

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
}

describe('saveBlastResult — offline enqueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    enqueueScore.mockResolvedValue('queued-id');
  });
  afterEach(() => setOnline(true));

  it('queues the result (no network) when offline and authenticated', async () => {
    setOnline(false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const patch = await saveBlastResult(results, 'medium', 'en');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(enqueueScore).toHaveBeenCalledTimes(1);
    const [, mode, payload] = enqueueScore.mock.calls[0];
    expect(mode).toBe('blast');
    expect(payload).toMatchObject({ score: 500, difficulty: 'medium', language: 'en', stars: 2 });
    // Non-null so the UI proceeds rather than treating it as a failed save.
    expect(patch).not.toBeNull();
  });

  it('does not queue when offline but unauthenticated (no user to credit)', async () => {
    setOnline(false);
    getSession.mockResolvedValue({ data: { session: null } });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const patch = await saveBlastResult(results, 'medium', 'en');
    expect(enqueueScore).not.toHaveBeenCalled();
    expect(patch).toBeNull();
  });

  it('uses the normal fetch path when online (does not enqueue)', async () => {
    setOnline(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ percentile: 42, isNewBestScore: true }), { status: 200 }),
    );

    const patch = await saveBlastResult(results, 'medium', 'en');
    expect(enqueueScore).not.toHaveBeenCalled();
    expect(patch).toMatchObject({ percentile: 42, isNewBestScore: true });
  });
});
