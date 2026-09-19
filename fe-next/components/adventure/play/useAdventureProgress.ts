'use client';

/** Read-only adventure progress: level completions from GET /api/adventure/progress. */
import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/utils/authFetch';
import type { Completion } from '@/lib/adventure/play/progress';

export function useAdventureProgress(enabled: boolean) {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const refresh = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/adventure/progress');
      if (!res.ok) throw new Error(`progress ${res.status}`);
      const data = await res.json();
      setCompletions(
        (data.completions ?? []).map((c: Completion) => ({ world: c.world, level: c.level, stars: c.stars })),
      );
      setState('ready');
    } catch (err) {
      console.error('[adventure] progress fetch failed', err);
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { completions, state, refresh };
}
