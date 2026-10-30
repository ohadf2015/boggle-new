/** Teacher Home: greeting + coach cue, the class desk hero, ready-to-run sessions, your classes, and a rail with this week + one Pro strip. */
'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
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
import { EndedCodeTriesNotice } from './hq/EndedCodeTriesNotice';
import { belowStudentGoal } from './hq/studentGoal';
import { HomeClassMeta, HomeNewClass } from './home/HomeClassList';
import { HomeWeekCard } from './home/HomeWeekCard';
import { HomeInsightCard } from './home/HomeInsightCard';
import { WeeklyProgressDigestCard } from './digest/WeeklyProgressDigestCard';
import { WeeklyEmailReport } from './digest/WeeklyEmailReport';
import { HomeProCard, type HomeProOfferKind } from './home/HomeProCard';
import { HomeOnboardingCard } from './home/HomeOnboardingCard';
import { RehearseWithBotsButton } from './home/RehearseWithBotsButton';
import { HomeSessionRail } from './home/HomeSessionRail';
import { HomeRailSkeleton, HomeSkeleton } from './home/HomeSkeleton';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { useTeacherTrialChecklist } from '@/hooks/useTeacherTrialChecklist';
import { useTeacherWeekStats } from '@/hooks/useTeacherWeekStats';
import { useClassStudentPreview } from '@/hooks/useClassStudentPreview';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { classLessonProfile, homeCoachCue, homeSessionRail, railLanguages, type RailLesson } from '@/lib/education/homeSessionRail';
import { isPackLanguage } from '@/lib/education/themedPacks';
import { teacherAssignHref, useTeacherDashboardDeepLink } from '@/hooks/useTeacherDashboardDeepLink';
import { polarCheckoutWelcomeKind } from '@/lib/education/polarTrial';
import { trackEduTeacherDashboardViewed } from '@/lib/education/telemetry';
import { trackEduProCheckoutReturnLanded } from '@/lib/education/proFunnelTelemetry';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { homeNextStep, homeOnboarding, type HomeOnboardingStepId } from '@/lib/education/homeOnboarding';
import type { TrialChecklistStepId } from '@/lib/education/trialChecklistProgress';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { isDigestOverFreeTierCaps } from '@/lib/education/teacherPlanGate';
import { trackFirstRoundGuideClicked, trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';

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
  const { user, profile } = useAuth();
  const teacherId = user?.id ?? (profile as { id?: string } | null)?.id ?? null;
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
  const trial = useTeacherTrialChecklist({
    teacherId,
    locale: language,
    status: pro.status,
    known: pro.known,
    loading: proLoading,
    classrooms,
    classroomsReady: !classroomsLoading && !classroomsError,
    inviteCopied: activation.progress.inviteCopied,
  });
  const week = useTeacherWeekStats(classrooms, !classroomsLoading && !classroomsError, language);
  const studentPreview = useClassStudentPreview(classrooms, !classroomsLoading && !classroomsError);
  const lessons = useLessons();
  // Fail open: a slow lessons read must not hold the rail; it then ranks without the class grade.
  const [lessonsCapped, setLessonsCapped] = useState(false);
  useEffect(() => {
    if (!lessons.isLoading) return;
    const id = setTimeout(() => setLessonsCapped(true), 2500);
    return () => clearTimeout(id);
  }, [lessons.isLoading]);

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
    setShowAssignmentCreator(true);
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
    studentCount: classrooms.reduce((n, c) => n + (c.member_count ?? 0), 0),
    inviteCopied: activation.progress.inviteCopied,
    liveStarted: activation.progress.liveStarted,
    roomOpened: activation.progress.roomOpened,
    gamesPlayed: Object.keys(week.summary?.lastPlayedAt ?? {}).length,
    dismissed: activation.progress.dismissed,
  });
  const newClassHref = `/${language}/teacher/classroom/new`;
  const shareCodeHref = effectiveId ? `${newClassHref}?classroomId=${encodeURIComponent(effectiveId)}` : newClassHref;
  const assignHref = effectiveId ? teacherAssignHref(language, effectiveId) : `/${language}/teacher?assign=1`;
  const trialHrefs: Record<TrialChecklistStepId, string> = {
    create_classroom: newClassHref,
    invite_students: shareCodeHref,
    first_assignment: assignHref,
  };
  const onboardingHrefs: Record<HomeOnboardingStepId, string> = {
    createClass: newClassHref,
    shareCode: shareCodeHref,
    // Room already open but nobody joined: the next nudge is the invite/QR,
    // not another empty room.
    tryDemo: onboarding.awaitingPlayers
      ? shareCodeHref
      : teacherHostHref(language, { classroomId: effectiveId || undefined, minutes: 2 }),
  };

  const ready = !classroomsLoading && activation.ready;
  const hasClasses = classrooms.length > 0;
  const firstName = greetingName(profile?.display_name);
  const [nowMs] = useState(() => Date.now());
  const hour = new Date(nowMs).getHours();

  // One Pro ask at most: a limit-hit prompt beats the general card. Free teachers see the
  // dashboard Teacher Pro card from day one (even before a first class); Pro teachers never do.
  const accountBanner = hasClasses ? (banner ?? null) : null;
  const proCard = proLoading || hasPro ? null : usagePrompt && hasClasses ? (
    <div data-testid="home-pro-slot">{usagePrompt}</div>
  ) : proOffer ? (
    <HomeProCard kind={proOffer.kind} onDismiss={proOffer.onDismiss} trackImpression={!proOffer.tracked} language={language} t={t} />
  ) : null;

  const showWeek = hasClasses && !(week.summary && Object.keys(week.summary.lastPlayedAt).length === 0);
  const selectedClassroom = classrooms.find((c) => c.id === effectiveId) ?? null;
  const shareCardShown = selectedClassroom !== null && belowStudentGoal(selectedClassroom.member_count);
  const overFreeTierCaps = isDigestOverFreeTierCaps({
    hasPro,
    classroomCount: classrooms.length,
    studentCounts: classrooms.map((c) => c.member_count ?? 0),
  });
  // First-round guide funnel on Home: which onboarding step was on screen, and which was pressed.
  const trialCard = { checklist: trial.checklist, hrefs: trialHrefs, onDismiss: trial.dismiss, onOpenAssignment: () => setShowAssignmentCreator(true) };
  const nextStep = homeNextStep({ onboarding, trial: trial.checklist, shareCardShown });
  const nextStepShown = ready && !classroomsError && nextStep !== null && (!hasClasses || week.status !== 'loading');
  const onboardingCardShown = nextStepShown && nextStep?.source === 'onboarding';
  const onboardingStep = onboarding.current ?? 'tryDemo';
  const guideShownStep = useRef<string | null>(null);
  useEffect(() => {
    if (!onboardingCardShown || guideShownStep.current === onboardingStep) return;
    guideShownStep.current = onboardingStep;
    trackFirstRoundGuideShown({ surface: 'home', locale: language, step: onboardingStep });
  }, [onboardingCardShown, onboardingStep, language]);
  const onOnboardingStep = (step: HomeOnboardingStepId) =>
    trackFirstRoundGuideClicked({ surface: 'home', locale: language, step });
  const revealRef = useTeacherReveal<HTMLDivElement>(`${ready}-${hasClasses}-${Boolean(classroomsError)}`);
  const [reportsOpen, setReportsOpen] = useState(false);
  const hasRail = !ready || proCard !== null || showWeek || Boolean(selectedClassroom);
  const showSessions = ready && !classroomsError && hasClasses && Boolean(effectiveId);
  const rawClassLanguage = selectedClassroom?.language;
  const classLanguage = isPackLanguage(rawClassLanguage) ? rawClassLanguage : isPackLanguage(language) ? language : 'en';
  const lessonProfile = classLessonProfile(lessons.lessons as unknown as RailLesson[], effectiveId);
  const lastPlayedIso = selectedClassroom ? week.summary?.lastPlayedAt[selectedClassroom.id] : undefined;
  const lastPlayedMs = lastPlayedIso ? Date.parse(lastPlayedIso) : null;
  const railReady = (!lessons.isLoading || lessonsCapped) && week.status !== 'loading';
  const everPlayed = activation.progress.liveStarted || (week.summary?.gamesLast30d ?? 0) > 0;
  const cue = ready && hasClasses && week.status !== 'loading'
    ? homeCoachCue({ nowMs, lastPlayedMs, everPlayed, rail: homeSessionRail({ language: classLanguage, gradeBand: null, nowMs, lastPlayedMs }) })
    : null;

  return (
    <EducationShell
      className={cn(isRTL && 'rtl')}
      scrollRegionLabel={t('eduShell.home.regionLabel')}
      contentClassName="relative isolate"
    >
      {!proLoading && (
        <TeacherHqWelcome welcomeKind={welcomeKind} grant={pro.grant} trialExpires={pro.trialExpires ?? pro.periodEnd} />
      )}

      <div
        ref={revealRef}
        data-testid="teacher-home"
        className={cn(
          'mx-auto grid w-full max-w-[1280px] gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:gap-5 lg:px-8 lg:py-5 lg:[@media(max-height:820px)]:gap-4 lg:[@media(max-height:820px)]:py-3',
          hasRail && 'lg:grid-cols-[minmax(0,1fr)_20rem]',
          showSessions && 'lg:min-h-full',
          showSessions && (accountBanner ? 'lg:grid-rows-[auto_1fr_auto]' : 'lg:grid-rows-[auto_1fr]'),
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:col-start-1 lg:row-start-1">
          <header data-tm className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 data-wipe suppressHydrationWarning className="font-neo-display text-2xl font-black text-neo-cream">
                {firstName ? t(greetingKey(hour), { name: firstName }) : t('eduShell.home.greetNoName')}
              </h1>
              {ready && hasClasses && !classroomsError ? (
                <p data-testid="home-coach-cue" suppressHydrationWarning className="mt-0.5 min-h-5 font-neo-body text-sm font-semibold text-neo-cream/75 max-sm:hidden [@media(max-height:760px)]:hidden">
                  {cue ? t(cue.key) : null}
                </p>
              ) : null}
            </div>
            <TeacherPlanBadge quiet className="mt-1 shrink-0 lg:hidden" />
          </header>

          {!ready ? (
            <HomeSkeleton />
          ) : classroomsError ? (
            <HqLoadError onRetry={() => void classroomsState.refresh?.()} />
          ) : (
            <>
              {!hasClasses ? (
                <HomeOnboardingCard
                  onboarding={onboarding}
                  hrefs={onboardingHrefs}
                  trial={trialCard}
                  onStepStart={onOnboardingStep}
                  variant="full"
                  t={t}
                  secondary={<RehearseWithBotsButton classroomId={undefined} source="hq" language={language} t={t} showNote />}
                />
              ) : (
                <>
                  {selectedClassroom ? <EndedCodeTriesNotice classroomId={selectedClassroom.id} /> : null}
                  <div data-tm>
                    <HomeHero
                      classrooms={classrooms}
                      selectedId={effectiveId}
                      onSelect={setSelectedId}
                      language={language}
                      t={t}
                      rehearse={<RehearseWithBotsButton classroomId={effectiveId || undefined} source="hq" language={language} t={t} compact />}
                      corner={<HomeNewClass href={newClassHref} count={classrooms.length} limit={!proLoading && !hasPro ? FREE_TIER_LIMITS.classes : null} t={t} />}
                      meta={selectedClassroom ? (
                        <HomeClassMeta
                          previewIds={studentPreview?.[selectedClassroom.id] ?? []}
                          memberCount={selectedClassroom.member_count ?? 0}
                          played={week.summary?.lastPlayedAt[selectedClassroom.id]}
                          pending={week.status === 'loading'}
                          failed={week.status === 'error'}
                          language={language}
                          nowMs={nowMs}
                          t={t}
                        />
                      ) : null}
                      insight={week.insights?.length ? <HomeInsightCard insights={week.insights} t={t} embedded /> : null}
                      showCode={!shareCardShown}
                      codeSlot={selectedClassroom && shareCardShown ? <HomeGetStudentsIn classroom={selectedClassroom} /> : undefined}
                      nudge={
                        nextStepShown ? (
                          <HomeOnboardingCard onboarding={onboarding} hrefs={onboardingHrefs} trial={trialCard} shareCardShown={shareCardShown} onStepStart={onOnboardingStep} onDismiss={activation.dismiss} variant="compact" t={t} />
                        ) : undefined
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {showSessions ? (
          <HomeSessionRail
            key={effectiveId}
            className={hasRail ? 'lg:col-span-2' : undefined}
            classroomId={effectiveId}
            languages={railLanguages(classLanguage, lessonProfile.languages)}
            gradeBand={lessonProfile.gradeBand}
            nowMs={nowMs}
            lastPlayedMs={lastPlayedMs}
            ready={railReady}
            locale={language}
            t={t}
          />
        ) : null}
        {ready && !classroomsError && hasClasses && accountBanner ? (
          <div data-testid="home-account-banner" className={cn('min-w-0', hasRail && 'lg:col-span-2')}>{accountBanner}</div>
        ) : null}

        {hasRail ? (
          <aside aria-label={t('eduShell.home.railLabel')} className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1">
            {!ready ? <HomeRailSkeleton /> : showWeek ? (
              <div data-tm className="max-lg:hidden">
                <HomeWeekCard summary={week.summary} status={week.status} t={t} />
              </div>
            ) : null}
            {!ready || !selectedClassroom ? null : (
              <div data-testid="home-weekly-reports" data-tm className="max-lg:hidden">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setReportsOpen(true)}
                  className="group flex w-full items-center gap-3 rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light px-3 py-2.5 text-start transition-colors hover:border-neo-cream/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream"
                >
                  <BarChart3 className="size-5 shrink-0 text-neo-cream/80" strokeWidth={2.5} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-neo-display text-base font-bold text-neo-cream">{t('eduShell.home.weeklyReports')}</span>
                    <span className="block font-neo-body text-xs font-semibold leading-snug text-neo-cream/70 [@media(max-height:820px)]:sr-only">{t('eduShell.home.weeklyReportsHint')}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-neo-cream/70 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 motion-reduce:transition-none" aria-hidden="true" />
                </button>
              </div>
            )}
            {proCard ? <div data-tm>{proCard}</div> : null}
          </aside>
        ) : null}
      </div>

      {selectedClassroom ? (
        <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
          <DialogContent
            closeButtonLabel={t('common.close')}
            closeButtonVariant="minimal"
            style={{ backgroundImage: 'none' }}
            className="max-h-[90dvh] w-[calc(100%-1.5rem)] overflow-auto border-2 border-neo-cream/40 bg-neo-navy p-5 text-neo-cream dark:border-neo-cream/40 dark:bg-neo-navy sm:max-w-3xl lg:max-w-5xl"
          >
            <DialogTitle className="pe-12 font-neo-display text-xl font-black normal-case tracking-normal text-neo-cream">{t('eduShell.home.weeklyReports')}</DialogTitle>
            <DialogDescription className="mb-4 font-neo-body text-sm text-neo-cream/70">
              {selectedClassroom.name} · {t('eduShell.home.weeklyReportsHint')}
            </DialogDescription>
            <div data-testid="home-weekly-reports-grid" className="grid items-start gap-4 lg:grid-cols-2">
              <WeeklyProgressDigestCard classroomId={selectedClassroom.id} classroomName={selectedClassroom.name} overFreeTierCaps={overFreeTierCaps} />
              <WeeklyEmailReport classroomId={selectedClassroom.id} classroomName={selectedClassroom.name} />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
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
          onComplete={() => {
            setShowAssignmentCreator(false);
            trial.refreshAssignments();
          }}
        />
      ) : null}
    </EducationShell>
  );
}
