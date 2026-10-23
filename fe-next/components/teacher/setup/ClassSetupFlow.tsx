'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { isFreePlanUsageBlocked } from '@/lib/education/teacherPlanGate';
import {
  trackEduClassroomCreated,
  trackEduFirstStudentJoined,
  trackEduJoinCodeCopied,
  trackEduJoinCodeShared,
  trackEduJoinCodeShown,
} from '@/lib/education/telemetry';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { useClassRoster } from '@/components/teacher/hq/useClassRoster';
import {
  captureTeacherOnboardingFunnel,
  TEACHER_ONBOARDING_FUNNEL_EVENTS,
  teacherFunnelPlan,
} from '@/lib/education/teacherOnboardingFunnel';
import type { Language } from '@/lib/supabase/education/types';
import { cn } from '@/lib/utils';
import ClassLimitUpsellModal from '@/components/teacher/ClassLimitUpsellModal';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { ClassSetupDetails } from './ClassSetupDetails';
import { ClassReady } from './ClassReady';
import { classCap, defaultClassLanguage, resolveClassName, type GradeBand } from './classSetupDefaults';

type T = (key: string, params?: Record<string, string | number>) => string;

const JOIN_POLL_MS = 5_000;

interface ReadyClass {
  id: string;
  name: string;
  join_code: string;
}

