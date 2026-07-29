'use client';

/**
 * usePrevalidation - Pre-fetch word validation as user types
 *
 * Features:
 * - Debounced pre-validation for words >= 3 chars
 * - Caches validation results for instant use on submit
 * - Cancels in-flight requests when word changes
 * - Memory-efficient with LRU-style cleanup
 *
 * Usage:
 * const { prefetch, getCached, clearCache } = usePrevalidation('en');
 *
 * // Call on every keystroke
 * useEffect(() => {
 *   prefetch(currentWord);
 * }, [currentWord]);
 *
 * // On submit, check cache first
 * const cached = getCached(word);
 * if (cached !== undefined) {
 *   // Use cached result
 * }
 */

import { useCallback, useRef, useEffect } from 'react';
import type { Language } from '@/shared/types/game';

interface CachedResult {
  isValid: boolean;
  timestamp: number;
}

interface UsePrevalidationReturn {
  /** Prefetch validation for a word (debounced) */
  prefetch: (word: string) => void;
  /** Get cached validation result (undefined if not cached) */
  getCached: (word: string) => boolean | undefined;
  /** Clear the cache */
  clearCache: () => void;
}

// Constants
const DEBOUNCE_MS = 100; // Debounce delay for prefetch
const MIN_WORD_LENGTH = 3; // Minimum word length to prefetch
const CACHE_TTL_MS = 60000; // Cache TTL (1 minute)
const MAX_CACHE_SIZE = 100; // Maximum cached entries

/**
 * Hook for pre-validating words as user types
 */
export function usePrevalidation(language: Language): UsePrevalidationReturn {
  // Cache for validation results
  const cacheRef = useRef<Map<string, CachedResult>>(new Map());

  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce timeout ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Clean up old cache entries
   */
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    // Remove expired entries
    for (const [word, result] of cache.entries()) {
      if (now - result.timestamp > CACHE_TTL_MS) {
        cache.delete(word);
      }
    }

    // If still too many, remove oldest
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      for (const [word] of toRemove) {
        cache.delete(word);
      }
    }
  }, []);

  /**
   * Prefetch validation for a word
   */
  const prefetch = useCallback((word: string) => {
    const normalizedWord = word.toLowerCase().trim();

    // Skip if too short
    if (normalizedWord.length < MIN_WORD_LENGTH) {
      return;
    }

    // Skip if already cached
    const cached = cacheRef.current.get(normalizedWord);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return;
    }

    // Cancel previous debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Cancel previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Debounce the fetch
    debounceTimeoutRef.current = setTimeout(() => {
      // Create new abort controller
      abortControllerRef.current = new AbortController();

      fetch('/api/dictionary/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: normalizedWord, language }),
        signal: abortControllerRef.current.signal,
      })
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(result => {
          if (result) {
            // Cache the result
            cacheRef.current.set(normalizedWord, {
              isValid: result.isValid === true,
              timestamp: Date.now(),
            });

            // Clean up if needed
            if (cacheRef.current.size > MAX_CACHE_SIZE) {
              cleanupCache();
            }
          }
        })
        .catch(err => {
          // Ignore abort errors
          if (err.name !== 'AbortError') {
            console.warn('[usePrevalidation] Prefetch failed:', err);
          }
        });
    }, DEBOUNCE_MS);
  }, [language, cleanupCache]);

  /**
   * Get cached validation result
   */
  const getCached = useCallback((word: string): boolean | undefined => {
    const normalizedWord = word.toLowerCase().trim();
    const cached = cacheRef.current.get(normalizedWord);

    if (!cached) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      cacheRef.current.delete(normalizedWord);
      return undefined;
    }

    return cached.isValid;
  }, []);

  /**
   * Clear the cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    prefetch,
    getCached,
    clearCache,
  };
}

export default usePrevalidation;
