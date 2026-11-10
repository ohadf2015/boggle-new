'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/utils/authFetch';
import type { FreeClassInsight } from '@/lib/education/pro/freeClassInsight';

export type FreeClassInsightState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'free'; insight: FreeClassInsight }
  | { kind: 'locked' }
  | { kind: 'error' };

/** The server decides which class is free; this only carries its answer (402 = another class, still locked). */
export function useFreeClassInsight(classroomId: string, enabled: boolean) {
  const [state, setState] = useState<FreeClassInsightState>(enabled ? { kind: 'loading' } : { kind: 'idle' });

  const load = useCallback(async () => {
    if (!enabled || !classroomId) {
      setState({ kind: 'idle' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroomId}/analytics`);
      if (res.status === 402) {
        setState({ kind: 'locked' });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { scope?: string; free?: FreeClassInsight };
      if (!res.ok) {
        setState({ kind: 'error' });
        return;
      }
      setState(body.scope === 'free' && body.free ? { kind: 'free', insight: body.free } : { kind: 'locked' });
    } catch {
      setState({ kind: 'error' });
    }
  }, [classroomId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, retry: load } as FreeClassInsightState & { retry: () => Promise<void> };
}
