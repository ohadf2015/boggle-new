/** Teacher Home: greeting + coach cue, the class desk hero, ready-to-run sessions, your classes, and a rail with this week + one Pro entry. */
'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { pickHomeAsk } from '@/lib/education/teacherBannerPriority';
import { useTeacherReveal } from './motion/useTeacherReveal';
import { AssignmentCreator } from './assignments';
import { TeacherHqWelcome } from './TeacherHqWelcome';
import { greetingName } from './home/greetingName';
import { HomeHero } from './home/HomeHero';
import { HomeGetStudentsIn } from './home/HomeGetStudentsIn';
import { EndedCodeTriesNotice } from './hq/EndedCodeTriesNotice';
import { belowStudentGoal } from './hq/studentGoal';
import { HomeClassMeta, HomeNewClass } from './home/HomeClassList';
import { StudentCapMeter } from './StudentCapMeter';
import { HomeWeekChallenge } from './home/HomeWeekChallenge';
import { useHomeRoster } from './home/HomeRosterLive';
import { HomeDeskBoard } from './home/HomeDeskBoard';
import { HomeClassInsightCard } from './home/HomeClassInsightCard';
import { HomeOnboardingCard } from './home/HomeOnboardingCard';
import { HomeOnboardingPractice } from './home/HomeOnboardingPractice';
import { HomeHowItWorks } from './home/HomeHowItWorks';
import { HomeReportsDialog, HomeReviewDialog } from './home/HomeDialogs';
import { useAssignCreator } from './home/useAssignCreator';
import { useCheckoutReturn } from './home/useCheckoutReturn';
import { RehearseWithBotsButton } from './home/RehearseWithBotsButton';
import { HomeSessionRail } from './home/HomeSessionRail';
import { SESSIONS_BESIDE_RAIL, TeacherHomeView } from './home/TeacherHomeView';
import { HomeWeekClasses } from './home/HomeWeekClasses';
import { useHomeWeekLoop } from './home/useHomeWeekLoop';
import { weekClassRows } from './home/weekClassRows';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherActivationProgress } from '@/hooks/useTeacherActivationProgress';
import { useTeacherWeekStats } from '@/hooks/useTeacherWeekStats';
import { useClassStudentPreview } from '@/hooks/useClassStudentPreview';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { classLessonProfile, homeCoachCue, homeSessionRail, railLanguages, type RailLesson } from '@/lib/education/homeSessionRail';
import { isPackLanguage } from '@/lib/education/themedPacks';
import { useTeacherDashboardDeepLink } from '@/hooks/useTeacherDashboardDeepLink';
import { trackEduTeacherDashboardViewed } from '@/lib/education/telemetry';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { homeNextStep, homeOnboarding, type HomeOnboardingStepId } from '@/lib/education/homeOnboarding';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { teacherResultsHref } from '@/lib/education/teacherResultsHref';
import { hasProAccess, isDigestOverFreeTierCaps } from '@/lib/education/teacherPlanGate';
import { freeInsightClassId } from '@/lib/education/pro/freeClassInsight';
import { trackFirstRoundGuideClicked, trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';

export interface TeacherDashboardProps {
  /** Account-state strip for a teacher already on (or just off) a Pro trial: days left / renew. */
  banner?: ReactNode;
  /** Billing trouble on a paid plan (declined renewal). Sits right under the greeting, above the desk, with or without classes. */
  alert?: ReactNode;
}

type T = (key: string, params?: Record<string, string | number>) => string;

const WEEK_ROWS = 4;

function greetingKey(hour: number): string {
  if (hour < 12) return 'eduShell.home.greetMorning';
  if (hour < 18) return 'eduShell.home.greetAfternoon';
  return 'eduShell.home.greetEvening';
}

export default function TeacherDashboard({ banner, alert }: TeacherDashboardProps = {}) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const { profile } = useAuth();
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

  const assign = useAssignCreator(deepLink.openAssignment, language);
  const [lessonsOpen, setLessonsOpen] = useState(() => deepLink.reviewWords.length > 0);
  const welcomeKind = useCheckoutReturn(searchParams?.get('checkout') === 'success', pro);

  const studentCount = classrooms.reduce((n, c) => n + (c.member_count ?? 0), 0);
  // Sent once both sources resolve: "0 classrooms" mid-load is a false zero.
  const viewTracked = useRef(false);
  useEffect(() => {
    if (classroomsLoading || proLoading || viewTracked.current) return;
    viewTracked.current = true;
    trackEduTeacherDashboardViewed({ classroomCount: classrooms.length, studentCount, hasPro });
  }, [classroomsLoading, proLoading, classrooms.length, studentCount, hasPro]);

  const onboarding = homeOnboarding({
    classroomCount: classrooms.length,
    studentCount,
    inviteCopied: activation.progress.inviteCopied,
    liveStarted: activation.progress.liveStarted,
    roomOpened: activation.progress.roomOpened,
    gamesPlayed: Object.keys(week.summary?.lastPlayedAt ?? {}).length,
    dismissed: activation.progress.dismissed,
  });
  const newClassHref = `/${language}/teacher/classroom/new`;
  const resultsHref = teacherResultsHref(language, effectiveId);
  const shareCodeHref = effectiveId ? `${newClassHref}?classroomId=${encodeURIComponent(effectiveId)}` : newClassHref;
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

  const accountBanner = hasClasses ? (banner ?? null) : null;

  const showWeek = hasClasses && !(week.summary && Object.keys(week.summary.lastPlayedAt).length === 0);
  const selectedClassroom = classrooms.find((c) => c.id === effectiveId) ?? null;
  const shareCardShown = selectedClassroom !== null && belowStudentGoal(selectedClassroom.member_count);
  const rosterShown = hasPro && selectedClassroom !== null && (selectedClassroom.member_count ?? 0) > 0;
  const roster = useHomeRoster(rosterShown && selectedClassroom ? selectedClassroom.id : '', nowMs);
  const overFreeTierCaps = isDigestOverFreeTierCaps({
    hasPro,
    classroomCount: classrooms.length,
    studentCounts: classrooms.map((c) => c.member_count ?? 0),
  });
  // First-round guide funnel on Home: which onboarding step was on screen, and which was pressed.
  const nextStep = homeNextStep({ onboarding, shareCardShown });
  const nextStepShown = ready && !classroomsError && nextStep !== null && (!hasClasses || week.status !== 'loading');
  // With classes, Home's one Start button replaces the old "next step" strip; the full guide only shows before the first class.
  const onboardingCardShown = nextStepShown && !hasClasses;
  // One ask per screen: the rail Pro card waits until onboarding is known, and yields to it and to account state.
  const askSettled = ready && !classroomsError && (!hasClasses || week.status !== 'loading');
  const freeTeacher = !proLoading && pro.known && !hasProAccess(pro, nowMs);
  const insightClass = classrooms.find((c) => c.id === freeInsightClassId(classrooms)) ?? null;
  const railAsk = pickHomeAsk({
    account: Boolean(accountBanner),
    onboarding: !hasClasses || nextStepShown,
    pro: freeTeacher && insightClass !== null,
  });
  const proCard = askSettled && railAsk === 'pro' && insightClass ? (
    <HomeClassInsightCard classroomId={insightClass.id} className={insightClass.name} language={language} t={t} />
  ) : null;
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
  const hasRail = !ready || proCard !== null || (showWeek && classrooms.length > 1);
  const showSessions = ready && !classroomsError && hasClasses && Boolean(effectiveId);
  const rawClassLanguage = selectedClassroom?.language;
  const classLanguage = isPackLanguage(rawClassLanguage) ? rawClassLanguage : isPackLanguage(language) ? language : 'en';
  const lessonProfile = classLessonProfile(lessons.lessons as unknown as RailLesson[], effectiveId);
  const lastPlayedIso = selectedClassroom ? week.summary?.lastPlayedAt[selectedClassroom.id] : undefined;
  const lastPlayedMs = lastPlayedIso ? Date.parse(lastPlayedIso) : null;
  const railReady = (!lessons.isLoading || lessonsCapped) && week.status !== 'loading';
  const everPlayed = activation.progress.liveStarted || (week.summary?.gamesLast30d ?? 0) > 0;
  const loop = useHomeWeekLoop({
    classroomId: ready && hasClasses && !classroomsError ? effectiveId : '',
    fresh: !activation.progress.liveStarted && week.status !== 'loading' && !lastPlayedIso,
    lessons: lessons.lessons,
    lessonsReady: !lessons.isLoading || lessonsCapped,
    language,
    nowMs,
    t,
  });
  const assignLoopList = () => assign.openWith(loop.listId);
  const cue =ready && hasClasses && week.status !== 'loading'
    ? homeCoachCue({ nowMs, lastPlayedMs, everPlayed, rail: homeSessionRail({ language: classLanguage, gradeBand: null, nowMs, lastPlayedMs }) })
    : null;

  return (
    <TeacherHomeView
      alert={alert ?? null}
      t={t}
      isRTL={isRTL}
      revealRef={revealRef}
      greeting={firstName ? t(greetingKey(hour), { name: firstName }) : t('eduShell.home.greetNoName')}
      cue={ready && hasClasses && !classroomsError ? (cue ? t(cue.key) : '') : null}
      hasPro={hasPro}
      ready={ready}
      error={Boolean(classroomsError)}
      onRetry={() => void classroomsState.refresh?.()}
      hasClasses={hasClasses}
      welcome={!proLoading ? <TeacherHqWelcome welcomeKind={welcomeKind} grant={pro.grant} trialExpires={pro.trialExpires ?? pro.periodEnd} /> : null}
      onboarding={
        <div className="flex min-w-0 flex-col gap-4">
          <HomeOnboardingCard
            onboarding={onboarding}
            hrefs={onboardingHrefs}
            onStepStart={onOnboardingStep}
            variant="full"
            t={t}
            secondary={<HomeOnboardingPractice language={language} t={t} />}
          />
          <HomeHowItWorks t={t} />
        </div>
      }
      desk={
        <>
          {selectedClassroom ? <EndedCodeTriesNotice classroomId={selectedClassroom.id} pro={pro} /> : null}
          <div data-tm>
            <HomeHero
              classrooms={classrooms}
              selectedId={effectiveId}
              onSelect={setSelectedId}
              language={language}
              t={t}
              rehearse={<RehearseWithBotsButton classroomId={effectiveId || undefined} source="hq" language={language} t={t} withSeat label={t('eduShell.home.practice.cta')} />}
              corner={<HomeNewClass href={newClassHref} count={classrooms.length} limit={null} t={t} />}
              capLabel={!proLoading && !hasPro ? t('eduShell.setup.capMeter', { count: classrooms.length, limit: FREE_TIER_LIMITS.classes }) : undefined}
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
              showCode={!shareCardShown}
              replay={loop.replay}
              codeSlot={selectedClassroom && shareCardShown ? <HomeGetStudentsIn classroom={selectedClassroom} /> : undefined}
            />
          </div>
          {selectedClassroom ? (
            <div data-tm>
              <HomeDeskBoard
                key={selectedClassroom.id}
                roster={rosterShown ? roster : null}
                memberCount={selectedClassroom.member_count ?? 0}
                onOpenResults={() => setReportsOpen(true)}
                readyLabel={loop.ready?.kind === 'counts' ? t('eduShell.home.loop.ready', { ready: loop.ready.ready, total: loop.ready.rated }) : null}
                readyEmpty={loop.ready?.kind === 'noResults' ? t('eduShell.home.loop.readyEmpty') : null}
                missed={loop.missed.length > 0 ? { count: loop.missed.length, onHomework: assignLoopList } : null}
                onAssign={assignLoopList}
                onAssignAll={assignLoopList}
                language={language}
                nowMs={nowMs}
                t={t}
              />
            </div>
          ) : null}
          {selectedClassroom ? (
            <div data-tm>
              <HomeWeekChallenge
                key={selectedClassroom.id}
                classroomId={selectedClassroom.id}
                classLanguage={classLanguage}
                lessons={lessons.lessons}
                preferredLessonId={loop.listId ?? null}
                resultsHref={resultsHref}
                onPickList={() => assign.openWith()}
                language={language}
                t={t}
              />
            </div>
          ) : null}
        </>
      }
      sessions={showSessions ? (
        <HomeSessionRail
          key={effectiveId}
          className={hasRail ? SESSIONS_BESIDE_RAIL : undefined}
          compact={!rosterShown}
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
      accountBanner={accountBanner}
      hasRail={hasRail}
      week={showWeek ? {
        summary: week.summary,
        status: week.status,
        classCount: classrooms.length,
        classes: classrooms.length > 1 && week.summary ? (
          <HomeWeekClasses {...weekClassRows(classrooms, week.summary.lastPlayedAt, nowMs, WEEK_ROWS, effectiveId)} selectedId={effectiveId} onSelect={setSelectedId} moreHref={`/${language}/teacher/classroom`} language={language} nowMs={nowMs} t={t} />
        ) : null,
      } : null}
      proCard={proCard}
      fillHeight={rosterShown}
      footer={selectedClassroom ? (
        <div data-testid="dashboard-student-cap-meters">
          <StudentCapMeter key={selectedClassroom.id} classroomName={classrooms.length > 1 ? selectedClassroom.name : undefined} studentCount={selectedClassroom.member_count ?? 0} source="dashboard" />
        </div>
      ) : null}
    >
      {selectedClassroom ? (
        <HomeReportsDialog
          classroom={selectedClassroom}
          open={reportsOpen}
          onOpenChange={setReportsOpen}
          overFreeTierCaps={overFreeTierCaps}
          resultsHref={resultsHref}
          t={t}
        />
      ) : null}
      <HomeReviewDialog open={lessonsOpen} onOpenChange={setLessonsOpen} reviewWords={deepLink.reviewWords} t={t} />

      {effectiveId ? (
        <AssignmentCreator
          classroomId={effectiveId}
          initialLessonId={assign.lessonId}
          isOpen={assign.open}
          onClose={assign.close}
          onComplete={assign.close}
        />
      ) : null}
    </TeacherHomeView>
  );
}
