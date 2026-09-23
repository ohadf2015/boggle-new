'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { getClassroomWindowSource } from '@/lib/supabase/windowedClassroomProgressQuery';
import {
  deriveWindowedClassroomProgress,
  type ProgressWindowDays,
  type WindowedClassroomProgress,
} from '@/lib/education/windowedClassroomProgress';
import logger from '@/utils/logger';

export function useClassroomWindowProgress(classroomId: string, windowDays: ProgressWindowDays) {
  const isMounted = useMounted();
  const [source, setSource] = useState<{ roster: Parameters<typeof deriveWindowedClassroomProgress>[0]['roster']; sessions: Parameters<typeof deriveWindowedClassroomProgress>[0]['sessions'] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!classroomId) {
      setSource({ roster: [], sessions: [] });
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getClassroomWindowSource(classroomId);
      if (!isMounted.current) return;
      if (err || !data) {
        setSource(null);
        setError(new Error(err?.message ?? 'Failed to load progress'));
        setIsLoading(false);
        return;
      }
      setSource(data);
      setIsLoading(false);
    } catch (e) {
      logger.error('Error loading classroom window progress:', e);
      if (!isMounted.current) return;
      setSource(null);
      setError(e instanceof Error ? e : new Error('Failed to load progress'));
      setIsLoading(false);
    }
  }, [classroomId, isMounted]);

  useEffect(() => {
    void load();
  }, [load]);

  const progress: WindowedClassroomProgress | null = useMemo(() => {
    if (!source) return null;
    return deriveWindowedClassroomProgress({
      windowDays,
      roster: source.roster,
      sessions: source.sessions,
    });
  }, [source, windowDays]);

  return { progress, isLoading, error, refresh: load };
}
