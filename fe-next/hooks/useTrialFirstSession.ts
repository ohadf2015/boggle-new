'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { countClassroomsLessonAssignments } from '@/lib/supabase/education/assignments';
import {
  deriveTrialFirstSession,
  trialFirstSessionHrefs,
  type TrialFirstSessionHrefs,
  type TrialFirstSessionState,
  type TrialFirstSessionStepId,
} from '@/lib/education/trialFirstSessionChecklist';
import {
  captureTeacherActivationStepAbandonedOnce,
  captureTeacherActivationStepCompletedOnce,
} from '@/lib/education/trialFirstSessionTelemetry';

const SCHEDULED_KEY_PREFIX = 'lexi_edu_trial_live_scheduled_';

export interface TrialFirstSessionInput {
  teacherId?: string | null;
  locale: string;
  status?: string | null;
  known?: boolean;
  loading?: boolean;
  classrooms: readonly { id: string; member_count?: number | null }[];
  classroomsReady: boolean;
  liveStarted?: boolean;
  gamesPlayed?: number;
  classroomId?: string | null;
  /** Bump when the assignment creator closes so a new assignment completes the step. */
  assignmentRefreshKey?: string | number;
  onOpenAssignment?: () => void;
}

export interface TrialFirstSessionController {
  checklist: TrialFirstSessionState;
  hrefs: TrialFirstSessionHrefs;
  engage: (step: TrialFirstSessionStepId) => void;
  abandon: (step: TrialFirstSessionStepId) => void;
  dismiss: (step?: TrialFirstSessionStepId | null) => void;
  schedule: () => void;
  openAssignment?: () => void;
}

async function readDismissed(): Promise<boolean> {
  try {
    const res = await fetch('/api/education/teacher/trial-checklist', { cache: 'no-store' });
    if (!res.ok) return false;
    const body = (await res.json()) as { dismissed?: boolean };
    return body.dismissed === true;
  } catch {
    return false;
  }
}

function writeChecklist(patch: { dismissed?: boolean; completed?: boolean }): void {
  void fetch('/api/education/teacher/trial-checklist', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => undefined);
}

