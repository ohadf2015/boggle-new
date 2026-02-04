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
import type { Language } from '@/shared/types/game';

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
    // Try IndexedDB cache first
    const cached = await getCachedDictionary(language);
    if (cached) {
      const wordSet = new Set(cached);
      memoryCache.set(language, wordSet);
      return wordSet;
    }

    // Fetch from API
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

    // Start loading
    setIsLoading(true);
    setError(null);

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
    return dictionaryRef.current.has(word.toLowerCase().trim());
  }, []);

  return {
    checkWord,
    isLoaded,
    isLoading,
    wordCount,
    error,
  };
}

export default useDictionaryCache;
