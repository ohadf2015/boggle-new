'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { ClassroomWeekSection } from './ClassroomWeekSection';
import { EMPTY_CLASSROOM_WEEK, type TeacherClassroomWeek } from './classroomWeekActivity';
import { loadClassroomWeekRows, type WeekDb } from './loadClassroomWeekRows';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomWeekPanelProps {
  classroomIds: readonly string[];
  focusId: string;
  focusName: string;
  language: string;
  t: T;
}

export function ClassroomWeekPanel({ classroomIds, focusId, focusName, language, t }: ClassroomWeekPanelProps) {
  const idsKey = [...classroomIds].filter(Boolean).sort().join(',');
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; summary: TeacherClassroomWeek | null; status: 'loading' | 'ready' | 'error' }>({
    key: '',
    summary: null,
    status: 'loading',
  });

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!focusId) return;
    if (!idsKey) {
      setState({ key: '', summary: { byClass: {}, quietFor7Days: false, lastGameAt: null }, status: 'ready' });
      return;
    }
    let cancelled = false;
    loadClassroomWeekRows(supabase as unknown as WeekDb | null, idsKey.split(','), Date.now())
      .then((loaded) => {
        if (cancelled) return;
        setState({ key: idsKey, summary: loaded.summary, status: loaded.error ? 'error' : 'ready' });
      })
      .catch(() => {
        if (!cancelled) setState({ key: idsKey, summary: null, status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, focusId, attempt]);

  if (!focusId) return null;
  const current = state.key === idsKey;
  const status = current ? state.status : 'loading';
  const summary = current ? state.summary : null;

  return (
    <ClassroomWeekSection
      classroomName={focusName}
      digest={status === 'ready' ? (summary?.byClass[focusId] ?? EMPTY_CLASSROOM_WEEK) : null}
      status={status}
      showNudge={status === 'ready' && summary?.quietFor7Days === true}
      hostHref={teacherHostHref(language, { classroomId: focusId })}
      onRetry={reload}
      t={t}
    />
  );
}
