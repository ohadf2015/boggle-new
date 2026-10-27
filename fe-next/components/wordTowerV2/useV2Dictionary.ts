'use client';

import { useEffect, useRef, useState } from 'react';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';

/** The wheel's dictionary for the current language, with a visible failure state. */
export function useV2Dictionary(language: string) {
  const dictRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const [dictError, setDictError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDictError(false);
    loadWordCraftDictionary(language as Parameters<typeof loadWordCraftDictionary>[0])
      .then((set) => {
        if (cancelled) return;
        dictRef.current = set;
        setDictReady(true);
      })
      .catch(() => {
        // Without this the wheel stays dead with no explanation.
        if (!cancelled) {
          setDictReady(false);
          setDictError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  return { dictRef, dictReady, dictError };
}
