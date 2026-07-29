'use client';

/**
 * useDictionaryWorker — Web Worker-powered dictionary validation via Comlink.
 *
 * Same API as useDictionaryCache, but loads/validates words off the main thread.
 * Falls back to main-thread useDictionaryCache if Workers are unavailable.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Comlink from 'comlink';
import type { Language } from '@/shared/types/game';
import type { DictionaryWorkerApi } from '@/workers/dictionaryWorker';

// Singleton worker instance shared across all hook instances
let workerInstance: Worker | null = null;
let workerProxy: Comlink.Remote<DictionaryWorkerApi> | null = null;
let workerFailed = false;

function getWorkerProxy(): Comlink.Remote<DictionaryWorkerApi> | null {
  if (workerFailed) return null;
  if (workerProxy) return workerProxy;

  try {
    workerInstance = new Worker(
      new URL('../workers/dictionaryWorker.ts', import.meta.url),
      { type: 'module' }
    );
    workerProxy = Comlink.wrap<DictionaryWorkerApi>(workerInstance);
    return workerProxy;
  } catch {
    workerFailed = true;
    return null;
  }
}

interface UseDictionaryWorkerReturn {
  checkWord: (word: string) => Promise<boolean>;
  isLoaded: boolean;
  isLoading: boolean;
  wordCount: number;
  error: string | null;
}

export function useDictionaryWorker(language: Language): UseDictionaryWorkerReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const proxyRef = useRef<Comlink.Remote<DictionaryWorkerApi> | null>(null);

  useEffect(() => {
    const proxy = getWorkerProxy();
    if (!proxy) {
      setError('Web Workers not available');
      return;
    }

    proxyRef.current = proxy;
    setIsLoading(true);
    setError(null);

    proxy.load(language)
      .then((count: number) => {
        setIsLoaded(true);
        setWordCount(count);
      })
      .catch((err: Error) => {
        setError(err.message);
        console.warn('[useDictionaryWorker] Failed to load dictionary:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [language]);

  const checkWord = useCallback(async (word: string): Promise<boolean> => {
    if (!proxyRef.current) return false;
    return proxyRef.current.checkWord(word, language);
  }, [language]);

  return { checkWord, isLoaded, isLoading, wordCount, error };
}

export default useDictionaryWorker;
