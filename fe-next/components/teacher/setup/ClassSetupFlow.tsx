'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { isFreePlanUsageBlocked } from '@/lib/education/teacherPlanGate';
import { trackEduClassroomCreated } from '@/lib/education/telemetry';
import type { Language } from '@/lib/supabase/education/types';
import { cn } from '@/lib/utils';
import ClassLimitUpsellModal from '@/components/teacher/ClassLimitUpsellModal';
import { HqProjectorSheet } from '@/components/teacher/hq/HqProjectorSheet';
import { ClassSetupDetails } from './ClassSetupDetails';
import { ClassReady } from './ClassReady';
import { classCap, defaultClassLanguage, resolveClassName, type GradeBand } from './classSetupDefaults';

type T = (key: string, params?: Record<string, string | number>) => string;

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
  const { classrooms, createClassroom } = useClassrooms();
  const { hasPro, loading: proLoading } = useTeacherPro();
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

  const requestedId = searchParams?.get('classroomId') ?? null;
  const existing = requestedId ? classrooms.find((c) => c.id === requestedId) : undefined;
  const ready: ReadyClass | null =
    created ?? (existing?.join_code ? { id: existing.id, name: existing.name, join_code: existing.join_code } : null);

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
      setCreated({ id: result.data.id, name: result.data.name, join_code: result.data.join_code });
      return;
    }
    if (result.code === 'CLASS_LIMIT_REACHED') {
      setLimitHit({ currentCount: result.currentCount ?? classrooms.length, limit: result.limit ?? FREE_TIER_LIMITS.classes });
      return;
    }
    setErrorKey('eduShell.setup.createFailed');
    toast.error(t('eduShell.setup.createFailed'));
  }, [name, grade, t, classrooms, createClassroom, classLanguage, hasPro]);

  const copy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('eduShell.setup.copied'));
        markInviteCopied();
      } catch {
        toast.error(t('eduShell.setup.copyFailed'));
      }
    },
    [t, markInviteCopied],
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-5 sm:py-8">
      <SetupSteps current={ready ? 2 : 1} t={t} />
      {ready ? (
        <ClassReady
          classroom={ready}
          language={language}
          onShown={markInviteCopied}
          onCopy={(url) => void copy(url)}
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
