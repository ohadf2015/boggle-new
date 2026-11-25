'use client';

import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export const TYPED_WORD_ACCEPTED_KEY = 'lexiclash_typed_word_accepted';
// A typed word is validated before it lands (server or dictionary round trip); a word that lands later came from somewhere else.
const TYPED_ACCEPT_WINDOW_MS = 4000;

let lastTypedSubmitAt = Number.NEGATIVE_INFINITY;

export function noteTypedSubmit(): void {
  lastTypedSubmitAt = Date.now();
}

function readLearned(): boolean {
  try {
    return localStorage.getItem(TYPED_WORD_ACCEPTED_KEY) === '1';
  } catch {
    return false;
  }
}

/** A mouse-and-keyboard computer: fine pointer and no touch screen anywhere. */
export function useTypingDesktop(): boolean {
  const fine = useMediaQuery('(pointer: fine)');
  const touch = useMediaQuery('(any-pointer: coarse)');
  return fine && !touch;
}

/** Show the "just type" hint until the player gets a typed word accepted, then never again. */
export function useTypeWordHint(acceptedCount: number): boolean {
  const desktop = useTypingDesktop();
  const [learned, setLearned] = useState(true);
  useEffect(() => setLearned(readLearned()), []);

  const prevCount = useRef(acceptedCount);
  useEffect(() => {
    const grew = acceptedCount > prevCount.current;
    prevCount.current = acceptedCount;
    if (!grew || Date.now() - lastTypedSubmitAt > TYPED_ACCEPT_WINDOW_MS) return;
    try {
      localStorage.setItem(TYPED_WORD_ACCEPTED_KEY, '1');
    } catch {
      /* private mode: hide for this session only */
    }
    setLearned(true);
  }, [acceptedCount]);

  return desktop && !learned;
}
