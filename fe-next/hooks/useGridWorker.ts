'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import type { GridWorkerResponse } from '@/workers/gridWorker';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Hook for using the grid Web Worker for CPU-intensive operations
 *
 * Provides async methods for:
 * - isWordOnBoard: Check if word exists as valid path
 * - getWordPath: Get the path for a word on the grid
 * - batchGetPaths: Get paths for multiple words at once
 * - couldBeOnBoard: Quick check if letters are available
 */
export function useGridWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const idCounterRef = useRef(0);

  // Initialize worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create worker using URL constructor for Next.js compatibility
    try {
      workerRef.current = new Worker(
        new URL('@/workers/gridWorker.ts', import.meta.url)
      );

      workerRef.current.onmessage = (event: MessageEvent<GridWorkerResponse>) => {
        const response = event.data;
        const pending = pendingRef.current.get(response.id);

        if (pending) {
          if (response.type === 'error') {
            pending.reject(new Error(response.error));
          } else {
            pending.resolve(response.result);
          }
          pendingRef.current.delete(response.id);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('[GridWorker] Error:', error);
        // Reject all pending requests
        pendingRef.current.forEach((pending) => {
          pending.reject(new Error('Worker error'));
        });
        pendingRef.current.clear();
      };

      setIsReady(true);
    } catch (error) {
      console.warn('[GridWorker] Failed to initialize worker, falling back to main thread:', error);
      setIsReady(false);
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Generate unique request ID
  const generateId = useCallback(() => {
    return `req_${++idCounterRef.current}_${Date.now()}`;
  }, []);

  // Send request to worker
  const sendRequest = useCallback(<T>(request: Record<string, unknown>): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = generateId();
      pendingRef.current.set(id, { resolve: resolve as (value: unknown) => void, reject });

      workerRef.current.postMessage({ ...request, id });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id);
          reject(new Error('Worker request timeout'));
        }
      }, 5000);
    });
  }, [generateId]);

  /**
   * Check if a word exists on the board as a valid path
   */
  const isWordOnBoard = useCallback(async (
    word: string,
    grid: string[][] | null,
    language: string
  ): Promise<boolean> => {
    if (!grid || !word) return false;

    if (!workerRef.current) {
      // Fallback to main thread (import dynamically to avoid SSR issues)
      const { isWordOnBoard: mainThreadCheck } = await import('@/utils/clientWordValidator');
      return mainThreadCheck(word, grid, language);
    }

    return sendRequest<boolean>({
      type: 'isWordOnBoard',
      word,
      grid,
      language
    });
  }, [sendRequest]);

  /**
   * Get the path for a word on the grid
   */
  const getWordPath = useCallback(async (
    word: string,
    grid: string[][] | null,
    language: string
  ): Promise<{ row: number; col: number }[] | null> => {
    if (!grid || !word) return null;

    if (!workerRef.current) {
      // Fallback - compute path on main thread
      // We don't have getWordPath in clientWordValidator, so implement inline
      return null;
    }

    return sendRequest<{ row: number; col: number }[] | null>({
      type: 'getWordPath',
      word,
      grid,
      language
    });
  }, [sendRequest]);

  /**
   * Get paths for multiple words at once (efficient for batch operations)
   */
  const batchGetPaths = useCallback(async (
    words: string[],
    grid: string[][] | null,
    language: string
  ): Promise<Record<string, { row: number; col: number }[] | null>> => {
    if (!grid || words.length === 0) return {};

    if (!workerRef.current) {
      // Fallback - return empty results
      return Object.fromEntries(words.map(w => [w, null]));
    }

    return sendRequest<Record<string, { row: number; col: number }[] | null>>({
      type: 'batchGetPaths',
      words,
      grid,
      language
    });
  }, [sendRequest]);

  /**
   * Quick check if all letters in word are available on the grid
   */
  const couldBeOnBoard = useCallback(async (
    word: string,
    grid: string[][] | null,
    language: string
  ): Promise<boolean> => {
    if (!grid || !word) return true;

    if (!workerRef.current) {
      // Fallback to main thread
      const { couldBeOnBoard: mainThreadCheck } = await import('@/utils/clientWordValidator');
      return mainThreadCheck(word, grid, language);
    }

    return sendRequest<boolean>({
      type: 'couldBeOnBoard',
      word,
      grid,
      language
    });
  }, [sendRequest]);

  return {
    isReady,
    isWordOnBoard,
    getWordPath,
    batchGetPaths,
    couldBeOnBoard
  };
}

export default useGridWorker;
