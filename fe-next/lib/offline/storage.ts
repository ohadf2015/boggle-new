import { openDB, type IDBPDatabase } from 'idb';
import { Preferences } from '@capacitor/preferences';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

export interface OfflineKV {
  get(key: string): Promise<string | null>;
  set(key: string, val: string): Promise<void>;
  del(key: string): Promise<void>;
}

export interface OfflineSQL {
  run(stmt: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  runBulk(stmt: string, paramsArray: unknown[][]): Promise<void>;
}

export interface OfflineStore {
  kv: OfflineKV;
  sql: OfflineSQL;
  close?(): Promise<void>;
}

interface WebStoreOptions {
  dbName: string;
}

const KV_STORE = 'kv';
const BLOB_STORE = 'blobs';
const SQL_BLOB_KEY = 'sqlite-snapshot';
const SCHEMA_VERSION = 1;
const NATIVE_KEY_PREFIX = 'offline.';

let sqlJsModule: SqlJsStatic | null = null;
async function getSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsModule) return sqlJsModule;
  const isNode = typeof process !== 'undefined' && !!process.versions?.node;
  if (isNode) {
    // Node-only branch (SSR / tests) — reads the sql.js WASM from disk. Dead in the
    // browser (gated by isNode). The ignore comments stop bundlers from trying to
    // resolve the node: builtins into the client graph (webpack errors on the
    // node: scheme; turbopack stubs it). Keeps a webpack prod build buildable.
    const { readFileSync } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'node:fs');
    const { fileURLToPath } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'node:url');
    const pathMod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'node:path');
    const here = pathMod.dirname(fileURLToPath(import.meta.url));
    const wasmPath = pathMod.resolve(here, '../../node_modules/sql.js/dist/sql-wasm.wasm');
    const fileBuffer = readFileSync(wasmPath);
    const wasmBinary = new Uint8Array(fileBuffer).buffer;
    sqlJsModule = await initSqlJs({ wasmBinary });
  } else {
    sqlJsModule = await initSqlJs({ locateFile: (file: string) => `/sql/${file}` });
  }
  return sqlJsModule;
}

function runStatement(db: Database, stmt: string, params: unknown[]): Record<string, unknown>[] {
  const prepared = db.prepare(stmt);
  try {
    prepared.bind(params as never[]);
    const rows: Record<string, unknown>[] = [];
    while (prepared.step()) {
      rows.push(prepared.getAsObject() as Record<string, unknown>);
    }
    return rows;
  } finally {
    prepared.free();
  }
}

export async function createWebStore({ dbName }: WebStoreOptions): Promise<OfflineStore> {
  const db: IDBPDatabase = await openDB(dbName, SCHEMA_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(KV_STORE)) {
        database.createObjectStore(KV_STORE);
      }
      if (!database.objectStoreNames.contains(BLOB_STORE)) {
        database.createObjectStore(BLOB_STORE);
      }
    },
  });

  let sqlDb: Database | null = null;
  let pendingSnapshot: Promise<void> = Promise.resolve();
  async function ensureSqlDb(): Promise<Database> {
    if (sqlDb) return sqlDb;
    const SqlJs = await getSqlJs();
    const priorSnapshot = (await db.get(BLOB_STORE, SQL_BLOB_KEY)) as Uint8Array | undefined;
    sqlDb = priorSnapshot ? new SqlJs.Database(priorSnapshot) : new SqlJs.Database();
    return sqlDb;
  }
  const snapshot = () => {
    if (!sqlDb) return Promise.resolve();
    const bytes = sqlDb.export();
    pendingSnapshot = pendingSnapshot.then(() => db.put(BLOB_STORE, bytes, SQL_BLOB_KEY).then(() => undefined));
    return pendingSnapshot;
  };

  return {
    kv: {
      async get(key) {
        const val = await db.get(KV_STORE, key);
        return val === undefined ? null : (val as string);
      },
      async set(key, val) {
        await db.put(KV_STORE, val, key);
      },
      async del(key) {
        await db.delete(KV_STORE, key);
      },
    },
    sql: {
      async run(stmt, params = []) {
        const handle = await ensureSqlDb();
        const rows = runStatement(handle, stmt, params);
        const isMutation = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(stmt);
        if (isMutation) await snapshot();
        return { rows };
      },
      async runBulk(stmt, paramsArray) {
        if (paramsArray.length === 0) return;
        const handle = await ensureSqlDb();
        const prepared = handle.prepare(stmt);
        try {
          for (const params of paramsArray) {
            prepared.bind(params as never[]);
            while (prepared.step()) {
              // drain any RETURNING rows
            }
            prepared.reset();
          }
        } finally {
          prepared.free();
        }
        await snapshot();
      },
    },
    async close() {
      await pendingSnapshot;
      sqlDb?.close();
      db.close();
    },
  };
}

const NATIVE_DB_NAME = 'lexiclash-offline';
const NATIVE_DB_VERSION = 1;

interface NativeDbHandle {
  open(): Promise<void>;
  close(): Promise<void>;
  run(statement: string, values?: unknown[], transaction?: boolean): Promise<{ changes?: { changes?: number } }>;
  query(statement: string, values?: unknown[]): Promise<{ values?: Record<string, unknown>[] }>;
}

export async function createNativeStore(): Promise<OfflineStore> {
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  let dbHandle: NativeDbHandle | null = null;

  async function ensureDb(): Promise<NativeDbHandle> {
    if (dbHandle) return dbHandle;
    const handle = (await sqlite.createConnection(
      NATIVE_DB_NAME,
      false,
      'no-encryption',
      NATIVE_DB_VERSION,
      false,
    )) as unknown as NativeDbHandle;
    await handle.open();
    dbHandle = handle;
    return handle;
  }

  return {
    kv: {
      async get(key) {
        const { value } = await Preferences.get({ key: NATIVE_KEY_PREFIX + key });
        return value ?? null;
      },
      async set(key, val) {
        await Preferences.set({ key: NATIVE_KEY_PREFIX + key, value: val });
      },
      async del(key) {
        await Preferences.remove({ key: NATIVE_KEY_PREFIX + key });
      },
    },
    sql: {
      async run(stmt, params = []) {
        const handle = await ensureDb();
        const isSelect = /^\s*SELECT\b/i.test(stmt);
        if (isSelect) {
          const result = await handle.query(stmt, params);
          return { rows: result.values ?? [] };
        }
        await handle.run(stmt, params);
        return { rows: [] };
      },
      async runBulk(stmt, paramsArray) {
        if (paramsArray.length === 0) return;
        const handle = await ensureDb();
        await handle.run('BEGIN', [], false);
        try {
          for (const params of paramsArray) {
            await handle.run(stmt, params);
          }
          await handle.run('COMMIT', [], false);
        } catch (err) {
          await handle.run('ROLLBACK', [], false).catch(() => undefined);
          throw err;
        }
      },
    },
    async close() {
      if (dbHandle) {
        await dbHandle.close();
        dbHandle = null;
      }
    },
  };
}
