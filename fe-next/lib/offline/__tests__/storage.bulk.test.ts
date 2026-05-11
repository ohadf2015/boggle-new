import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';

describe('WebStore.sql.runBulk', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `bulk-${crypto.randomUUID()}` });
    await store.sql.run('CREATE TABLE bulk_t (id INTEGER PRIMARY KEY, name TEXT)');
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('inserts all rows when given an array of parameter tuples', async () => {
    await store.sql.runBulk('INSERT INTO bulk_t(id, name) VALUES (?, ?)', [
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
    ]);
    const { rows } = await store.sql.run('SELECT name FROM bulk_t ORDER BY id ASC');
    expect(rows).toEqual([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
  });

  it('is a no-op when params array is empty', async () => {
    await store.sql.runBulk('INSERT INTO bulk_t(id, name) VALUES (?, ?)', []);
    const { rows } = await store.sql.run('SELECT COUNT(*) AS c FROM bulk_t');
    expect((rows[0] as { c: number }).c).toBe(0);
  });

  it('persists across store close + reopen (snapshot fires once at end)', async () => {
    await store.sql.runBulk('INSERT INTO bulk_t(id, name) VALUES (?, ?)', [
      [1, 'persistent-a'],
      [2, 'persistent-b'],
    ]);
    const dbName = `bulk-persist-${crypto.randomUUID()}`;
    const a = await createWebStore({ dbName });
    await a.sql.run('CREATE TABLE bulk_t (id INTEGER PRIMARY KEY, name TEXT)');
    await a.sql.runBulk('INSERT INTO bulk_t(id, name) VALUES (?, ?)', [
      [1, 'persistent-a'],
      [2, 'persistent-b'],
    ]);
    await a.close?.();

    const b = await createWebStore({ dbName });
    const { rows } = await b.sql.run('SELECT name FROM bulk_t ORDER BY id ASC');
    expect(rows).toEqual([{ name: 'persistent-a' }, { name: 'persistent-b' }]);
    await b.close?.();
  });

  it('handles 1000 rows in a reasonable time (smoke benchmark)', async () => {
    const rows: unknown[][] = Array.from({ length: 1000 }, (_, i) => [i, `item-${i}`]);
    const start = performance.now();
    await store.sql.runBulk('INSERT INTO bulk_t(id, name) VALUES (?, ?)', rows);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
    const { rows: count } = await store.sql.run('SELECT COUNT(*) AS c FROM bulk_t');
    expect((count[0] as { c: number }).c).toBe(1000);
  });
});
