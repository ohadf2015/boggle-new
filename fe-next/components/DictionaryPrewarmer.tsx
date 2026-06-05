'use client';

import { useEffect } from 'react';
import type { Language } from '@/shared/types/game';
import { prewarmDictionary } from '@/hooks/useDictionaryCache';

interface Props {
  lang: Language;
}

export default function DictionaryPrewarmer({ lang }: Props) {
  useEffect(() => {
    // Fire eagerly. The effect already runs after paint, so this can't jank
    // first render, and firing now (vs. deferring to requestIdleCallback) is
    // what guarantees the active-locale dictionary is fetched — and therefore
    // service-worker-cached — before the user can drop offline. The fetch is
    // off-main-thread (dictionary worker) and fire-and-forget.
    prewarmDictionary(lang).catch(() => {
      // Silent — mount must never break on a flaky dict fetch.
    });
  }, [lang]);

  return null;
}
