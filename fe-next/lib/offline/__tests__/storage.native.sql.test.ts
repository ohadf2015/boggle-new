import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const memPrefs = new Map<string, string>();
const mockRun = vi.fn(async () => ({ changes: { changes: 1 } }));
const mockQuery = vi.fn(async () => ({ values: [] as Record<string, unknown>[] }));
const mockOpen = vi.fn(async () => undefined);
const mockClose = vi.fn(async () => undefined);
const mockCreateConnection = vi.fn(async () => ({
  open: mockOpen,
  close: mockClose,
  run: mockRun,
  query: mockQuery,
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: memPrefs.has(key) ? memPrefs.get(key)! : null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      memPrefs.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      memPrefs.delete(key);
    }),
  },
}));

vi.mock('@capacitor-community/sqlite', () => {
  class SQLiteConnection {
    createConnection = mockCreateConnection;
    closeConnection = vi.fn(async () => undefined);
  }
  return {
    CapacitorSQLite: {},
    SQLiteConnection,
  };
});

import { createNativeStore, type OfflineStore } from '../storage';

describe('NativeStore.sql', () => {
  let store: OfflineStore;

  beforeEach(async () => {
    memPrefs.clear();
    mockRun.mockClear();
    mockQuery.mockClear();
    mockOpen.mockClear();
    mockClose.mockClear();
    mockCreateConnection.mockClear();
    store = await createNativeStore();
  });

  afterEach(async () => {
    await store.close?.();
  });

  it('opens a connection on first SQL call (lazy)', async () => {
    expect(mockCreateConnection).not.toHaveBeenCalled();
    await store.sql.run('CREATE TABLE t (x INTEGER)');
    expect(mockCreateConnection).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it('reuses the connection across calls', async () => {
    await store.sql.run('CREATE TABLE t (x INTEGER)');
    await store.sql.run('INSERT INTO t VALUES (?)', [1]);
    await store.sql.run('SELECT * FROM t');
    expect(mockCreateConnection).toHaveBeenCalledTimes(1);
  });

  it('routes mutations to db.run with the statement and params', async () => {
    await store.sql.run('INSERT INTO words VALUES (?, ?)', ['hello', 'en']);
    expect(mockRun).toHaveBeenCalledWith('INSERT INTO words VALUES (?, ?)', ['hello', 'en']);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('routes SELECT statements to db.query', async () => {
    mockQuery.mockResolvedValueOnce({ values: [{ id: 1, name: 'lexi' }] });
    const result = await store.sql.run('SELECT * FROM t WHERE id = ?', [1]);
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM t WHERE id = ?', [1]);
    expect(result.rows).toEqual([{ id: 1, name: 'lexi' }]);
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('returns empty rows array for mutation statements (run() returns changes only)', async () => {
    const result = await store.sql.run('INSERT INTO t VALUES (?)', [1]);
    expect(result.rows).toEqual([]);
  });

  it('closes the connection on store.close()', async () => {
    await store.sql.run('CREATE TABLE t (x INTEGER)');
    await store.close?.();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
