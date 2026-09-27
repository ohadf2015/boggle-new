import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';

describe('WebStore.kv', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `test-offline-${crypto.randomUUID()}` });
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('returns null for unset key', async () => {
    const got = await store.kv.get('missing');
    expect(got).toBeNull();
  });

  it('round-trips a string value via set + get', async () => {
    await store.kv.set('greeting', 'hello');
    const got = await store.kv.get('greeting');
    expect(got).toBe('hello');
  });

  it('overwrites a prior value on second set', async () => {
    await store.kv.set('mode', 'practice');
    await store.kv.set('mode', 'multiplayer');
    expect(await store.kv.get('mode')).toBe('multiplayer');
  });

  it('removes a key via del', async () => {
    await store.kv.set('temp', '1');
    await store.kv.del('temp');
    expect(await store.kv.get('temp')).toBeNull();
  });

  it('isolates values across keys', async () => {
    await store.kv.set('a', '1');
    await store.kv.set('b', '2');
    expect(await store.kv.get('a')).toBe('1');
    expect(await store.kv.get('b')).toBe('2');
  });

  it('survives within a session: a second open of the same dbName reads prior writes', async () => {
    const dbName = `persist-${crypto.randomUUID()}`;
    const first = await createWebStore({ dbName });
    await first.kv.set('persistent', 'yes');
    await first.close?.();

    const second = await createWebStore({ dbName });
    expect(await second.kv.get('persistent')).toBe('yes');
    await second.close?.();
  });
});
