'use client';

import { useEffect, useState } from 'react';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { teacherFacingName } from '@/lib/education/rosterName';
import { getWithAuth } from '@/utils/authFetch';
import type { WordMasteryPreview, WordMasteryReport } from '@/lib/education/wordMasteryReport';
import type { ClassInsights } from './classInsights';

export type MasteryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'locked'; preview: WordMasteryPreview }
  | { status: 'ready'; report: WordMasteryReport; insights: ClassInsights | null };

export function useWordMasteryReport(classroomId: string): MasteryState {
  const [state, setState] = useState<MasteryState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getWithAuth(`/api/education/classroom/${classroomId}/word-mastery`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.status === 402 && body?.locked && body.preview) return setState({ status: 'locked', preview: body.preview });
        if (!res.ok || !body?.ok || !body.report) return setState({ status: 'error' });
        setState({ status: 'ready', report: body.report, insights: body.insights ?? null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  return state;
}

/** studentId -> display name; the API returns ids only. */
export function useRosterNames(classroomId: string, enabled: boolean, fallback: string): Record<string, string> {
  const [rows, setRows] = useState<{ id: string; rosterName: unknown; profile: { display_name?: string | null; username?: string | null } | null }[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getClassroomStudents(classroomId).then(({ data }) => {
      if (cancelled) return;
      setRows((data ?? []).map((s) => ({ id: s.student_id, rosterName: s.roster_name, profile: s.profiles })));
    });
    return () => {
      cancelled = true;
    };
  }, [classroomId, enabled]);

  const names: Record<string, string> = {};
  for (const r of rows) names[r.id] = teacherFacingName(r.rosterName, r.profile, fallback);
  return names;
}
