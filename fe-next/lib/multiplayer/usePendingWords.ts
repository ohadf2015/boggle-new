'use client';

import { useCallback, useState } from 'react';

export type PendingWordStatus = 'pending' | 'confirmed' | 'rejected';

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

  const confirmPending = useCallback((word: string) => {
    setPendingWords(prev => {
      if (!prev.has(word)) return prev;
      return new Map(prev).set(word, 'confirmed');
    });
  }, []);

  const rejectPending = useCallback((word: string) => {
    setPendingWords(prev => {
      if (!prev.has(word)) return prev;
      return new Map(prev).set(word, 'rejected');
    });
  }, []);

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
