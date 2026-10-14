'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMounted } from '@/hooks/useMounted';
import { getClassroomWindowSource } from '@/lib/supabase/windowedClassroomProgressQuery';
import {
  deriveWeeklyProgressDigest,
  type WeeklyProgressDigestMetrics,
} from '@/lib/education/weeklyProgressDigest';
import logger from '@/utils/logger';

export function useWeeklyProgressDigest(
  classroomId: string,
  assignmentExpected: number,
  assignmentCompletedAt: string[] = [],
) {
  const isMounted = useMounted();
  const [source, setSource] = useState<{
    roster: Parameters<typeof deriveWeeklyProgressDigest>[0]['roster'];
    sessions: Parameters<typeof deriveWeeklyProgressDigest>[0]['sessions'];
  } | null>(null);
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
        setError(new Error(err?.message ?? 'Failed to load weekly digest'));
        setIsLoading(false);
        return;
      }
      setSource(data);
      setIsLoading(false);
    } catch (e) {
      logger.error('Error loading weekly progress digest:', e);
      if (!isMounted.current) return;
      setSource(null);
      setError(e instanceof Error ? e : new Error('Failed to load weekly digest'));
      setIsLoading(false);
    }
  }, [classroomId, isMounted]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics: WeeklyProgressDigestMetrics | null = useMemo(() => {
    if (!source) return null;
    return deriveWeeklyProgressDigest({
      roster: source.roster,
      sessions: source.sessions,
      assignmentExpected,
      assignmentCompletions: assignmentCompletedAt.map((completedAt) => ({ completedAt })),
    });
  }, [source, assignmentExpected, assignmentCompletedAt]);

  return { metrics, isLoading, error, refresh: load };
}
