import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';
import { runMigrations } from '../migrations';
import { prefetchDailyPuzzles, getCachedDailyPuzzle } from '../prefetchDaily';

const SIX_HOURS_MS = 6 * 3600_000;
const MOCK_PUZZLE = { grid: [['A', 'B'], ['C', 'D']], targetWord: 'TEST' };

function mockFetchWith(puzzles: object[]) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ puzzles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('prefetchDailyPuzzles', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `prefetch-${crypto.randomUUID()}` });
    await runMigrations(store);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await store.close?.();
  });

  it('fetches and stores puzzles on first call', async () => {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().slice(0, 10);
    const validUntil = now + 86400_000;
    const fetchMock = mockFetchWith([
      { date: todayStr, language: 'en', mode: 'wordhunt', payload: MOCK_PUZZLE, validUntil },
    ]);

    const result = await prefetchDailyPuzzles({
      language: 'en',
      store,
      _fetchFn: fetchMock,
      _nowMs: () => now,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.stored).toBe(1);
    expect(result.skipped).toBe(false);

    const cached = await getCachedDailyPuzzle(store, todayStr, 'en', 'wordhunt', now);
    expect(cached).toEqual(MOCK_PUZZLE);
  });

  it('skips fetch if called within 6 hours of last prefetch', async () => {
    const now = Date.now();
    await store.kv.set('prefetch_last_en', String(now - SIX_HOURS_MS + 1000));

    const fetchMock = vi.fn();
    const result = await prefetchDailyPuzzles({
      language: 'en',
      store,
      _fetchFn: fetchMock,
      _nowMs: () => now,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.stored).toBe(0);
  });

  it('re-fetches when exactly 6 hours have elapsed', async () => {
    const now = Date.now();
    await store.kv.set('prefetch_last_en', String(now - SIX_HOURS_MS));

    const fetchMock = mockFetchWith([]);
    await prefetchDailyPuzzles({ language: 'en', store, _fetchFn: fetchMock, _nowMs: () => now });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('includes tomorrow in request when local hour >= 22', async () => {
    const d = new Date();
    d.setHours(22, 30, 0, 0);
    const nowMs = d.getTime();
    const tomorrow = new Date(nowMs);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const fetchMock = mockFetchWith([]);
    await prefetchDailyPuzzles({ language: 'en', store, _fetchFn: fetchMock, _nowMs: () => nowMs });

    const callUrl = (fetchMock.mock.calls[0] as unknown[])[0] as string;
    expect(callUrl).toContain(tomorrowStr);
  });

  it('does not include tomorrow when local hour < 22', async () => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const nowMs = d.getTime();
    const tomorrow = new Date(nowMs);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const fetchMock = mockFetchWith([]);
    await prefetchDailyPuzzles({ language: 'en', store, _fetchFn: fetchMock, _nowMs: () => nowMs });

    const callUrl = (fetchMock.mock.calls[0] as unknown[])[0] as string;
    expect(callUrl).not.toContain(tomorrowStr);
  });

  it('updates last-prefetch timestamp after successful fetch', async () => {
    const now = Date.now();
    const fetchMock = mockFetchWith([]);
    await prefetchDailyPuzzles({ language: 'en', store, _fetchFn: fetchMock, _nowMs: () => now });

    const stored = await store.kv.get('prefetch_last_en');
    expect(stored).toBe(String(now));
  });

  it('does not update timestamp when network throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network'));
    await prefetchDailyPuzzles({ language: 'en', store, _fetchFn: fetchMock });

    expect(await store.kv.get('prefetch_last_en')).toBeNull();
  });

  it('does not update timestamp on non-ok server response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('error', { status: 500 }));
    await prefetchDailyPuzzles({ language: 'en', store, _fetchFn: fetchMock });

    expect(await store.kv.get('prefetch_last_en')).toBeNull();
  });

  it('purges rows older than 7 days when prefetch runs', async () => {
    const now = Date.now();
    const staleDate = new Date(now - 8 * 24 * 3600_000).toISOString().slice(0, 10);
    await store.sql.run(
      'INSERT INTO daily_puzzles_cache(date, language, mode, payload, valid_until) VALUES (?, ?, ?, ?, ?)',
      [staleDate, 'en', 'wordhunt', '{}', now - 1000],
    );

    await prefetchDailyPuzzles({
      language: 'en',
      store,
      _fetchFn: mockFetchWith([]),
      _nowMs: () => now,
    });

    const { rows } = await store.sql.run(
      'SELECT COUNT(*) as c FROM daily_puzzles_cache WHERE date = ?',
      [staleDate],
    );
    expect((rows[0] as { c: number }).c).toBe(0);
  });

  it('stores multiple puzzles from a single response', async () => {
    const now = Date.now();
    const d1 = new Date(now).toISOString().slice(0, 10);
    const d2 = new Date(now + 86400_000).toISOString().slice(0, 10);

    const result = await prefetchDailyPuzzles({
      language: 'en',
      store,
      _fetchFn: mockFetchWith([
        { date: d1, language: 'en', mode: 'wordhunt', payload: MOCK_PUZZLE, validUntil: now + 86400_000 },
        { date: d2, language: 'en', mode: 'wordhunt', payload: MOCK_PUZZLE, validUntil: now + 2 * 86400_000 },
      ]),
      _nowMs: () => now,
    });

    expect(result.stored).toBe(2);
    expect(await getCachedDailyPuzzle(store, d1, 'en', 'wordhunt', now)).toEqual(MOCK_PUZZLE);
    expect(await getCachedDailyPuzzle(store, d2, 'en', 'wordhunt', now)).toEqual(MOCK_PUZZLE);
  });
});

describe('getCachedDailyPuzzle', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `getcache-${crypto.randomUUID()}` });
    await runMigrations(store);
  });

  afterEach(async () => { await store.close?.(); });

  it('returns null when no row exists', async () => {
    expect(await getCachedDailyPuzzle(store, '2026-05-12', 'en', 'wordhunt')).toBeNull();
  });

  it('returns null when row is expired', async () => {
    const now = Date.now();
    await store.sql.run(
      'INSERT INTO daily_puzzles_cache(date, language, mode, payload, valid_until) VALUES (?, ?, ?, ?, ?)',
      ['2026-05-12', 'en', 'wordhunt', JSON.stringify(MOCK_PUZZLE), now - 1],
    );
    expect(await getCachedDailyPuzzle(store, '2026-05-12', 'en', 'wordhunt', now)).toBeNull();
  });

  it('returns parsed payload for a valid unexpired row', async () => {
    const now = Date.now();
    await store.sql.run(
      'INSERT INTO daily_puzzles_cache(date, language, mode, payload, valid_until) VALUES (?, ?, ?, ?, ?)',
      ['2026-05-12', 'en', 'wordhunt', JSON.stringify(MOCK_PUZZLE), now + 86400_000],
    );
    expect(await getCachedDailyPuzzle(store, '2026-05-12', 'en', 'wordhunt', now)).toEqual(MOCK_PUZZLE);
  });
});
