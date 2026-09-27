import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';
import { runMigrations } from '../migrations';
import { isDictLoaded, loadDictWords, validateOffline, lookupPrefix } from '../dict';

describe('dict offline word table', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `dict-${crypto.randomUUID()}` });
    await runMigrations(store);
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('reports isDictLoaded=false before load', async () => {
    expect(await isDictLoaded(store, 'en')).toBe(false);
  });

  it('inserts words and reports isDictLoaded=true after load', async () => {
    await loadDictWords(store, 'en', ['hello', 'world', 'lexiclash']);
    expect(await isDictLoaded(store, 'en')).toBe(true);
  });

  it('validateOffline returns true for inserted words and false for absent', async () => {
    await loadDictWords(store, 'en', ['hello', 'world']);
    expect(await validateOffline(store, 'hello', 'en')).toBe(true);
    expect(await validateOffline(store, 'world', 'en')).toBe(true);
    expect(await validateOffline(store, 'missing', 'en')).toBe(false);
  });

  it('validateOffline is case-insensitive', async () => {
    await loadDictWords(store, 'en', ['hello']);
    expect(await validateOffline(store, 'HELLO', 'en')).toBe(true);
    expect(await validateOffline(store, 'Hello', 'en')).toBe(true);
  });

  it('scopes membership by locale (same word in different locales is independent)', async () => {
    await loadDictWords(store, 'en', ['casa']);
    expect(await validateOffline(store, 'casa', 'en')).toBe(true);
    expect(await validateOffline(store, 'casa', 'es')).toBe(false);
  });

  it('loadDictWords is idempotent (re-running with same words does not throw or duplicate)', async () => {
    await loadDictWords(store, 'en', ['hello', 'world']);
    await loadDictWords(store, 'en', ['hello', 'world']);
    const { rows } = await store.sql.run('SELECT COUNT(*) AS c FROM dict_words WHERE locale = ?', ['en']);
    expect((rows[0] as { c: number }).c).toBe(2);
  });

  it('lookupPrefix returns words sharing the given prefix sorted ascending', async () => {
    await loadDictWords(store, 'en', ['hello', 'help', 'helmet', 'world', 'wood']);
    const matches = await lookupPrefix(store, 'hel', 'en');
    expect(matches).toEqual(['hello', 'help', 'helmet'].sort());
  });

  it('lookupPrefix is empty for a prefix with no matches', async () => {
    await loadDictWords(store, 'en', ['hello']);
    expect(await lookupPrefix(store, 'xyz', 'en')).toEqual([]);
  });
});
