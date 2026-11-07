'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { hasProAccess, isFreePlanUsageBlocked } from '@/lib/education/teacherPlanGate';
import { trackEduClassroomCreated, trackEduFirstAssignmentCreated } from '@/lib/education/telemetry';
import { captureTeacherOnboardingFunnel, TEACHER_ONBOARDING_FUNNEL_EVENTS, teacherFunnelPlan } from '@/lib/education/teacherOnboardingFunnel';
import { assignStarterPack } from '@/lib/education/createLessonFromPack';
import type { Language } from '@/lib/supabase/education/types';
import ClassLimitUpsellModal from '@/components/teacher/ClassLimitUpsellModal';
import { inviteHref } from '@/components/education/lobby/inviteLinks';
import { rememberCreatedClassroom } from '@/lib/education/createdClassroomHandoff';
import { ClassSetupDetails, type SetupBusy } from './ClassSetupDetails';
import { ClassSetupSide } from './ClassSetupSide';
import { classCap, defaultClassLanguage, resolveClassName, type GradeBand } from './classSetupDefaults';
import { packsForLanguage, recommendedPack } from './starterPackPick';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Class details in one step: the class, its join code and its first assignment (the picked pack) come out of one tap. */
export function ClassSetupCreate() {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const router = useRouter();
  const { user } = useAuth();
  const { classrooms, createClassroom } = useClassrooms();
  const { createLesson } = useLessons();
  const { hasPro, status, loading: proLoading, accessTrialExpires } = useTeacherPro();
  const { trial, isLoading: accessLoading } = useTeacherAccess();

  const [name, setName] = useState('');
  const [grade, setGrade] = useState<GradeBand | null>(null);
  const [classLanguage, setClassLanguage] = useState<Language>(() => defaultClassLanguage(language));
  const [packKey, setPackKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<SetupBusy>(null);
  const inFlight = useRef(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState<{ currentCount: number; limit: number } | null>(null);
  const [trialAskDismissed, setTrialAskDismissed] = useState(false);
  const [nowMs] = useState(() => Date.now());
  const proAccess = hasProAccess({ hasPro, accessTrialExpires: accessTrialExpires ?? null }, nowMs);

  const cap = proLoading ? null : classCap({ count: classrooms.length, hasPro: proAccess, limit: FREE_TIER_LIMITS.classes });
  // Expired trial: ask at the entrance to the NEXT class, never in front of the first one.
  const trialAskOpen = classrooms.length > 0 && !accessLoading && !proLoading && !hasPro && !!trial?.isExpired && !trialAskDismissed;

  const packs = packsForLanguage(classLanguage);
  const recommended = recommendedPack(classLanguage, grade);
  const pack = packs.find((p) => p.nameKey === packKey) ?? recommended;

  const create = useCallback(
    async (mode: Exclude<SetupBusy, null>) => {
      if (inFlight.current) return;
      if (isFreePlanUsageBlocked(proAccess, classrooms.length, FREE_TIER_LIMITS.classes)) {
        setLimitHit({ currentCount: classrooms.length, limit: FREE_TIER_LIMITS.classes });
        return;
      }
      inFlight.current = true;
      setBusy(mode);
      setErrorKey(null);
      const finalName = resolveClassName(name, grade, t, classrooms.map((c) => c.name));
      const result = await createClassroom(finalName, classLanguage);
      if (result.success && result.data?.join_code) {
        const classroomId = result.data.id;
        rememberCreatedClassroom(result.data);
        trackEduClassroomCreated({ classroomId, createdVia: 'dashboard', language: result.data.language ?? classLanguage });
        // teacherFunnelPlan, not a hasPro ternary: a trialing teacher must stay plan=trial.
        captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.classroomCreated, {
          locale: language,
          plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
        });
        const assigned = await assignStarterPack({ pack, title: t(pack.nameKey), classroomId, teacherId: user?.id ?? '', createLesson });
        if (assigned.assigned) {
          toast.success(t('teacher.assignment.created'));
          trackEduFirstAssignmentCreated({ classroomId });
        } else {
          toast.error(t('eduShell.setup.assignFailed'));
        }
        const savedLessonId = assigned.success ? assigned.lesson?.id : null;
        const href = inviteHref(language, classroomId, pack.nameKey);
        router.replace(savedLessonId ? `${href}&lessonId=${encodeURIComponent(savedLessonId)}` : href, { scroll: false });
        return;
      }
      inFlight.current = false;
      setBusy(null);
      if (result.code === 'CLASS_LIMIT_REACHED') {
        setLimitHit({ currentCount: result.currentCount ?? classrooms.length, limit: result.limit ?? FREE_TIER_LIMITS.classes });
        return;
      }
      setErrorKey('eduShell.setup.createFailed');
      toast.error(t('eduShell.setup.createFailed'));
    },
    [proAccess, classrooms, name, grade, t, createClassroom, classLanguage, language, hasPro, status, proLoading, router, pack, user?.id, createLesson],
  );

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 px-3 py-3 sm:max-w-2xl sm:gap-4 sm:px-4 sm:py-5 lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8 lg:py-8">
      <ClassSetupSide t={t} />
      <ClassSetupDetails
        name={name}
        onNameChange={setName}
        grade={grade}
        onGradeChange={setGrade}
        language={classLanguage}
        onLanguageChange={setClassLanguage}
        packs={packs}
        pack={pack}
        recommendedKey={recommended.nameKey}
        onPackChange={setPackKey}
        cap={cap}
        busy={busy}
        errorKey={errorKey}
        onStartLive={() => void create('live')}
        skipHref={`/${language}/teacher`}
        t={t}
      />
      {limitHit ? <ClassLimitUpsellModal isOpen onClose={() => setLimitHit(null)} currentCount={limitHit.currentCount} limit={limitHit.limit} /> : null}
      <ClassLimitUpsellModal
        isOpen={trialAskOpen}
        onClose={() => setTrialAskDismissed(true)}
        currentCount={classrooms.length}
        limit={FREE_TIER_LIMITS.classes}
        reason="trial_expired"
        onContinueFree={() => setTrialAskDismissed(true)}
      />
    </div>
  );
}

export default ClassSetupCreate;
