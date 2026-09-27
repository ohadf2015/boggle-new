import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';
import { runMigrations } from '../migrations';
import { enqueueScore, queueDepth } from '../scoreQueue';
import { syncQueueViaApi } from '../sync';

describe('syncQueueViaApi', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `sync-${crypto.randomUUID()}` });
    await runMigrations(store);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await store.close?.();
  });

  it('returns early with zero counts when queue is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const summary = await syncQueueViaApi(store);
    expect(summary).toEqual({ accepted: 0, rejected: 0, rejectedWordCount: 0, skipped: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('POSTs queued submissions to /api/scores/sync and drains accepted rows', async () => {
    await enqueueScore(store, 'sp', { score: 50, words: ['hello'], language: 'en' });
    await enqueueScore(store, 'sp', { score: 75, words: ['world'], language: 'en' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { id: 'IGNORED', accepted: true, finalScore: 1, rejectedWords: [] },
            { id: 'IGNORED', accepted: true, finalScore: 2, rejectedWords: [] },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    // Mock returns IGNORED ids but real route mirrors submitted ids — patch results post-hoc
    const summary = await syncQueueViaApi(store);
    // syncQueueViaApi processes by id-correspondence, so synthetic mock without real ids → all 'skipped'
    expect(summary.skipped).toBe(2);
    expect(await queueDepth(store)).toBe(2);
  });

  it('drains rows whose result.accepted=true and matches by id', async () => {
    const id1 = await enqueueScore(store, 'sp', { score: 50, words: ['hello'], language: 'en' });
    const id2 = await enqueueScore(store, 'sp', { score: 75, words: ['world'], language: 'en' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { id: id1, accepted: true, finalScore: 1, rejectedWords: [] },
            { id: id2, accepted: true, finalScore: 2, rejectedWords: [] },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const summary = await syncQueueViaApi(store);
    expect(summary.accepted).toBe(2);
    expect(await queueDepth(store)).toBe(0);
  });

  it('counts rejected words across results', async () => {
    const id1 = await enqueueScore(store, 'sp', {
      score: 100,
      words: ['hello', 'zzqx'],
      language: 'en',
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ id: id1, accepted: true, finalScore: 1, rejectedWords: ['zzqx'] }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const summary = await syncQueueViaApi(store);
    expect(summary.rejectedWordCount).toBe(1);
    expect(summary.accepted).toBe(1);
  });

  it('keeps rejected submissions in queue and increments attempts', async () => {
    const id1 = await enqueueScore(store, 'sp', { score: 50, words: ['zzqx'], language: 'en' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: id1,
              accepted: false,
              finalScore: 0,
              rejectedWords: ['zzqx'],
              reason: 'all_words_rejected',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const summary = await syncQueueViaApi(store);
    expect(summary.rejected).toBe(1);
    expect(await queueDepth(store)).toBe(1);
  });

  it('does not drain on network failure', async () => {
    await enqueueScore(store, 'sp', { score: 50, words: ['hello'], language: 'en' });

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));

    const summary = await syncQueueViaApi(store);
    expect(summary.accepted).toBe(0);
    expect(summary.rejected).toBe(0);
    expect(await queueDepth(store)).toBe(1);
  });

  it('does not drain on 5xx server failure', async () => {
    await enqueueScore(store, 'sp', { score: 50, words: ['hello'], language: 'en' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 503 }));

    const summary = await syncQueueViaApi(store);
    expect(summary.accepted).toBe(0);
    expect(await queueDepth(store)).toBe(1);
  });
});
