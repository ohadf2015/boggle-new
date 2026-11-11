'use client';

import { useEffect, useMemo, useState } from 'react';
import { getWithAuth } from '@/utils/authFetch';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import type { HardWord, MasteryTotals } from '@/lib/education/wordMasteryReport';
import type { ClassInsights } from '@/components/teacher/reports/classInsights';
import { classesToFetch, pickSnapshot, type ClassEvidence } from './reteachSnapshotModel';

export type SnapshotState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: ClassEvidence | null };

const READ_CAP_MS = 8000;

/** Settles to undefined on a failed or over-cap read, so one hung class never holds the page. */
export function capped<T>(work: Promise<T>, ms = READ_CAP_MS): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cap = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), ms);
  });
  return Promise.race([work.catch(() => undefined), cap]).finally(() => clearTimeout(timer));
}

interface PickerClass {
  id: string;
  name: string;
  member_count?: number;
}

interface MasteryBody {
  ok?: boolean;
  locked?: boolean;
  report?: { totals: MasteryTotals; hardestWords: HardWord[] };
  preview?: { totals: MasteryTotals; hardestWords: HardWord[] };
  insights?: ClassInsights | null;
}

/** undefined = the read failed; the class still answered when this returns evidence. */
async function loadEvidence(c: PickerClass): Promise<ClassEvidence | undefined> {
  const res = await getWithAuth(`/api/education/classroom/${c.id}/word-mastery`);
  const body: MasteryBody | null = await res.json().catch(() => null);
  const locked = res.status === 402 && !!body?.locked;
  const data = locked ? body?.preview : res.ok ? body?.report : undefined;
  if (!data) return undefined;
  return {
    classroomId: c.id,
    classroomName: c.name,
    sessions: data.totals.sessions,
    classAccuracy: data.totals.classAccuracy,
    words: data.hardestWords,
    needsHelp: locked ? [] : (body?.insights?.students ?? []).filter((s) => s.belowGoal).map((s) => s.studentId),
    locked,
  };
}

/** The one class whose missed words lead the reports page, from the classes that have students. */
export function useReteachSnapshot(classrooms: readonly PickerClass[] | null | undefined): SnapshotState {
  const targets = useMemo(() => classesToFetch(classrooms ?? []), [classrooms]);
  const key = targets.map((c) => c.id).join(',');
  const [state, setState] = useState<SnapshotState>({ status: 'loading' });
  const plan = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const planLoading = plan.loading;
  const pro = !planLoading && hasProAccess(plan, nowMs);

  useEffect(() => {
    if (!classrooms || planLoading) return;
    if (!pro || targets.length === 0) {
      setState({ status: 'ready', snapshot: null });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    Promise.all(targets.map((c) => capped(loadEvidence(c)))).then((all) => {
      if (cancelled) return;
      const answered = all.filter((e): e is ClassEvidence => e !== undefined);
      // No class answered: say nothing rather than show a teacher with games the "first game" example.
      setState(answered.length === 0 ? { status: 'error' } : { status: 'ready', snapshot: pickSnapshot(answered) });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, !!classrooms, planLoading, pro]);

  return state;
}
