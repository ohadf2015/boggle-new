'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countClassroomsLessonAssignments } from '@/lib/supabase/education/assignments';
import {
  applyTrialChecklistPatch,
  deriveTrialChecklist,
  EMPTY_TRIAL_CHECKLIST_PROGRESS,
  type TrialChecklistPatch,
  type TrialChecklistProgress,
  type TrialChecklistState,
} from '@/lib/education/trialChecklistProgress';
import {
  captureTrialChecklistAllCompletedOnce,
  captureTrialChecklistShownOnce,
  captureTrialChecklistStepCompletedOnce,
} from '@/lib/education/trialChecklistTelemetry';

async function readTrialProgress(): Promise<TrialChecklistProgress> {
  try {
    const res = await fetch('/api/education/teacher/trial-checklist', { cache: 'no-store' });
    if (!res?.ok) return { ...EMPTY_TRIAL_CHECKLIST_PROGRESS };
    const body = (await res.json()) as Partial<TrialChecklistProgress>;
    return {
      dismissed: body.dismissed === true,
      completed: body.completed === true,
    };
  } catch {
    return { ...EMPTY_TRIAL_CHECKLIST_PROGRESS };
  }
}

async function writeTrialProgress(patch: TrialChecklistPatch): Promise<void> {
  try {
    await fetch('/api/education/teacher/trial-checklist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  } catch {
    /* session-local optimistic state still holds */
  }
}

export interface UseTeacherTrialChecklistInput {
  teacherId?: string | null;
  locale?: string;
  status?: string | null;
  known?: boolean;
  loading?: boolean;
  classrooms: readonly { id: string; member_count?: number | null }[];
  classroomsReady: boolean;
  inviteCopied: boolean;
}

export interface UseTeacherTrialChecklistResult {
  checklist: TrialChecklistState;
  progress: TrialChecklistProgress;
  ready: boolean;
  dismiss: () => void;
  refreshAssignments: () => void;
}

export function useTeacherTrialChecklist(
  input: UseTeacherTrialChecklistInput,
): UseTeacherTrialChecklistResult {
  const isTrialing =
    input.status === 'trialing' &&
    input.known === true &&
    input.loading !== true;

  const [progress, setProgress] = useState<TrialChecklistProgress>(
    EMPTY_TRIAL_CHECKLIST_PROGRESS,
  );
  const [ready, setReady] = useState(false);
  const completedOnLoadRef = useRef(false);
  const completionStampedRef = useRef(false);

  useEffect(() => {
    if (!isTrialing) return;
    let cancelled = false;
    void readTrialProgress().then((next) => {
      if (cancelled) return;
      if (next.completed) {
        completedOnLoadRef.current = true;
        completionStampedRef.current = true;
      }
      setProgress(next);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isTrialing]);

  const idsKey = useMemo(
    () => input.classrooms.map((c) => c.id).sort().join(','),
    [input.classrooms],
  );
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [assignmentState, setAssignmentState] = useState<{
    key: string;
    version: number;
    count: number | null;
  }>({ key: '', version: 0, count: null });

  useEffect(() => {
    if (!isTrialing || !input.classroomsReady) return;
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setAssignmentState({ key: idsKey, version: refreshVersion, count: 0 });
      return;
    }
    let cancelled = false;
    void countClassroomsLessonAssignments(ids).then((count) => {
      if (cancelled) return;
      setAssignmentState({ key: idsKey, version: refreshVersion, count });
    });
    return () => {
      cancelled = true;
    };
  }, [isTrialing, input.classroomsReady, idsKey, refreshVersion]);

  const assignmentsLoaded =
    input.classroomsReady &&
    (idsKey === '' ||
      (assignmentState.key === idsKey && assignmentState.version === refreshVersion));
  const assignmentCount = assignmentsLoaded
    ? idsKey === ''
      ? 0
      : assignmentState.count
    : null;

  const checklist = useMemo(
    () =>
      deriveTrialChecklist({
        status: input.status,
        known: input.known,
        loading: input.loading,
        classrooms: input.classrooms,
        inviteCopied: input.inviteCopied,
        assignmentCount,
        assignmentsLoading: !assignmentsLoaded,
        dismissed: progress.dismissed,
        completed: progress.completed,
      }),
    [
      input.status,
      input.known,
      input.loading,
      input.classrooms,
      input.inviteCopied,
      assignmentCount,
      assignmentsLoaded,
      progress.dismissed,
      progress.completed,
    ],
  );

  const patch = useCallback((partial: TrialChecklistPatch) => {
    setProgress((current) => applyTrialChecklistPatch(current, partial));
    void writeTrialProgress(partial);
  }, []);

  useEffect(() => {
    if (!isTrialing || !ready || completedOnLoadRef.current) return;

    for (const step of checklist.steps) {
      if (step.done) {
        captureTrialChecklistStepCompletedOnce(input.teacherId, step.id, {
          locale: input.locale,
          alreadyCompleted: completedOnLoadRef.current,
        });
      }
    }

    if (checklist.allStepsDone) {
      captureTrialChecklistAllCompletedOnce(input.teacherId, {
        locale: input.locale,
        alreadyCompleted: completedOnLoadRef.current,
      });
      if (!completionStampedRef.current) {
        completionStampedRef.current = true;
        patch({ completed: true });
      }
      return;
    }

    if (checklist.visible) {
      captureTrialChecklistShownOnce(input.teacherId, {
        locale: input.locale,
        done_count: checklist.doneCount,
      });
    }
  }, [
    isTrialing,
    ready,
    checklist,
    input.teacherId,
    input.locale,
    patch,
  ]);

  const dismiss = useCallback(() => patch({ dismissed: true }), [patch]);
  const refreshAssignments = useCallback(() => {
    setRefreshVersion((v) => v + 1);
  }, []);

  return {
    checklist,
    progress,
    ready,
    dismiss,
    refreshAssignments,
  };
}
