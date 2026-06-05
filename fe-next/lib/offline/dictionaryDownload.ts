/**
 * "Download for offline" — proactively fetch a language's dictionary, encrypt
 * it (see dictionaryCrypto.ts — obfuscation-grade, the wordlists are public),
 * and store the ciphertext on-device so the user can prepare for offline play
 * (e.g. before a flight) across multiple languages, not just the one they
 * happened to load.
 *
 * Storage is injected (DictBlobStore / DictKeyStore) so the orchestration is
 * unit-testable without a real IndexedDB. `createIdbStores()` provides the
 * production IndexedDB-backed implementation.
 *
 * Blobs live in IndexedDB directly (NOT the sql.js offline store): sql.js holds
 * the whole DB in memory and re-serializes on every write, so a multi-MB dict
 * blob there would tax unrelated score-queue writes.
 */
import {
  generateDictKey,
  encryptText,
  decryptText,
  type EncryptedBlob,
} from './dictionaryCrypto';

export interface StoredDict extends EncryptedBlob {
  wordCount: number;
  downloadedAt: number;
}

export interface DictBlobStore {
  get(lang: string): Promise<StoredDict | undefined>;
  put(lang: string, rec: StoredDict): Promise<void>;
  delete(lang: string): Promise<void>;
  keys(): Promise<string[]>;
}

export interface DictKeyStore {
  getKey(): Promise<CryptoKey | undefined>;
  setKey(key: CryptoKey): Promise<void>;
}

export interface DownloadInfo {
  lang: string;
  wordCount: number;
  downloadedAt: number;
  sizeBytes: number;
}

interface DownloadDeps {
  blobStore: DictBlobStore;
  keyStore: DictKeyStore;
  /** Returns the newline-delimited word list for a language. */
  fetchText: (lang: string) => Promise<string>;
  now?: () => number;
}

interface LoadDeps {
  blobStore: DictBlobStore;
  keyStore: DictKeyStore;
}

/** Get the persisted device key, generating + storing one on first use. */
export async function getOrCreateKey(keyStore: DictKeyStore): Promise<CryptoKey> {
  const existing = await keyStore.getKey();
  if (existing) return existing;
  const key = await generateDictKey();
  await keyStore.setKey(key);
  return key;
}

/** Split a newline-delimited word list into clean, non-empty entries. */
function splitWords(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const w = line.trim();
    if (w) out.push(w);
  }
  return out;
}

export async function downloadDictionary(
  lang: string,
  deps: DownloadDeps,
): Promise<DownloadInfo> {
  const now = deps.now ?? Date.now;
  const text = await deps.fetchText(lang);
  const words = splitWords(text);
  const key = await getOrCreateKey(deps.keyStore);
  // Re-join normalized words so the stored copy matches what we load back.
  const blob = await encryptText(key, words.join('\n'));
  const rec: StoredDict = {
    iv: blob.iv,
    data: blob.data,
    wordCount: words.length,
    downloadedAt: now(),
  };
  await deps.blobStore.put(lang, rec);
  return {
    lang,
    wordCount: rec.wordCount,
    downloadedAt: rec.downloadedAt,
    sizeBytes: rec.data.byteLength,
  };
}

/** Load a previously downloaded dictionary as a word Set, or null if absent. */
export async function loadOfflineDictionary(
  lang: string,
  deps: LoadDeps,
): Promise<Set<string> | null> {
  const rec = await deps.blobStore.get(lang);
  if (!rec) return null;
  const key = await deps.keyStore.getKey();
  if (!key) return null;
  const text = await decryptText(key, { iv: rec.iv, data: rec.data });
  return new Set(splitWords(text));
}

export async function listDownloads(
  blobStore: DictBlobStore,
): Promise<DownloadInfo[]> {
  const langs = await blobStore.keys();
  const infos: DownloadInfo[] = [];
  for (const lang of langs) {
    const rec = await blobStore.get(lang);
    if (!rec) continue;
    infos.push({
      lang,
      wordCount: rec.wordCount,
      downloadedAt: rec.downloadedAt,
      sizeBytes: rec.data.byteLength,
    });
  }
  return infos;
}

export function deleteDownload(
  lang: string,
  blobStore: DictBlobStore,
): Promise<void> {
  return blobStore.delete(lang);
}

// ── Production IndexedDB-backed stores ──────────────────────────────────────
// Thin raw-IndexedDB wrapper (no extra dependency). The pure logic above is the
// tested surface; this is a mechanical adapter.

const DB_NAME = 'lexiclash-offline-dicts';
const DB_VERSION = 1;
const BLOB_STORE = 'dictionaries';
const KEY_STORE = 'keys';
const KEY_ID = 'deviceKey';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = op(db.transaction(store, mode).objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createIdbStores(): { blobStore: DictBlobStore; keyStore: DictKeyStore } {
  const blobStore: DictBlobStore = {
    async get(lang) {
      const db = await openDb();
      return (await tx<StoredDict | undefined>(db, BLOB_STORE, 'readonly', (s) => s.get(lang))) ?? undefined;
    },
    async put(lang, rec) {
      const db = await openDb();
      await tx(db, BLOB_STORE, 'readwrite', (s) => s.put(rec, lang));
    },
    async delete(lang) {
      const db = await openDb();
      await tx(db, BLOB_STORE, 'readwrite', (s) => s.delete(lang));
    },
    async keys() {
      const db = await openDb();
      return (await tx<IDBValidKey[]>(db, BLOB_STORE, 'readonly', (s) => s.getAllKeys())) as string[];
    },
  };

  const keyStore: DictKeyStore = {
    async getKey() {
      const db = await openDb();
      return (await tx<CryptoKey | undefined>(db, KEY_STORE, 'readonly', (s) => s.get(KEY_ID))) ?? undefined;
    },
    async setKey(key) {
      const db = await openDb();
      // CryptoKey is structured-cloneable even when non-extractable — the raw
      // bytes are NOT serialized, so this never leaks the key.
      await tx(db, KEY_STORE, 'readwrite', (s) => s.put(key, KEY_ID));
    },
  };

  return { blobStore, keyStore };
}

/** Default fetcher: the app's open dictionary endpoint, as newline text. */
export async function fetchDictionaryText(lang: string): Promise<string> {
  const res = await fetch(`/api/dictionary-words?lang=${encodeURIComponent(lang)}`);
  if (!res.ok) throw new Error(`dictionary fetch failed: ${res.status}`);
  return res.text();
}
