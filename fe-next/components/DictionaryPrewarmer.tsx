'use client';

import { useEffect } from 'react';
import type { Language } from '@/shared/types/game';
import { prewarmDictionary } from '@/hooks/useDictionaryCache';

interface Props {
  lang: Language;
}

export default function DictionaryPrewarmer({ lang }: Props) {
  useEffect(() => {
    const run = () => {
      prewarmDictionary(lang).catch(() => {
        // Silent — mount must never break on flaky dict fetch.
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as Window & typeof globalThis).requestIdleCallback(run);
      return () => {
        if ('cancelIdleCallback' in window) {
          (window as Window & typeof globalThis).cancelIdleCallback(id);
        }
      };
    }

    const id = setTimeout(run, 2000);
    return () => clearTimeout(id);
  }, [lang]);

  return null;
}
