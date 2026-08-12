'use client';

/**
 * useDictionaryCache - Client-side dictionary caching for instant word validation
 *
 * Features:
 * - Fetches dictionary words on mount (lazy-loaded per language)
 * - Stores in memory Set for O(1) lookups
 * - Persists to IndexedDB for offline/repeat visits
 * - Provides instant word validation without network round-trip
 *
 * Usage:
 * const { checkWord, isLoaded, isLoading } = useDictionaryCache('en');
 * if (isLoaded && checkWord('hello')) {
 *   // Word is valid instantly, no API call needed
 * }
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Comlink from 'comlink';
import type { Language } from '@/shared/types/game';
import { normalizeHebrewWord, applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { DictionaryWorkerApi } from '@/workers/dictionaryWorker';

// IndexedDB configuration
const DB_NAME = 'lexiclash-dictionary';
const DB_VERSION = 1;
const STORE_NAME = 'dictionaries';

// In-memory cache shared across hook instances
const memoryCache = new Map<Language, Set<string>>();
const loadingPromises = new Map<Language, Promise<Set<string>>>();

interface UseDictionaryCacheReturn {
  /** Check if a word is in the dictionary (instant, no network) */
  checkWord: (word: string) => boolean;
  /** Whether the dictionary is loaded and ready */
  isLoaded: boolean;
  /** Whether the dictionary is currently loading */
  isLoading: boolean;
  /** Number of words in the dictionary */
  wordCount: number;
  /** Error if loading failed */
  error: string | null;
}

/**
 * Open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
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

/**
 * Get cached dictionary from IndexedDB
 */
async function getCachedDictionary(language: Language): Promise<string[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(language);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result;
        if (data && data.words && Array.isArray(data.words)) {
          // Check if cache is still fresh (24 hours)
          const cacheAge = Date.now() - (data.timestamp || 0);
          if (cacheAge < 24 * 60 * 60 * 1000) {
            resolve(data.words);
            return;
          }
        }
        resolve(null);
      };
    });
  } catch {
    // IndexedDB not available (private browsing, etc.)
    return null;
  }
}

/**
 * Save dictionary to IndexedDB
 */
