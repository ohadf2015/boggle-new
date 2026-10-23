'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/utils/authFetch';
import type { ClassAnalytics } from '@/lib/education/pro/classAnalyticsServer';

interface State {
  metrics: ClassAnalytics | null;
  isLoading: boolean;
  error: Error | null;
}

export function useProClassAnalytics({ classroomId }: { classroomId: string }) {
  const [state, setState] = useState<State>({ metrics: null, isLoading: true, error: null });

  const load = useCallback(async () => {
    if (!classroomId) {
      setState({ metrics: null, isLoading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroomId}/analytics`);
      const body = (await res.json().catch(() => ({}))) as { metrics?: ClassAnalytics; error?: string };
      if (!res.ok || !body.metrics) {
        setState({ metrics: null, isLoading: false, error: new Error(body.error ?? `HTTP ${res.status}`) });
        return;
      }
      setState({ metrics: body.metrics, isLoading: false, error: null });
    } catch (err) {
      setState({ metrics: null, isLoading: false, error: err instanceof Error ? err : new Error(String(err)) });
    }
  }, [classroomId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, refresh: load };
}
