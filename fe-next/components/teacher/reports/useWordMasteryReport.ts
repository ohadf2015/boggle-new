'use client';

import { useEffect, useState } from 'react';
import { getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { resolveDisplayName } from '@/lib/displayName';
import { getWithAuth } from '@/utils/authFetch';
import type { WordMasteryPreview, WordMasteryReport } from '@/lib/education/wordMasteryReport';

export type MasteryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'locked'; preview: WordMasteryPreview }
  | { status: 'ready'; report: WordMasteryReport };

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
        setState({ status: 'ready', report: body.report });
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
  const [rows, setRows] = useState<{ id: string; candidates: (string | null | undefined)[] }[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getClassroomStudents(classroomId).then(({ data }) => {
      if (cancelled) return;
      setRows((data ?? []).map((s) => ({ id: s.student_id, candidates: [s.profiles?.display_name, s.profiles?.username] })));
    });
    return () => {
      cancelled = true;
    };
  }, [classroomId, enabled]);

  const names: Record<string, string> = {};
  for (const r of rows) names[r.id] = resolveDisplayName(r.candidates, fallback);
  return names;
}
