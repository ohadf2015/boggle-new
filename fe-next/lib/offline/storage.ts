import { openDB, type IDBPDatabase } from 'idb';
import { Preferences } from '@capacitor/preferences';

export interface OfflineKV {
  get(key: string): Promise<string | null>;
  set(key: string, val: string): Promise<void>;
  del(key: string): Promise<void>;
}

export interface OfflineStore {
  kv: OfflineKV;
  close?(): Promise<void>;
}

interface WebStoreOptions {
  dbName: string;
}

const KV_STORE = 'kv';
const SCHEMA_VERSION = 1;
const NATIVE_KEY_PREFIX = 'offline.';

export async function createWebStore({ dbName }: WebStoreOptions): Promise<OfflineStore> {
  const db: IDBPDatabase = await openDB(dbName, SCHEMA_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(KV_STORE)) {
        database.createObjectStore(KV_STORE);
      }
    },
  });

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
    async close() {
      db.close();
    },
  };
}

export async function createNativeStore(): Promise<OfflineStore> {
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
  };
}
