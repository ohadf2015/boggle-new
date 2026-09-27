import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createWebStore, type OfflineStore } from '../storage';

describe('WebStore.sql', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    store = await createWebStore({ dbName: `sql-${crypto.randomUUID()}` });
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('runs CREATE TABLE then returns empty rows on SELECT', async () => {
    await store.sql.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
    const result = await store.sql.run('SELECT * FROM t');
    expect(result.rows).toEqual([]);
  });

  it('INSERTs and SELECTs back a single row as object keyed by column', async () => {
    await store.sql.run('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
    await store.sql.run('INSERT INTO t (id, name) VALUES (1, ?)', ['lexi']);
    const { rows } = await store.sql.run('SELECT * FROM t WHERE id = ?', [1]);
    expect(rows).toEqual([{ id: 1, name: 'lexi' }]);
  });

  it('returns multiple rows in insertion order', async () => {
    await store.sql.run('CREATE TABLE t (id INTEGER, word TEXT)');
    await store.sql.run('INSERT INTO t VALUES (1, ?)', ['alpha']);
    await store.sql.run('INSERT INTO t VALUES (2, ?)', ['beta']);
    await store.sql.run('INSERT INTO t VALUES (3, ?)', ['gamma']);
    const { rows } = await store.sql.run('SELECT word FROM t ORDER BY id ASC');
    expect(rows).toEqual([{ word: 'alpha' }, { word: 'beta' }, { word: 'gamma' }]);
  });

  it('supports indexed prefix lookup via range query (dict prefix path)', async () => {
    await store.sql.run('CREATE TABLE words (word TEXT, locale TEXT)');
    await store.sql.run('CREATE INDEX idx_words ON words(locale, word)');
    await store.sql.run('INSERT INTO words VALUES (?, ?)', ['hello', 'en']);
    await store.sql.run('INSERT INTO words VALUES (?, ?)', ['help', 'en']);
    await store.sql.run('INSERT INTO words VALUES (?, ?)', ['world', 'en']);
    const { rows } = await store.sql.run(
      'SELECT word FROM words WHERE locale = ? AND word >= ? AND word < ? ORDER BY word',
      ['en', 'hel', 'hem'],
    );
    expect(rows).toEqual([{ word: 'hello' }, { word: 'help' }]);
  });

  it('persists data across store reopen via IndexedDB snapshot', async () => {
    const dbName = `persist-sql-${crypto.randomUUID()}`;
    const first = await createWebStore({ dbName });
    await first.sql.run('CREATE TABLE notes (msg TEXT)');
    await first.sql.run('INSERT INTO notes VALUES (?)', ['remember me']);
    await first.close?.();

    const second = await createWebStore({ dbName });
    const { rows } = await second.sql.run('SELECT msg FROM notes');
    expect(rows).toEqual([{ msg: 'remember me' }]);
    await second.close?.();
  });
});
