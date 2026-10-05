/**
 * TeacherOnboardingChecklist — four activation steps on the teacher dashboard.
 *
 * Empty-state CTAs route each incomplete step to its screen:
 *   create classroom     → first-run card on this page
 *   first assignment     → AssignmentCreator
 *   copy student invite  → copy the student-join payload (persisted)
 *   start live class     → classroom-game launcher (persisted)
 *
 * Completed + not dismissed: Teacher Pro trial CTA.
 * Dismissed or already Pro: hidden.
 */
'use client';

import { useEffect, useState } from 'react';
import { Check, School, ClipboardList, Link2, MonitorPlay } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { NeoPanel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import {
  teacherOnboardingChecklist,
  TEACHER_ONBOARDING_STEPS,
  type TeacherOnboardingStepId,
} from '@/lib/education/teacherOnboardingChecklist';
import { trackTeacherOnboardingStep } from '@/lib/education/telemetry';
import { getClassroomAssignments } from '@/lib/supabase/education/assignments';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { TeacherActivationCompleteCard } from './TeacherActivationCompleteCard';

const STEP_COPY: Record<
  TeacherOnboardingStepId,
  { labelKey: string; ctaKey: string; testId: string }
> = {
  create_classroom: {
    labelKey: 'teacher.onboardingChecklist.createClassroom',
    ctaKey: 'teacher.onboardingChecklist.createClassroomCta',
    testId: 'teacher-onboarding-cta-create-classroom',
  },
  create_first_assignment: {
    labelKey: 'teacher.onboardingChecklist.createAssignment',
    ctaKey: 'teacher.onboardingChecklist.createAssignmentCta',
    testId: 'teacher-onboarding-cta-create-assignment',
  },
  share_join_link: {
    labelKey: 'eduHq.checklist.firstStudent',
    ctaKey: 'teacher.onboardingChecklist.shareJoinCta',
    testId: 'teacher-onboarding-cta-share-join',
  },
  start_live_class: {
    labelKey: 'eduHq.checklist.firstGame',
    ctaKey: 'teacher.onboardingChecklist.startLiveCta',
    testId: 'teacher-onboarding-cta-start-live',
  },
};

const STEP_ICON = {
  create_classroom: School,
  create_first_assignment: ClipboardList,
  share_join_link: Link2,
  start_live_class: MonitorPlay,
} as const;

export interface TeacherOnboardingChecklistProps {
  classroomCount: number;
  assignmentCount: number | null;
  rosterCount: number;
  hasLiveClass?: boolean | null;
  /** @deprecated alias for hasLiveClass */
  hasProgressReport?: boolean | null;
  joinCode?: string | null;
  reportsHref: string;
  onCreateClassroom: () => void;
  onCreateAssignment: () => void;
  onStartLive?: () => void;
  hideCreateClassroomCta?: boolean;
  hideAssignmentCta?: boolean;
  hideStartLiveCta?: boolean;
  inviteCopied?: boolean;
  liveStarted?: boolean;
  dismissed?: boolean;
  hasPro?: boolean;
  onDismiss?: () => void;
  onInviteCopied?: () => void;
  onLiveStarted?: () => void;
  className?: string;
}

export function TeacherOnboardingChecklist({
  classroomCount,
  assignmentCount,
  rosterCount,
  hasLiveClass,
  hasProgressReport,
  joinCode,
  reportsHref: _reportsHref,
  onCreateClassroom,
  onCreateAssignment,
  onStartLive,
  hideCreateClassroomCta = false,
  hideAssignmentCta = false,
  hideStartLiveCta = false,
  inviteCopied,
  liveStarted,
  dismissed = false,
  hasPro = false,
  onDismiss,
  onInviteCopied,
  onLiveStarted,
  className,
}: TeacherOnboardingChecklistProps) {
  const { t, language } = useLanguage();
  const live = hasLiveClass !== undefined ? hasLiveClass : (hasProgressReport ?? null);
  const result = teacherOnboardingChecklist({
    classroomCount,
    assignmentCount,
    rosterCount,
    hasLiveClass: live,
    inviteCopied,
    liveStarted,
  });

  const currentStep = result.current;
  useEffect(() => {
    if (!currentStep) return;
    trackTeacherOnboardingStep({ step: currentStep, action: 'view' });
  }, [currentStep]);

  if (dismissed) return null;
  if (result.complete && hasPro) return null;
  if (result.complete) {
    return <TeacherActivationCompleteCard onDismiss={onDismiss} />;
  }

  const code = (joinCode ?? '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const copyJoin = () => {
    if (!code) return;
    navigator.clipboard
      .writeText(classroomInvitePayload(origin, language, code))
      .then(() => {
        toast.success(t('teacher.classroom.codeCopied'));
        onInviteCopied?.();
      })
      .catch(() => toast.error(t('share.codeCopyError')));
  };

  const runCta = (id: TeacherOnboardingStepId) => {
    trackTeacherOnboardingStep({ step: id, action: 'cta' });
    if (id === 'create_classroom') onCreateClassroom();
    if (id === 'create_first_assignment') onCreateAssignment();
    if (id === 'share_join_link') copyJoin();
    if (id === 'start_live_class') {
      onLiveStarted?.();
      onStartLive?.();
    }
  };

  const hideCta = (id: TeacherOnboardingStepId) => {
    if (id === 'create_classroom') return hideCreateClassroomCta;
    if (id === 'create_first_assignment') return hideAssignmentCta;
    if (id === 'start_live_class') return hideStartLiveCta || !onStartLive;
    return false;
  };

  return (
    <NeoPanel
      tone="navy"
      shadow="md"
      data-testid="teacher-onboarding-checklist"
      data-current={result.current ?? ''}
      className={cn('p-3', className)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-neo-display text-sm font-black uppercase tracking-tight text-neo-white">
          {t('teacher.onboardingChecklist.title')}
        </p>
        <p className="shrink-0 font-neo-body text-xs font-bold text-neo-white/70">
          {t('teacher.onboardingChecklist.progress', {
            done: result.doneCount,
            total: TEACHER_ONBOARDING_STEPS.length,
          })}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={t('teacher.onboardingChecklist.title')}
        aria-valuemin={0}
        aria-valuemax={TEACHER_ONBOARDING_STEPS.length}
        aria-valuenow={result.doneCount}
        className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-neo-cream/50 bg-neo-navy"
      >
        <span
          className="block h-full rounded-full bg-neo-lime transition-[width] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${(result.doneCount / TEACHER_ONBOARDING_STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {result.steps.map((step, index) => {
          const copy = STEP_COPY[step.id];
          const Icon = STEP_ICON[step.id];
          const isCurrent = result.current === step.id;
          return (
            <li
              key={step.id}
              data-testid={`teacher-onboarding-step-${step.id}`}
              data-status={step.status}
              className={cn(
                'flex items-start gap-2 rounded-neo border-2 px-2.5 py-1.5',
                isCurrent && 'sm:col-span-2',
                step.status === 'done'
                  ? 'border-neo-lime/60 bg-neo-navy-light'
                  : isCurrent
                    ? 'border-neo-cyan bg-neo-navy-light'
                    : 'border-neo-cream/30 bg-transparent',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-black font-neo-display text-xs font-black',
                  step.status === 'done' ? 'bg-neo-lime text-black' : 'bg-neo-cream text-black',
                )}
              >
                {step.status === 'done' ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-neo-body text-sm font-bold text-neo-white">
                  <Icon className="size-3.5 shrink-0 text-neo-cyan" aria-hidden="true" />
                  {t(copy.labelKey)}
                </p>
                {isCurrent && !hideCta(step.id) ? (
                  <button
                    type="button"
                    data-testid={copy.testId}
                    onClick={() => runCta(step.id)}
                    disabled={step.id === 'share_join_link' && !code}
                    className={ctaClassName()}
                  >
                    {t(copy.ctaKey)}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </NeoPanel>
  );
}

function ctaClassName() {
  return cn(
    'mt-2 inline-flex min-h-11 items-center justify-center rounded-neo border-3 border-black',
    'bg-neo-cyan px-3 py-2 font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm',
    'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
    'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
    'disabled:cursor-not-allowed disabled:opacity-60',
  );
}

export interface TeacherOnboardingChecklistLiveProps {
  classroomCount: number;
  classroomId: string | null;
  rosterCount: number;
  joinCode?: string | null;
  reportsHref: string;
  onCreateClassroom: () => void;
  onCreateAssignment: () => void;
  onStartLive?: () => void;
  hideCreateClassroomCta?: boolean;
  hideAssignmentCta?: boolean;
  hideStartLiveCta?: boolean;
  hasPro?: boolean;
  className?: string;
}

/**
 * Live wrapper. Assignment count and last-game start unknown and stay unknown
 * on error, so a network blip cannot look like "never assigned / never played".
 * Completions (copy, live start, dismiss) load from the server.
 */
export function TeacherOnboardingChecklistLive({
  classroomCount,
  classroomId,
  rosterCount,
  joinCode,
  reportsHref,
  onCreateClassroom,
  onCreateAssignment,
  onStartLive,
  hideCreateClassroomCta = false,
  hideAssignmentCta = false,
  hideStartLiveCta = false,
  hasPro = false,
  className,
}: TeacherOnboardingChecklistLiveProps) {
  const [assignmentCount, setAssignmentCount] = useState<number | null>(
    classroomCount === 0 ? 0 : null,
  );
  const { games, isLoading: gamesLoading, error: gamesError } = useRecentClassroomGames({
    classroomId: classroomId ?? '',
    limit: 1,
  });
  const { progress, markInviteCopied, markLiveStarted, dismiss } = useTeacherActivationProgress();

  useEffect(() => {
    if (!classroomId) {
      setAssignmentCount(0);
      return;
    }
    let cancelled = false;
    setAssignmentCount(null);
    void getClassroomAssignments(classroomId).then((res) => {
      if (cancelled) return;
      if (res.error) return;
      setAssignmentCount(res.data.length);
    });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  const hasLiveClass = !classroomId
    ? false
    : gamesError
      ? null
      : gamesLoading
        ? null
        : games.length > 0;

  return (
    <TeacherOnboardingChecklist
      classroomCount={classroomCount}
      assignmentCount={assignmentCount}
      rosterCount={rosterCount}
      hasLiveClass={hasLiveClass}
      joinCode={joinCode}
      reportsHref={reportsHref}
      onCreateClassroom={onCreateClassroom}
      onCreateAssignment={onCreateAssignment}
      onStartLive={onStartLive}
      hideCreateClassroomCta={hideCreateClassroomCta}
      hideAssignmentCta={hideAssignmentCta}
      hideStartLiveCta={hideStartLiveCta}
      inviteCopied={progress.inviteCopied}
      liveStarted={progress.liveStarted}
      dismissed={progress.dismissed}
      hasPro={hasPro}
      onDismiss={dismiss}
      onInviteCopied={markInviteCopied}
      onLiveStarted={markLiveStarted}
      className={className}
    />
  );
}

export default TeacherOnboardingChecklistLive;
