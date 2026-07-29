/**
 * Dictionary Web Worker — offloads dictionary loading and word validation
 * to a background thread via Comlink.
 *
 * The main thread Set construction (parsing 500K+ words) blocks for ~200ms.
 * This worker keeps the UI at 60fps during dictionary load.
 */

import * as Comlink from 'comlink';

// In-worker dictionary storage
const dictionaries = new Map<string, Set<string>>();
const loadingPromises = new Map<string, Promise<void>>();

// Hebrew normalization (duplicated from shared/utils to avoid import issues in worker)
const HEBREW_FINAL_MAP: Record<string, string> = {
  'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ',
};

function applyHebrewFinals(word: string): string {
  if (word.length === 0) return word;
  const lastChar = word[word.length - 1];
  const finalForm = HEBREW_FINAL_MAP[lastChar];
  if (finalForm) {
    return word.slice(0, -1) + finalForm;
  }
  return word;
}

function normalizeHebrew(word: string): string {
  // Remove nikud (Hebrew diacritics: U+0591–U+05C7)
  return word.replace(/[\u0591-\u05C7]/g, '');
}

const workerApi = {
  async load(language: string): Promise<number> {
    if (dictionaries.has(language)) {
      return dictionaries.get(language)!.size;
    }

    if (loadingPromises.has(language)) {
      await loadingPromises.get(language);
      return dictionaries.get(language)?.size ?? 0;
    }

    const loadPromise = (async () => {
      // Try IndexedDB first
      const cached = await getCachedFromIDB(language);
      if (cached) {
        dictionaries.set(language, cached);
        return;
      }

      // Fetch from API
      const response = await fetch(`/api/dictionary-words?lang=${language}`);
      if (!response.ok) {
        throw new Error(`Dictionary fetch failed: ${response.status}`);
      }

      const text = await response.text();
      const words = text.split('\n').filter((w: string) => w.length > 0);
      const wordSet = new Set(words);
      dictionaries.set(language, wordSet);

      // Cache to IndexedDB (fire and forget)
      cacheToIDB(language, words).catch(() => {});
    })();

    loadingPromises.set(language, loadPromise);
    try {
      await loadPromise;
    } finally {
      loadingPromises.delete(language);
    }

    return dictionaries.get(language)?.size ?? 0;
  },

  checkWord(word: string, language: string): boolean {
    const dict = dictionaries.get(language);
    if (!dict) return false;

    const normalized = word.toLowerCase().trim();
    if (dict.has(normalized)) return true;

    if (language === 'he') {
      const base = normalizeHebrew(normalized);
      if (dict.has(base)) return true;
      const withSofit = applyHebrewFinals(base);
      if (dict.has(withSofit)) return true;
    }

    return false;
  },

  isLoaded(language: string): boolean {
    return dictionaries.has(language);
  },

  getWordCount(language: string): number {
    return dictionaries.get(language)?.size ?? 0;
  },

  /** Return all words as array for main-thread Set construction */
  getWords(language: string): string[] {
    const dict = dictionaries.get(language);
    return dict ? Array.from(dict) : [];
  },
};

// IndexedDB helpers (self-contained in worker)
const DB_NAME = 'lexiclash-dictionary';
const DB_VERSION = 1;
const STORE_NAME = 'dictionaries';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'language' });
      }
    };
  });
}

async function getCachedFromIDB(language: string): Promise<Set<string> | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(language);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const data = req.result;
        if (data?.words && Array.isArray(data.words)) {
          const age = Date.now() - (data.timestamp || 0);
          if (age < 24 * 60 * 60 * 1000) {
            resolve(new Set(data.words));
            return;
          }
        }
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

async function cacheToIDB(language: string, words: string[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ language, words, timestamp: Date.now() });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

export type DictionaryWorkerApi = typeof workerApi;

Comlink.expose(workerApi);
