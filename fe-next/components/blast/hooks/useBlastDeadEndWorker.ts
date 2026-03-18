'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { HintPathResult } from '../utils/blastDeadEndDetector';
import { hasValidWords as hasValidWordsSync, findHintPath as findHintPathSync } from '../utils/blastDeadEndDetector';

/**
 * Hook that offloads dead-end detection to a Web Worker.
 * Falls back to main-thread execution if Workers are unavailable.
 *
 * Usage:
 *   const { hasValidWords, findHintPath } = useBlastDeadEndWorker(validWordsArray);
 *   const hasWords = await hasValidWords(grid, 'en', foundWords);
 */
export function useBlastDeadEndWorker(validWords: string[]) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      const worker = new Worker(
        new URL('../utils/blastDeadEndDetector.worker.ts', import.meta.url)
      );

      worker.onmessage = (e: MessageEvent) => {
        const { type, result } = e.data;
        const pending = pendingRef.current.get(type);
        if (pending) {
          pending.resolve(result);
          pendingRef.current.delete(type);
        }
      };

      worker.onerror = () => {
        // On error, resolve any pending promises so callers don't hang
        for (const [key, pending] of pendingRef.current) {
          pending.reject(new Error('Worker error'));
          pendingRef.current.delete(key);
        }
      };

      workerRef.current = worker;
    } catch {
      // Worker creation failed — will fall back to sync
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const hasValidWords = useCallback(
    (
      grid: string[][],
      language: string,
      foundWords: Set<string>,
      minLength: number = 2,
      maxLength: number = 8,
    ): Promise<boolean> => {
      const worker = workerRef.current;
      if (!worker) {
        // Fallback: use a checkWord fn built from validWords
        const dict = new Set(validWords);
        const checkWord = (w: string) => dict.has(w);
        return Promise.resolve(hasValidWordsSync(grid, language, checkWord, foundWords, minLength, maxLength));
      }

      // Cancel any previous pending hasValidWords request
      const prev = pendingRef.current.get('hasValidWords');
      if (prev) {
        prev.resolve(false); // resolve stale request
        pendingRef.current.delete('hasValidWords');
      }

      return new Promise((resolve, reject) => {
        pendingRef.current.set('hasValidWords', {
          resolve: resolve as (v: unknown) => void,
          reject,
        });
        worker.postMessage({
          type: 'hasValidWords',
          grid,
          foundWords: Array.from(foundWords),
          minLength,
          maxLength,
          validWords,
        });
      });
    },
    [validWords],
  );

  const findHintPath = useCallback(
    (
      grid: string[][],
      language: string,
      foundWords: Set<string>,
      minLength: number = 3,
      maxLength: number = 8,
    ): Promise<HintPathResult | null> => {
      const worker = workerRef.current;
      if (!worker) {
        const dict = new Set(validWords);
        const checkWord = (w: string) => dict.has(w);
        return Promise.resolve(findHintPathSync(grid, language, checkWord, foundWords, minLength, maxLength));
      }

      const prev = pendingRef.current.get('findHintPath');
      if (prev) {
        prev.resolve(null);
        pendingRef.current.delete('findHintPath');
      }

      return new Promise((resolve, reject) => {
        pendingRef.current.set('findHintPath', {
          resolve: resolve as (v: unknown) => void,
          reject,
        });
        worker.postMessage({
          type: 'findHintPath',
          grid,
          foundWords: Array.from(foundWords),
          minLength,
          maxLength,
          validWords,
        });
      });
    },
    [validWords],
  );

  return { hasValidWords, findHintPath };
}
