import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../migrations';

describe('runMigrations', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `mig-${crypto.randomUUID()}` });
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('sets schema version to current after first run', async () => {
    await runMigrations(store);
    const v = await store.kv.get('offline_schema_version');
    expect(v).toBe(String(CURRENT_SCHEMA_VERSION));
  });

  it('creates required tables on first run', async () => {
    await runMigrations(store);
    const tableNames = ['dict_words', 'score_queue', 'daily_puzzles_cache', 'kv_meta'];
    for (const t of tableNames) {
      const { rows } = await store.sql.run(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        [t],
      );
      expect(rows).toEqual([{ name: t }]);
    }
  });

  it('is idempotent: running twice produces the same state', async () => {
    await runMigrations(store);
    await store.sql.run("INSERT INTO kv_meta VALUES ('k1', 'v1')");

    await runMigrations(store);

    const { rows } = await store.sql.run('SELECT * FROM kv_meta');
    expect(rows).toEqual([{ key: 'k1', value: 'v1' }]);
    expect(await store.kv.get('offline_schema_version')).toBe(String(CURRENT_SCHEMA_VERSION));
  });

  it('dict_words has a composite (locale, word) index for prefix queries', async () => {
    await runMigrations(store);
    const { rows } = await store.sql.run(
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='dict_words'",
    );
    const names = rows.map((r) => r.name);
    expect(names.some((n) => typeof n === 'string' && n.includes('locale'))).toBe(true);
  });
});