/** Two steps: details → "Your class is ready". `?classroomId=` opens step 2 for an existing class. */
export function ClassSetupFlow() {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { classrooms, createClassroom } = useClassrooms();
  const { hasPro, status, loading: proLoading } = useTeacherPro();
  const { trial, isLoading: accessLoading } = useTeacherAccess();
  const { markInviteCopied } = useTeacherActivationProgress();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeBand | null>(null);
  const [classLanguage, setClassLanguage] = useState<Language>(() => defaultClassLanguage(language));
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [created, setCreated] = useState<ReadyClass | null>(null);
  const [limitHit, setLimitHit] = useState<{ currentCount: number; limit: number } | null>(null);
  const [trialAskDismissed, setTrialAskDismissed] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The create button sits below the fold on phones; without this the ready screen opens mid-scroll with focus on nothing.
  useEffect(() => {
    if (!created) return;
    rootRef.current?.scrollIntoView?.({ block: 'start' });
    document.getElementById('setup-ready-title')?.focus({ preventScroll: true });
  }, [created]);

  const requestedId = searchParams?.get('classroomId') ?? null;
  const existing = requestedId ? classrooms.find((c) => c.id === requestedId) : undefined;
  const ready: ReadyClass | null =
    created ?? (existing?.join_code ? { id: existing.id, name: existing.name, join_code: existing.join_code } : null);

  const readyId = ready?.id ?? null;
  const roster = useClassRoster(readyId, t('teacher.classrooms.students.unknown'), JOIN_POLL_MS);
  const joined = readyId && !roster.loading ? roster.students.length : null;
  const lastJoined = useRef<{ id: string; count: number } | null>(null);
  useEffect(() => {
    if (!readyId || joined === null) return;
    const prev = lastJoined.current;
    lastJoined.current = { id: readyId, count: joined };
    if (prev?.id !== readyId || prev.count !== 0 || joined < 1) return;
    trackEduFirstStudentJoined({ classroomId: readyId });
    captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.studentJoined, {
      locale: language,
      plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
    });
  }, [readyId, joined, language, hasPro, status, proLoading]);

  const cap = proLoading ? null : classCap({ count: classrooms.length, hasPro, limit: FREE_TIER_LIMITS.classes });
  // Expired trial: ask at the entrance to the NEXT class, never in front of the first one.
  const trialAskOpen =
    !ready && classrooms.length > 0 && !accessLoading && !proLoading && !hasPro && !!trial?.isExpired && !trialAskDismissed;

  const submit = useCallback(async () => {
    if (isFreePlanUsageBlocked(hasPro, classrooms.length, FREE_TIER_LIMITS.classes)) {
      setLimitHit({ currentCount: classrooms.length, limit: FREE_TIER_LIMITS.classes });
      return;
    }
    setBusy(true);
    setErrorKey(null);
    const finalName = resolveClassName(name, grade, t, classrooms.map((c) => c.name));
    const result = await createClassroom(finalName, classLanguage);
    setBusy(false);
    if (result.success && result.data?.join_code) {
      trackEduClassroomCreated({ classroomId: result.data.id, createdVia: 'dashboard', language: result.data.language ?? classLanguage });
      // Onboarding-funnel step: card-pinned name, locale + plan only.
      // teacherFunnelPlan, not a hasPro ternary: trialing has hasPro true
      // (proGrant) and must stay plan=trial. A submit before the entitlement
      // read settles is unknown, not free.
      captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.classroomCreated, {
        locale: language,
        plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
      });
      setCreated({ id: result.data.id, name: result.data.name, join_code: result.data.join_code });
      router.replace(`/${language}/teacher/classroom/new?classroomId=${result.data.id}`, { scroll: false });
      return;
    }
    if (result.code === 'CLASS_LIMIT_REACHED') {
      setLimitHit({ currentCount: result.currentCount ?? classrooms.length, limit: result.limit ?? FREE_TIER_LIMITS.classes });
      return;
    }
    setErrorKey('eduShell.setup.createFailed');
    toast.error(t('eduShell.setup.createFailed'));
  }, [name, grade, t, language, classrooms, createClassroom, classLanguage, hasPro, status, proLoading, router]);

  const copy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('eduShell.setup.copied'));
        if (readyId) trackEduJoinCodeCopied({ classroomId: readyId });
      } catch {
        toast.error(t('eduShell.setup.copyFailed'));
      }
    },
    [t, readyId],
  );

  const shown = useCallback(() => {
    markInviteCopied();
    if (readyId) trackEduJoinCodeShown({ classroomId: readyId });
  }, [markInviteCopied, readyId]);

  const nativeShare = useCallback(
    async (share: { title: string; text: string; url: string }) => {
      if (!readyId) return;
      const result = await shareWithFallback({ ...share, clipboardText: share.url });
      if (result === 'shared') trackEduJoinCodeShared({ classroomId: readyId, method: 'native' });
      if (result === 'copied') {
        trackEduJoinCodeShared({ classroomId: readyId, method: 'copy_fallback' });
        toast.success(t('eduShell.setup.copied'));
      }
      if (result === 'failed') toast.error(t('eduShell.setup.copyFailed'));
    },
    [readyId, t],
  );

  return (
    <div ref={rootRef} className="mx-auto flex w-full max-w-xl scroll-mt-4 flex-col gap-5 px-4 py-5 sm:py-8">
      <SetupSteps current={ready ? 2 : 1} t={t} />
      {ready ? (
        <ClassReady
          classroom={ready}
          language={language}
          onShown={shown}
          onCopy={(url) => void copy(url)}
          onShareLink={(method) => trackEduJoinCodeShared({ classroomId: ready.id, method })}
          onNativeShare={(share) => void nativeShare(share)}
          joined={joined}
          onOpenProjector={() => setProjectorOpen(true)}
          t={t}
        />
      ) : (
        <ClassSetupDetails
          name={name}
          onNameChange={setName}
          grade={grade}
          onGradeChange={setGrade}
          language={classLanguage}
          onLanguageChange={setClassLanguage}
          cap={cap}
          busy={busy}
          errorKey={errorKey}
          onSubmit={() => void submit()}
          t={t}
        />
      )}

      {limitHit ? (
        <ClassLimitUpsellModal isOpen onClose={() => setLimitHit(null)} currentCount={limitHit.currentCount} limit={limitHit.limit} />
      ) : null}
      <ClassLimitUpsellModal
        isOpen={trialAskOpen}
        onClose={() => setTrialAskDismissed(true)}
        currentCount={classrooms.length}
        limit={FREE_TIER_LIMITS.classes}
        reason="trial_expired"
        onContinueFree={() => setTrialAskDismissed(true)}
      />
      {projectorOpen && ready ? <HqProjectorSheet classroom={ready} onClose={() => setProjectorOpen(false)} /> : null}
    </div>
  );
}

function SetupSteps({ current, t }: { current: 1 | 2; t: T }) {
  return (
    <ol aria-label={t('eduShell.setup.stepsLabel')} className="flex items-center justify-center gap-2">
      {[1, 2].map((n) => {
        const done = n < current;
        const on = n === current;
        return (
          <li key={n} className="flex items-center gap-2" aria-current={on ? 'step' : undefined}>
            {n > 1 ? <span aria-hidden="true" className={cn('h-[3px] w-10 rounded-full', current >= n ? 'bg-neo-lime' : 'bg-neo-cream/20')} /> : null}
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full border-[2px] font-neo-display text-sm font-black',
                done || on ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-neo-cream/50 text-neo-cream',
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-hidden="true" /> : n}
              <span className="sr-only">{t(n === 1 ? 'eduShell.setup.step1' : 'eduShell.setup.step2')}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default ClassSetupFlow;