async function cacheDictionary(language: Language, words: string[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({
        language,
        words,
        timestamp: Date.now(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Silently fail if IndexedDB not available
  }
}

// ─── Worker-accelerated loading ─────────────────────────────────────
// Offloads fetch + parse + Set construction to a Web Worker.
// Falls back to main-thread loading if Workers are unavailable.

let workerProxy: Comlink.Remote<DictionaryWorkerApi> | null = null;
let workerFailed = false;

function getWorkerProxy(): Comlink.Remote<DictionaryWorkerApi> | null {
  if (workerFailed) return null;
  if (workerProxy) return workerProxy;
  try {
    const worker = new Worker(
      new URL('../workers/dictionaryWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerProxy = Comlink.wrap<DictionaryWorkerApi>(worker);
    return workerProxy;
  } catch {
    workerFailed = true;
    return null;
  }
}

/**
 * Load dictionary via Web Worker (off-thread fetch + parse).
 * Returns null if worker unavailable — caller falls back to main-thread.
 */
async function fetchViaWorker(language: Language): Promise<Set<string> | null> {
  const proxy = getWorkerProxy();
  if (!proxy) return null;

  try {
    await proxy.load(language);
    const words = await proxy.getWords(language);
    if (words.length === 0) return null;
    return new Set(words);
  } catch {
    return null;
  }
}

/**
 * Load an explicitly-downloaded, encrypted dictionary (see lib/offline/
 * dictionaryDownload). Dynamic import keeps the crypto/IndexedDB code off the
 * initial bundle and out of SSR. Returns null (never throws) if unavailable.
 */
async function loadDownloadedDictionary(language: Language): Promise<Set<string> | null> {
  try {
    const { loadOfflineDictionary, createIdbStores } = await import(
      '@/lib/offline/dictionaryDownload'
    );
    return await loadOfflineDictionary(language, createIdbStores());
  } catch {
    return null;
  }
}

/**
 * Fetch dictionary from API
 */
async function fetchDictionary(language: Language): Promise<Set<string>> {
  // Check memory cache first
  if (memoryCache.has(language)) {
    return memoryCache.get(language)!;
  }

  // Check if already loading
  if (loadingPromises.has(language)) {
    return loadingPromises.get(language)!;
  }

  // Start loading
  const loadPromise = (async () => {
    // Explicitly-downloaded (encrypted) dictionary takes precedence: the user
    // opted into offline for this language, so it's authoritative and permanent
    // (no 24h TTL). Guarded — degrades to the normal path if storage/crypto is
    // unavailable (SSR, private browsing).
    const downloaded = await loadDownloadedDictionary(language);
    if (downloaded && downloaded.size > 0) {
      memoryCache.set(language, downloaded);
      return downloaded;
    }

    // Try IndexedDB cache first
    const cached = await getCachedDictionary(language);
    if (cached) {
      const wordSet = new Set(cached);
      memoryCache.set(language, wordSet);
      return wordSet;
    }

    // Try Web Worker (offloads fetch + parse to background thread)
    const workerResult = await fetchViaWorker(language);
    if (workerResult) {
      memoryCache.set(language, workerResult);
      return workerResult;
    }

    // Fallback: fetch on main thread
    const response = await fetch(`/api/dictionary-words?lang=${language}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dictionary: ${response.status}`);
    }

    const text = await response.text();
    const words = text.split('\n').filter(w => w.length > 0);
    const wordSet = new Set(words);

    // Cache in memory
    memoryCache.set(language, wordSet);

    // Cache in IndexedDB (async, don't wait)
    cacheDictionary(language, words).catch(() => {
      // Silently fail
    });

    return wordSet;
  })();

  loadingPromises.set(language, loadPromise);

  try {
    const result = await loadPromise;
    return result;
  } finally {
    loadingPromises.delete(language);
  }
}

/**
 * Eagerly warm the shared in-memory dictionary cache for a language.
 * Fire-and-forget: reuses fetchDictionary's loading-promise de-dupe so a
 * concurrent useDictionaryCache() mount shares the same fetch.
 */
export async function prewarmDictionary(language: Language): Promise<void> {
  if (memoryCache.has(language)) return;
  try {
    await fetchDictionary(language);
  } catch {
    // Silent — real submits fall back to server-side dict check.
  }
}

/**
 * Synchronous memory-only lookup for hot-path validators (e.g. blast mode).
 *
 *  - `true`  → dict is loaded and word is in it (safe to accept instantly)
 *  - `false` → dict is loaded and word is definitively missing
 *  - `null`  → dict not warmed yet; caller MUST fall back to server API so
 *              community-validated words still get accepted
 *
 * Callers must NOT treat `false` as a hard reject — community-validated words
 * bypass the base dict and only resolve via the server. `false` is useful for
 * short-circuiting UI hints, not for rejecting submits.
 */
export function hasWordInMemoryCache(word: string, language: Language): boolean | null {
  const dict = memoryCache.get(language);
  if (!dict) return null;
  const normalized = word.toLowerCase().trim();
  if (dict.has(normalized)) return true;
  if (language === 'he') {
    const base = normalizeHebrewWord(normalized);
    if (dict.has(base)) return true;
    const withSofit = applyHebrewFinalLetters(base);
    if (dict.has(withSofit)) return true;
  }
  return false;
}

/**
 * Test-only: reset module-level caches and optionally seed the memory cache.
 * Do not call from production code.
 */
export function __resetDictionaryCacheForTests(seed?: Map<Language, Set<string>>): void {
  memoryCache.clear();
  loadingPromises.clear();
  if (seed) {
    for (const [lang, set] of seed) memoryCache.set(lang, set);
  }
}

/**
 * Hook for client-side dictionary caching
 */
export function useDictionaryCache(language: Language): UseDictionaryCacheReturn {
  const [isLoaded, setIsLoaded] = useState(memoryCache.has(language));
  const [isLoading, setIsLoading] = useState(false);
  const [wordCount, setWordCount] = useState(memoryCache.get(language)?.size || 0);
  const [error, setError] = useState<string | null>(null);
  const dictionaryRef = useRef<Set<string> | null>(memoryCache.get(language) || null);

  // Load dictionary on mount or language change
  useEffect(() => {
    // If already loaded in memory, use it
    if (memoryCache.has(language)) {
      dictionaryRef.current = memoryCache.get(language)!;
      setIsLoaded(true);
      setWordCount(dictionaryRef.current.size);
      return;
    }

    // Start loading — reset the ref to null so checkWord returns false until ready
    dictionaryRef.current = null;
    setIsLoading(true);
    setError(null);
    setIsLoaded(false);  // ← Critical: reset to false when switching languages or loading for the first time

    fetchDictionary(language)
      .then((wordSet) => {
        dictionaryRef.current = wordSet;
        setIsLoaded(true);
        setWordCount(wordSet.size);
      })
      .catch((err) => {
        setError(err.message);
        console.warn('[useDictionaryCache] Failed to load dictionary:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [language]);

  /**
   * Check if a word is in the dictionary
   * Returns false if dictionary not loaded yet
   */
  const checkWord = useCallback((word: string): boolean => {
    if (!dictionaryRef.current) return false;
    const normalized = word.toLowerCase().trim();
    if (dictionaryRef.current.has(normalized)) return true;
    // Hebrew: board tiles use regular forms only, but dictionary has final forms (sofit).
    // Try with final letter applied (e.g., שלומ → שלום).
    if (language === 'he') {
      const base = normalizeHebrewWord(normalized);
      if (dictionaryRef.current.has(base)) return true;
      const withSofit = applyHebrewFinalLetters(base);
      if (dictionaryRef.current.has(withSofit)) return true;
    }
    return false;
  }, [language]);

  return {
    checkWord,
    isLoaded,
    isLoading,
    wordCount,
    error,
  };
}

export default useDictionaryCache;
