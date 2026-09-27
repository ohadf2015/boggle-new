'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PendingWordStatus = 'pending' | 'confirmed' | 'rejected';

/** A settled (confirmed / rejected) chip leaves after this beat. It used to wait
 *  for an animationend a confirmed chip never fires (and reduced motion drops
 *  the reject shake), so settled chips piled up over the board all round. */
export const SETTLED_CHIP_MS = 900;

export interface PendingWordsApi {
  pendingWords: Map<string, PendingWordStatus>;
  enqueuePending: (word: string) => void;
  confirmPending: (word: string) => void;
  rejectPending: (word: string) => void;
  dismissPending: (word: string) => void;
  clearAll: () => void;
  isPending: (word: string) => boolean;
}

export function usePendingWords(): PendingWordsApi {
  const [pendingWords, setPendingWords] = useState<Map<string, PendingWordStatus>>(
    () => new Map(),
  );

  const enqueuePending = useCallback((word: string) => {
    setPendingWords(prev => new Map(prev).set(word, 'pending'));
  }, []);

  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const live = timers.current;
    return () => {
      live.forEach(clearTimeout);
      live.clear();
    };
  }, []);

  const settle = useCallback((word: string, status: Exclude<PendingWordStatus, 'pending'>) => {
    setPendingWords(prev => {
      if (!prev.has(word)) return prev;
      return new Map(prev).set(word, status);
    });
    const id = setTimeout(() => {
      timers.current.delete(id);
      setPendingWords(prev => {
        // A re-submit since then is a fresh pending chip: leave it.
        const current = prev.get(word);
        if (current === undefined || current === 'pending') return prev;
        const next = new Map(prev);
        next.delete(word);
        return next;
      });
    }, SETTLED_CHIP_MS);
    timers.current.add(id);
  }, []);

  const confirmPending = useCallback((word: string) => settle(word, 'confirmed'), [settle]);
  const rejectPending = useCallback((word: string) => settle(word, 'rejected'), [settle]);

  const dismissPending = useCallback((word: string) => {
    setPendingWords(prev => {
      const next = new Map(prev);
      next.delete(word);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setPendingWords(new Map());
  }, []);

  const isPending = useCallback(
    (word: string) => pendingWords.get(word) === 'pending',
    [pendingWords],
  );

  return { pendingWords, enqueuePending, confirmPending, rejectPending, dismissPending, clearAll, isPending };
}