export function useTrialFirstSession(input: TrialFirstSessionInput): TrialFirstSessionController {
  const isTrialing = input.status === 'trialing' && input.known === true && input.loading !== true;
  const [dismissed, setDismissed] = useState(false);
  const [scheduledLive, setScheduledLive] = useState(false);
  const [assignmentCount, setAssignmentCount] = useState<number | null>(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState(false);
  const engaged = useRef(false);
  const seen = useRef<Set<string> | null>(null);
  const completedStamped = useRef(false);

  useEffect(() => {
    if (!isTrialing) return;
    let cancelled = false;
    void readDismissed().then((next) => {
      if (!cancelled && next) setDismissed(true);
    });
    try {
      if (input.teacherId && window.localStorage.getItem(`${SCHEDULED_KEY_PREFIX}${input.teacherId}`)) {
        setScheduledLive(true);
      }
    } catch {
      /* storage blocked — schedule stays a click, not a remembered flag */
    }
    return () => {
      cancelled = true;
    };
  }, [isTrialing, input.teacherId]);

  const idsKey = useMemo(() => input.classrooms.map((room) => room.id).filter(Boolean).sort().join(','), [input.classrooms]);

  useEffect(() => {
    if (!isTrialing || !input.classroomsReady) return;
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setAssignmentCount(0);
      setAssignmentsLoading(false);
      setAssignmentsError(false);
      return;
    }
    let cancelled = false;
    setAssignmentsLoading(true);
    void countClassroomsLessonAssignments(ids).then((count) => {
      if (cancelled) return;
      setAssignmentsLoading(false);
      setAssignmentsError(count === null);
      setAssignmentCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [isTrialing, input.classroomsReady, idsKey, input.assignmentRefreshKey]);

  const checklist = useMemo(
    () =>
      deriveTrialFirstSession({
        status: input.status,
        known: input.known,
        loading: input.loading,
        classrooms: input.classrooms,
        assignmentCount,
        assignmentsLoading,
        assignmentsError,
        liveStarted: input.liveStarted,
        gamesPlayed: input.gamesPlayed,
        scheduledLive,
        dismissed,
      }),
    [
      input.status,
      input.known,
      input.loading,
      input.classrooms,
      input.liveStarted,
      input.gamesPlayed,
      isTrialing,
      input.classroomsReady,
      assignmentCount,
      assignmentsLoading,
      assignmentsError,
      scheduledLive,
      dismissed,
    ],
  );

  const hrefs = useMemo(
    () => trialFirstSessionHrefs(input.locale, input.classroomId || input.classrooms[0]?.id || null),
    [input.locale, input.classroomId, input.classrooms],
  );

  useEffect(() => {
    if (!isTrialing || !input.teacherId || !input.classroomsReady || assignmentsLoading) return;
    const doneIds = checklist.steps.filter((step) => step.done).map((step) => step.id);
    if (seen.current === null) {
      seen.current = new Set(doneIds);
      return;
    }
    for (const id of doneIds) {
      if (seen.current.has(id)) continue;
      seen.current.add(id);
      captureTeacherActivationStepCompletedOnce(input.teacherId, id, { locale: input.locale });
    }
    if (checklist.allStepsDone && !completedStamped.current) {
      completedStamped.current = true;
      writeChecklist({ completed: true });
    }
  }, [isTrialing, input.teacherId, input.locale, input.classroomsReady, assignmentsLoading, checklist]);

  const stepToAbandon = checklist.welcomePointsAt;

  useEffect(() => {
    if (!stepToAbandon || !input.teacherId) return;
    const teacherId = input.teacherId;
    const abandonOnPageHide = () => {
      if (engaged.current) return;
      captureTeacherActivationStepAbandonedOnce(teacherId, stepToAbandon, { locale: input.locale });
    };
    window.addEventListener('pagehide', abandonOnPageHide);
    return () => {
      window.removeEventListener('pagehide', abandonOnPageHide);
    };
  }, [stepToAbandon, input.teacherId, input.locale]);

  const engage = (_step: TrialFirstSessionStepId) => {
    engaged.current = true;
  };
  const abandon = (step: TrialFirstSessionStepId) => {
    if (engaged.current || !input.teacherId) return;
    captureTeacherActivationStepAbandonedOnce(input.teacherId, step, { locale: input.locale });
  };
  const dismiss = (step?: TrialFirstSessionStepId | null) => {
    const current = step ?? checklist.current;
    if (current) abandon(current);
    setDismissed(true);
    writeChecklist({ dismissed: true });
  };
  const schedule = () => {
    engaged.current = true;
    setScheduledLive(true);
    try {
      if (input.teacherId) window.localStorage.setItem(`${SCHEDULED_KEY_PREFIX}${input.teacherId}`, String(Date.now()));
    } catch {
      /* the in-memory flag still completes the step this session */
    }
  };

  return {
    checklist,
    hrefs,
    engage,
    abandon,
    dismiss,
    schedule,
    openAssignment: input.onOpenAssignment,
  };
}

/** Lobby and lesson-builder entry. Hidden unless the teacher is on a Polar trial. */
export function useTrialFirstSessionAuto(onOpenAssignment?: () => void): TrialFirstSessionController {
  const { user } = useAuth();
  const { language } = useLanguage();
  const pro = useTeacherPro();
  const classroomsState = useClassrooms();
  const activation = useTeacherActivationProgress();
  const classrooms = classroomsState.classrooms ?? [];
  return useTrialFirstSession({
    teacherId: user?.id,
    locale: language,
    status: pro.status,
    known: pro.known,
    loading: pro.loading,
    classrooms,
    classroomsReady: classroomsState.isLoading !== true && !classroomsState.error,
    liveStarted: activation.progress.liveStarted,
    classroomId: classrooms[0]?.id ?? null,
    onOpenAssignment,
  });
}
