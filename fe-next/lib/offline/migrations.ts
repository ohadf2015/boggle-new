import type { OfflineStore } from './storage';

export const CURRENT_SCHEMA_VERSION = 1;
const VERSION_KEY = 'offline_schema_version';

type Migration = (store: OfflineStore) => Promise<void>;

const migrations: Migration[] = [
  async (store) => {
    await store.sql.run(`CREATE TABLE IF NOT EXISTS dict_words (
      word TEXT NOT NULL,
      locale TEXT NOT NULL,
      PRIMARY KEY (locale, word)
    )`);
    await store.sql.run('CREATE INDEX IF NOT EXISTS idx_dict_words_locale ON dict_words(locale, word)');
    await store.sql.run(`CREATE TABLE IF NOT EXISTS score_queue (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    )`);
    await store.sql.run(`CREATE TABLE IF NOT EXISTS daily_puzzles_cache (
      date TEXT NOT NULL,
      language TEXT NOT NULL,
      mode TEXT NOT NULL,
      payload TEXT NOT NULL,
      valid_until INTEGER NOT NULL,
      PRIMARY KEY (date, language, mode)
    )`);
    await store.sql.run(`CREATE TABLE IF NOT EXISTS kv_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`);
  },
];

export async function runMigrations(store: OfflineStore): Promise<void> {
  const current = await store.kv.get(VERSION_KEY);
  const currentVersion = current ? parseInt(current, 10) : 0;
  for (let v = currentVersion; v < migrations.length; v++) {
    await migrations[v](store);
  }
  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    await store.kv.set(VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  }
}
