import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

import { getOfflineStore, __resetOfflineStore } from '../index';

describe('offline store singleton', () => {
  beforeEach(async () => {
    await __resetOfflineStore();
  });

  afterEach(async () => {
    await __resetOfflineStore();
  });

  it('returns the same instance on subsequent calls', async () => {
    const a = await getOfflineStore();
    const b = await getOfflineStore();
    expect(a).toBe(b);
  });

  it('runs migrations on first creation so SQL tables exist', async () => {
    const store = await getOfflineStore();
    const { rows } = await store.sql.run(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='dict_words'",
    );
    expect(rows).toEqual([{ name: 'dict_words' }]);
  });

  it('reset clears the singleton so the next call returns a fresh instance', async () => {
    const first = await getOfflineStore();
    await __resetOfflineStore();
    const second = await getOfflineStore();
    expect(second).not.toBe(first);
  });

  it('schema version is persisted after first init', async () => {
    const store = await getOfflineStore();
    expect(await store.kv.get('offline_schema_version')).toBe('1');
  });
});
