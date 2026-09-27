import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';
import { runMigrations } from '../migrations';
import { enqueueScore, flushQueue, peekQueue, queueDepth } from '../scoreQueue';

describe('offline score queue', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `q-${crypto.randomUUID()}` });
    await runMigrations(store);
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('starts empty', async () => {
    expect(await queueDepth(store)).toBe(0);
    expect(await peekQueue(store)).toEqual([]);
  });

  it('enqueue returns a UUID submissionId and persists the row', async () => {
    const id = await enqueueScore(store, 'sp', { score: 412, words: ['HELLO'] });
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await queueDepth(store)).toBe(1);
    const rows = await peekQueue(store);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id,
      mode: 'sp',
      attempts: 0,
    });
    expect(rows[0].payload).toEqual({ score: 412, words: ['HELLO'] });
  });

  it('flushQueue calls the submit fn once per row in FIFO order', async () => {
    await enqueueScore(store, 'sp', { score: 100 });
    await enqueueScore(store, 'wotd', { score: 200 });
    const submit = vi.fn(async () => ({ accepted: true }));
    await flushQueue(store, submit);
    expect(submit).toHaveBeenCalledTimes(2);
    expect((submit.mock.calls[0][0] as { mode: string }).mode).toBe('sp');
    expect((submit.mock.calls[1][0] as { mode: string }).mode).toBe('wotd');
  });

  it('removes accepted rows from the queue', async () => {
    await enqueueScore(store, 'sp', { score: 100 });
    await enqueueScore(store, 'sp', { score: 200 });
    await flushQueue(store, async () => ({ accepted: true }));
    expect(await queueDepth(store)).toBe(0);
  });

  it('keeps rejected rows and increments attempts', async () => {
    await enqueueScore(store, 'sp', { score: 100 });
    await flushQueue(store, async () => ({ accepted: false, error: 'network' }));
    expect(await queueDepth(store)).toBe(1);
    const rows = await peekQueue(store);
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].last_error).toBe('network');
  });

  it('idempotent: second flush with same row preserves submissionId in submit fn arg', async () => {
    const id = await enqueueScore(store, 'sp', { score: 100 });
    const submit = vi.fn(async () => ({ accepted: false, error: 'net' }));
    await flushQueue(store, submit);
    await flushQueue(store, submit);
    expect(submit).toHaveBeenCalledTimes(2);
    const firstCallArg = submit.mock.calls[0][0] as { id: string };
    const secondCallArg = submit.mock.calls[1][0] as { id: string };
    expect(firstCallArg.id).toBe(id);
    expect(secondCallArg.id).toBe(id);
  });

  it('stops flushing after stopAtError=true on first rejection', async () => {
    await enqueueScore(store, 'sp', { score: 100 });
    await enqueueScore(store, 'sp', { score: 200 });
    const submit = vi.fn(async () => ({ accepted: false, error: 'net' }));
    await flushQueue(store, submit, { stopAtError: true });
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
