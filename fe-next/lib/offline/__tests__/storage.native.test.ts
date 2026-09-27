import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const memStore = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: memStore.has(key) ? memStore.get(key)! : null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      memStore.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      memStore.delete(key);
    }),
  },
}));

import { createNativeStore, type OfflineStore } from '../storage';

describe('NativeStore.kv', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    memStore.clear();
    store = await createNativeStore();
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('returns null for unset key', async () => {
    expect(await store.kv.get('missing')).toBeNull();
  });

  it('round-trips a value via set + get', async () => {
    await store.kv.set('mode', 'offline');
    expect(await store.kv.get('mode')).toBe('offline');
  });

  it('overwrites on second set', async () => {
    await store.kv.set('x', '1');
    await store.kv.set('x', '2');
    expect(await store.kv.get('x')).toBe('2');
  });

  it('removes via del', async () => {
    await store.kv.set('temp', 'v');
    await store.kv.del('temp');
    expect(await store.kv.get('temp')).toBeNull();
  });

  it('namespaces all keys under a fixed prefix to avoid collision with other Preferences callers', async () => {
    const { Preferences } = await import('@capacitor/preferences');
    await store.kv.set('foo', 'bar');
    const calls = vi.mocked(Preferences.set).mock.calls;
    const setCall = calls[calls.length - 1][0] as { key: string; value: string };
    expect(setCall.key).toMatch(/^offline\./);
    expect(setCall.key).toContain('foo');
  });
});
