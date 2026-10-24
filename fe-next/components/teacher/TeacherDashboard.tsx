/** Teacher Home: greeting, one "start a game" hero, your classes, and a rail with this week + one Pro card. */
'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTeacherReveal } from './motion/useTeacherReveal';
import LessonBuilder from './LessonBuilder';
import { AssignmentCreator } from './assignments';
import { TeacherHqWelcome } from './TeacherHqWelcome';
import { TeacherPlanBadge } from './TeacherPlanBadge';
import { HqLoadError } from './hq/HqLoadError';
import { greetingName } from './home/greetingName';
import { HomeHero } from './home/HomeHero';
import { HomeGetStudentsIn } from './home/HomeGetStudentsIn';
import { belowStudentGoal } from './hq/studentGoal';
import { HomeClassList } from './home/HomeClassList';
import { HomeWeekCard } from './home/HomeWeekCard';
import { HomeInsightCard } from './home/HomeInsightCard';
import { WeeklyProgressDigestCard } from './digest/WeeklyProgressDigestCard';
import { WeeklyEmailReport } from './digest/WeeklyEmailReport';
import { HomeProCard, type HomeProOfferKind } from './home/HomeProCard';
import { HomeOnboardingCard } from './home/HomeOnboardingCard';
import { HomeRailSkeleton, HomeSkeleton } from './home/HomeSkeleton';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { useTeacherWeekStats } from '@/hooks/useTeacherWeekStats';
import { useClassStudentPreview } from '@/hooks/useClassStudentPreview';
import { useTeacherDashboardDeepLink } from '@/hooks/useTeacherDashboardDeepLink';
import { polarCheckoutWelcomeKind } from '@/lib/education/polarTrial';
import { trackEduTeacherDashboardViewed } from '@/lib/education/telemetry';
import { trackEduProCheckoutReturnLanded } from '@/lib/education/proFunnelTelemetry';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { homeOnboarding, type HomeOnboardingStepId } from '@/lib/education/homeOnboarding';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { isDigestOverFreeTierCaps } from '@/lib/education/teacherPlanGate';

export interface TeacherDashboardProps {
  /** Account-state strip for a teacher already on (or just off) a Pro trial: days left / renew. */
  banner?: ReactNode;
  /** The one free-teacher Pro ask, picked by the route client. Rendered as the rail card. */
  proOffer?: { kind: HomeProOfferKind; onDismiss: () => void; tracked: boolean } | null;
  /** Kept for the route client's contract: a pinned banner also lives in the Pro slot. */
  pinBanner?: boolean;
  /** The usage-triggered Pro card (10+ students / 3+ assignments). Same slot. */
  usagePrompt?: ReactNode;
}

type T = (key: string, params?: Record<string, string | number>) => string;

function greetingKey(hour: number): string {
  if (hour < 12) return 'eduShell.home.greetMorning';
  if (hour < 18) return 'eduShell.home.greetAfternoon';
  return 'eduShell.home.greetEvening';
}

