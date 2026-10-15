'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import {
  fetchTeacherActivityRows,
  summarizeTeacherWeek,
  type TeacherActivityRow,
  type TeacherWeekSummary,
} from '@/lib/education/teacherWeekStats';

export type TeacherWeekStatus = 'loading' | 'ready' | 'error';

/** `summary` is null until the read lands; on error it stays null so the UI shows "—", never a false 0. */
export function useTeacherWeekStats(
  classrooms: readonly { id: string; member_count?: number | null }[],
  classroomsReady: boolean,
): { summary: TeacherWeekSummary | null; status: TeacherWeekStatus } {
  const idsKey = classrooms.map((c) => c.id).sort().join(',');
  const [state, setState] = useState<{ key: string; rows: TeacherActivityRow[] | null; failed: boolean }>({
    key: '',
    rows: null,
    failed: false,
  });
  const [nowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!classroomsReady) return;
    const ids = idsKey ? idsKey.split(',') : [];
    if (!supabase || ids.length === 0) {
      setState({ key: idsKey, rows: [], failed: false });
      return;
    }
    let cancelled = false;
    fetchTeacherActivityRows(supabase, ids, nowMs)
      .then((rows) => !cancelled && setState({ key: idsKey, rows, failed: false }))
      .catch((error: unknown) => {
        logger.warn('teacher week stats unavailable', error);
        if (!cancelled) setState({ key: idsKey, rows: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [classroomsReady, idsKey, nowMs]);

  const current = state.key === idsKey && classroomsReady;
  const summary = useMemo(
    () => (current && state.rows ? summarizeTeacherWeek(state.rows, classrooms, nowMs) : null),
    [current, state.rows, classrooms, nowMs],
  );
  const status: TeacherWeekStatus = !current ? 'loading' : state.failed ? 'error' : 'ready';
  return { summary, status };
}