export default function TeacherDashboard({ banner, proOffer, usagePrompt }: TeacherDashboardProps = {}) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLink = useTeacherDashboardDeepLink();
  const isRTL = language === 'he';

  const classroomsState = useClassrooms();
  const classrooms = useMemo(() => classroomsState.classrooms ?? [], [classroomsState.classrooms]);
  const classroomsLoading = classroomsState.isLoading === true;
  const classroomsError = classroomsState.error ?? null;
  const pro = useTeacherPro();
  const { hasPro, loading: proLoading } = pro;
  const activation = useTeacherActivationProgress();
  const week = useTeacherWeekStats(classrooms, !classroomsLoading && !classroomsError, language);
  const studentPreview = useClassStudentPreview(classrooms, !classroomsLoading && !classroomsError);

  const [selectedId, setSelectedId] = useState('');
  const requestedClassroomId = searchParams?.get('classroomId') ?? null;
  // Resolved together with the default, never as a second pick that lands later (pitfall class 1).
  const effectiveId =
    classrooms.find((c) => c.id === selectedId)?.id ??
    classrooms.find((c) => c.id === requestedClassroomId)?.id ??
    classrooms[0]?.id ??
    '';

  const [showAssignmentCreator, setShowAssignmentCreator] = useState(() => deepLink.openAssignment);
  const [lessonsOpen, setLessonsOpen] = useState(() => deepLink.reviewWords.length > 0);
  // One-shot: drop ?assign=1 once read so a refresh doesn't reopen the creator.
  useEffect(() => {
    if (!deepLink.openAssignment) return;
    const rest = new URLSearchParams(searchParams?.toString() ?? '');
    rest.delete('assign');
    const query = rest.toString();
    router.replace(`/${language}/teacher${query ? `?${query}` : ''}`, { scroll: false });
  }, [deepLink.openAssignment, searchParams, router, language]);

  // Back from Polar checkout: the webhook can land after the redirect, so keep re-reading.
  const checkoutSuccess = searchParams?.get('checkout') === 'success';
  // Unconditional on entitlement — fires even if the webhook never lands, so it can
  // distinguish "webhook broken" (this fires, checkout_complete never does) from
  // "user abandoned on Polar" (neither fires).
  const returnLandedTracked = useRef(false);
  useEffect(() => {
    if (!checkoutSuccess || returnLandedTracked.current) return;
    returnLandedTracked.current = true;
    trackEduProCheckoutReturnLanded();
  }, [checkoutSuccess]);
  const refreshPro = pro.refresh;
  useEffect(() => {
    if (!checkoutSuccess || proLoading || hasPro || !refreshPro) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      void refreshPro();
      if (tries >= 8) clearInterval(id);
    }, 2000);
    return () => clearInterval(id);
  }, [checkoutSuccess, proLoading, hasPro, refreshPro]);
  const welcomeKind = polarCheckoutWelcomeKind({
    checkoutSuccess,
    hasPro,
    source: pro.source,
    status: pro.status ?? 'active',
  });

  // Sent once both sources resolve: "0 classrooms" mid-load is a false zero.
  const viewTracked = useRef(false);
  useEffect(() => {
    if (classroomsLoading || proLoading || viewTracked.current) return;
    viewTracked.current = true;
    trackEduTeacherDashboardViewed({
      classroomCount: classrooms.length,
      studentCount: classrooms.reduce((n, c) => n + (c.member_count ?? 0), 0),
      hasPro,
    });
  }, [classroomsLoading, proLoading, classrooms, hasPro]);

  const onboarding = homeOnboarding({
    classroomCount: classrooms.length,
    inviteCopied: activation.progress.inviteCopied,
    liveStarted: activation.progress.liveStarted,
    dismissed: activation.progress.dismissed,
  });
  const newClassHref = `/${language}/teacher/classroom/new`;
  const onboardingHrefs: Record<HomeOnboardingStepId, string> = {
    createClass: newClassHref,
    shareCode: effectiveId ? `${newClassHref}?classroomId=${encodeURIComponent(effectiveId)}` : newClassHref,
    tryDemo: teacherHostHref(language, { classroomId: effectiveId || undefined, minutes: 2 }),
  };

  const ready = !classroomsLoading && activation.ready;
  const hasClasses = classrooms.length > 0;
  const firstName = greetingName(profile?.display_name);
  const [nowMs] = useState(() => Date.now());
  const hour = new Date(nowMs).getHours();
  const proHref = `/${language}/teacher/upgrade`;

  // One Pro ask at most, and none before a first class: a limit-hit prompt beats the general card.
  const accountBanner = hasClasses ? (banner ?? null) : null;
  const proCard = !hasClasses || proLoading || hasPro ? null : usagePrompt ? (
    <div data-testid="home-pro-slot">{usagePrompt}</div>
  ) : proOffer ? (
    <HomeProCard kind={proOffer.kind} href={proHref} onDismiss={proOffer.onDismiss} trackImpression={!proOffer.tracked} language={language} t={t} />
  ) : null;

  const showWeek = hasClasses && !(week.summary && Object.keys(week.summary.lastPlayedAt).length === 0);
  const selectedClassroom = classrooms.find((c) => c.id === effectiveId) ?? null;
  const shareCardShown = selectedClassroom !== null && belowStudentGoal(selectedClassroom.member_count);
  const overFreeTierCaps = isDigestOverFreeTierCaps({
    hasPro,
    classroomCount: classrooms.length,
    studentCounts: classrooms.map((c) => c.member_count ?? 0),
  });
  const revealRef = useTeacherReveal<HTMLDivElement>(`${ready}-${hasClasses}-${Boolean(classroomsError)}`);
  const hasRail = !ready || proCard !== null || showWeek || Boolean(selectedClassroom);

  return (
    <EducationShell
      className={cn(isRTL && 'rtl')}
      scrollRegionLabel={t('eduShell.home.regionLabel')}
      contentClassName="relative"
    >
      {!proLoading && (
        <TeacherHqWelcome welcomeKind={welcomeKind} grant={pro.grant} trialExpires={pro.trialExpires ?? pro.periodEnd} />
      )}

      <div
        ref={revealRef}
        data-testid="teacher-home"
        className={cn('mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6', hasRail && 'lg:grid-cols-[minmax(0,1fr)_20rem]')}
      >
        <div className="flex min-w-0 flex-col gap-6">
          <header data-tm className="flex flex-wrap items-center justify-between gap-3">
            <h1 suppressHydrationWarning className="font-neo-display text-2xl font-black text-neo-cream sm:text-3xl">
              {firstName ? t(greetingKey(hour), { name: firstName }) : t('eduShell.home.greetNoName')}
            </h1>
            <TeacherPlanBadge quiet className="shrink-0" />
          </header>

          {!ready ? (
            <HomeSkeleton />
          ) : classroomsError ? (
            <HqLoadError onRetry={() => void classroomsState.refresh?.()} />
          ) : !hasClasses ? (
            <HomeOnboardingCard onboarding={onboarding} hrefs={onboardingHrefs} variant="full" t={t} />
          ) : (
            <>
              {onboarding.visible && !(onboarding.current === 'shareCode' && shareCardShown) ? (
                <HomeOnboardingCard
                  onboarding={onboarding}
                  hrefs={onboardingHrefs}
                 
                  onDismiss={activation.dismiss}
                  variant="compact"
                  t={t}
                />
              ) : null}
              {selectedClassroom ? <HomeGetStudentsIn classroom={selectedClassroom} /> : null}
              <div data-tm>
                <HomeHero
                  classrooms={classrooms}
                  selectedId={effectiveId}
                  onSelect={setSelectedId}
                  language={language}
                  t={t}
                />
              </div>
              <div data-tm>
                <HomeClassList
                  classrooms={classrooms}
                  studentPreview={studentPreview}
                  lastPlayedAt={week.summary?.lastPlayedAt ?? null}
                  activityFailed={week.status === 'error'}
                  newClassHref={newClassHref}
                  classLimit={!proLoading && !hasPro ? FREE_TIER_LIMITS.classes : null}
                  language={language}
                  nowMs={nowMs}
                  t={t}
                />
              </div>
              {accountBanner ? <div data-testid="home-account-banner">{accountBanner}</div> : null}
            </>
          )}
        </div>

        {hasRail ? (
          <aside aria-label={t('eduShell.home.railLabel')} className="flex min-w-0 flex-col gap-6">
            {proCard}
            {!ready ? <HomeRailSkeleton /> : showWeek ? (
              <>
                <div data-tm><HomeInsightCard insights={week.insights} t={t} /></div>
                <div data-tm><HomeWeekCard summary={week.summary} status={week.status} t={t} /></div>
              </>
            ) : null}
            {!ready || !selectedClassroom ? null : (
              <WeeklyProgressDigestCard
                classroomId={selectedClassroom.id}
                classroomName={selectedClassroom.name}
                overFreeTierCaps={overFreeTierCaps}
              />
            )}
            {!ready || !selectedClassroom ? null : (
              <WeeklyEmailReport
                classroomId={selectedClassroom.id}
                classroomName={selectedClassroom.name}
              />
            )}
          </aside>
        ) : null}
      </div>

      <Dialog open={lessonsOpen} onOpenChange={setLessonsOpen}>
        <DialogContent className="max-h-[90dvh] overflow-auto border-[3px] border-neo-cream bg-neo-navy sm:max-w-3xl">
          <DialogTitle className="font-neo-display text-xl font-black text-neo-cream">{t('eduShell.home.reviewTitle')}</DialogTitle>
          {lessonsOpen ? <LessonBuilder initialReviewWords={deepLink.reviewWords} /> : null}
        </DialogContent>
      </Dialog>

      {effectiveId ? (
        <AssignmentCreator
          classroomId={effectiveId}
          isOpen={showAssignmentCreator}
          onClose={() => setShowAssignmentCreator(false)}
          onComplete={() => setShowAssignmentCreator(false)}
        />
      ) : null}
    </EducationShell>
  );
}
