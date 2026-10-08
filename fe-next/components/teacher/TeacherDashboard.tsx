/** Teacher HQ: one primary action chosen by the class's state (create class → get students in → go live + pulse); the rest opens as dock sheets. */
'use client';

import { type ReactNode, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TEACHER_TV_SCALE } from '@/components/teacher/hq/tvScale';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
// First-load cost: modal only for a first-time teacher. ssr:false — overlay.
const TeacherOnboarding = dynamic(
  () => import('@/components/education/TeacherOnboarding').then((m) => m.TeacherOnboarding),
  { ssr: false },
);
import { cn } from '@/lib/utils';
import LessonBuilder from './LessonBuilder';
import PlayTabFirstRunCard from './PlayTabFirstRunCard';
import { PlayNowLauncher } from './dashboard/PlayNowLauncher';
import { ClassSwitcher } from './dashboard/ClassSwitcher';
import {
  QUICK_LAUNCH_FLOW,
  writeQuickLaunchIntent,
  type QuickLaunchIntent,
} from './dashboard/quickLaunchIntent';
import { useClassrooms } from '@/hooks/useClassroom';
import { AssignmentCreator } from './assignments';
import { TeacherStatusRow } from './dashboard/TeacherStatusRow';
import { TeacherTrialUpgradeStatus } from './TeacherTrialUpgradeStatus';
import { ProWelcomeCelebration } from './ProWelcomeCelebration';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherDashboardDeepLink } from '@/hooks/useTeacherDashboardDeepLink';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import {
  trackEduTeacherDashboardViewed,
  trackEduTeacherToolsOpened,
} from '@/lib/education/telemetry';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { liveClassroomHref } from '@/lib/education/startLiveClassCta';
import { GetStudentsInCard } from './hq/GetStudentsInCard';
import { GetStudentsInSkeleton } from './hq/GetStudentsInSkeleton';
import { useFirstAssignmentCta } from './hq/useFirstAssignmentCta';
import { HqProjectorSheet } from './hq/HqProjectorSheet';
import { HqDock } from './hq/HqDock';
import { HqToolsContent, type HqToolsPanel } from './hq/HqToolsContent';
import { pickHqUpsell } from './hq/pickHqUpsell';
import { FirstAssignmentInlineCta } from './hq/FirstAssignmentInlineCta';
import { StartLiveClassCta } from './hq/StartLiveClassCta';
import { HqClassPulse } from './hq/HqClassPulse';
import { HqJoinStrip } from './hq/HqJoinStrip';
import { HqLoadError } from './hq/HqLoadError';
import { pickHqStep, showLauncher } from './hq/hqStep';
import { TeacherOnboardingChecklistLive } from './dashboard/TeacherOnboardingChecklist';
import { shouldShowClassProgressStrip } from '@/lib/education/classProgressStrip';

const QUIET_LINK =
  'inline-flex min-h-10 items-center rounded-neo px-3 font-neo-body text-sm font-bold text-neo-white/70 underline decoration-1 underline-offset-4 transition-colors hover:text-neo-white focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan';

export interface TeacherDashboardProps {
  /**
   * The trial / Pro strip, when the route client has one to show. A slot, not
   * a sibling: next to an `h-dvh` root it grew the page past the viewport.
   * Milestone Pro ask lives behind the "Go Pro" dock chip. Polar trial /
   * expired-trial banners pin to the deck (`pinBanner`) so conversion is not
   * one extra tap behind a chip.
   */
  banner?: ReactNode;
  /** Polar trial countdown / expired-trial: render `banner` on the deck. */
  pinBanner?: boolean;
  /** The usage-triggered Pro card (10+ students / 3+ assignments). Same chip. */
  usagePrompt?: ReactNode;
}

export default function TeacherDashboard({ banner, pinBanner, usagePrompt }: TeacherDashboardProps = {}) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const deepLink = useTeacherDashboardDeepLink();
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(() => deepLink.openAssignment);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsPanel, setToolsPanel] = useState<HqToolsPanel>('home');
  const [lessonsOpen, setLessonsOpen] = useState(() => deepLink.reviewWords.length > 0);
  const [proOpen, setProOpen] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [newlyCreatedJoinCode, setNewlyCreatedJoinCode] = useState<string | null>(null);
  // Only ONE fixed overlay at a time: the Pro welcome stands down while the teacher has the walkthrough open.
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const {
    classrooms,
    isLoading: classroomsLoading,
    error: classroomsError,
    refresh: refreshClassrooms,
  } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const {
    grant: proGrant,
    loading: proLoading,
    hasPro,
    source: proSource,
    refresh: refreshPro,
  } = useTeacherPro();
  // Back from Polar checkout: the webhook can land seconds after the redirect —
  // keep re-reading rather than greet a teacher who just paid with "Upgrade".
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams?.get('checkout') === 'success';
  // "Start game" on a Classes card lands here with its class preselected.
  const requestedClassroomId = searchParams?.get('classroomId') ?? null;
  // One-shot: drop ?assign=1 once read so a refresh doesn't reopen the creator.
  useEffect(() => {
    if (!deepLink.openAssignment) return;
    const rest = new URLSearchParams(searchParams?.toString() ?? '');
    rest.delete('assign');
    const query = rest.toString();
    router.replace(`/${language}/teacher${query ? `?${query}` : ''}`, { scroll: false });
  }, [deepLink.openAssignment, searchParams, router, language]);
  useEffect(() => {
    if (!checkoutSuccess || proLoading || hasPro) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      void refreshPro();
      if (tries >= 8) clearInterval(id);
    }, 2000);
    return () => clearInterval(id);
  }, [checkoutSuccess, proLoading, hasPro, refreshPro]);

  const hasTeacherAccess = isTeacherProfile(profile);

  // Sent once both sources resolve: a "0 classrooms" mid-load is a false zero.
  const snapshotReady = !classroomsLoading && !proLoading;
  const snapshot = useMemo(
    () => ({
      classroomCount: classrooms.length,
      studentCount: classrooms.reduce((n, c) => n + (c.member_count ?? 0), 0),
      hasPro,
    }),
    [classrooms, hasPro],
  );
  const viewTracked = useRef(false);
  useEffect(() => {
    if (!snapshotReady || viewTracked.current) return;
    viewTracked.current = true;
    trackEduTeacherDashboardViewed(snapshot);
  }, [snapshotReady, snapshot]);

  useEffect(() => {
    if (classrooms.length >= 1 && !selectedClassroomId) {
      // Resolved in the same step as the default, never as a second pick that
      // lands later (pitfall class 1). A foreign/stale id falls back.
      const requested = classrooms.find((c) => c.id === requestedClassroomId);
      setSelectedClassroomId((requested ?? classrooms[0]).id);
    }
  }, [classrooms, selectedClassroomId, requestedClassroomId]);

  // Derived, not a second piece of state (pitfall class 1).
  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId) ?? null;
  const { assignmentCount, submittedCount, hasActiveRoom } = useFirstAssignmentCta(
    selectedClassroomId || null,
  );
  const reportsHref = selectedClassroomId
    ? `/${language}/teacher/reports?classroomId=${selectedClassroomId}`
    : `/${language}/teacher/reports`;

  const openTools = useCallback(
    (open: boolean) => {
      if (open && !toolsOpen) trackEduTeacherToolsOpened(snapshot);
      if (!open) setToolsPanel('home');
      setToolsOpen(open);
    },
    [toolsOpen, snapshot],
  );

  /** Close the sheet and put the teacher on a control that is already on the deck. */
  const focusDeck = useCallback((testId: string) => {
    setToolsOpen(false);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.focus(),
    );
  }, []);

  const focusCreateClassroom = useCallback(() => {
    setToolsOpen(false);
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>('[data-testid="first-run-create-class"]')?.focus(),
    );
  }, []);

  // Land back here with the missed words in hand, straight into the lessons.
  const openReviewLesson = useCallback(
    (words: string[]) => {
      router.push(`/${language}/teacher?reviewWords=${encodeURIComponent(words.join(','))}`);
    },
    [router, language],
  );

  const handleQuickLaunch = useCallback(
    (intent: Omit<QuickLaunchIntent, 'createdAt'>) => {
      writeQuickLaunchIntent({
        ...intent,
        ...(selectedClassroomId ? { classroomId: selectedClassroomId } : {}),
      });
      router.push(`/${language}/education/classroom-game?flow=${QUICK_LAUNCH_FLOW}`);
    },
    [router, language, selectedClassroomId],
  );

  const closeProjector = useCallback(() => setProjectorOpen(false), []);

  const [launcherOpen, setLauncherOpen] = useState(false);
  const studentCount = selectedClassroom?.member_count ?? 0;
  const { step, offerFirstAssignment } = pickHqStep({
    classroomsLoading,
    classroomsError: !!classroomsError,
    classroomCount: classrooms.length,
    justCreatedClass: !!newlyCreatedJoinCode,
    hasSelectedClass: !!selectedClassroom,
    studentCount,
    assignmentCount,
    hasActiveRoom,
  });
  const upsell = pickHqUpsell({
    hasBanner: !!banner,
    pinBanner: !!pinBanner,
    hasUsagePrompt: !!usagePrompt,
    hasPro,
    pulseHome:
      step !== 'goLive' ? false : assignmentCount === null ? null : shouldShowClassProgressStrip({ studentCount, assignmentCount }),
  });
  const deck = step === 'goLive';
  // Nothing to put beside the launcher until the class has homework or games: one calm column instead of a half-empty rail.
  const split = deck && !offerFirstAssignment;
  const launcher = <PlayNowLauncher onLaunch={handleQuickLaunch} />;
  const LANDSCAPE = '[@media(orientation:landscape)_and_(max-height:500px)]';
  const launcherShown = showLauncher({ armed: launcherOpen, justCreatedClass: !!newlyCreatedJoinCode });
  const showLauncherLink = (label: string) =>
    launcherShown ? null : (
      <button type="button" data-testid="hq-show-launcher" onClick={() => setLauncherOpen(true)} className={QUIET_LINK}>
        {label}
      </button>
    );

  return (
    <EducationShell
      className={cn(TEACHER_TV_SCALE, isRTL && 'rtl')}
      scrollRegionLabel={t('teacher.dashboard.title')}
      header={<EducationHeader />}
      statusRow={<TeacherStatusRow quietPlan={!upsell.planUpgradeWord} />}
      // HQ fits one tall screen: there the cookie sheet overlays it until a choice is made instead of padding it into a scroll; sideways phones keep the padding so GO LIVE can scroll clear.
      contentClassName="relative [@media(min-height:501px)]:[html.has-cookie-consent_&]:pb-0!"
    >
      {!proLoading && !walkthroughOpen && (
        <ProWelcomeCelebration
          grant={proGrant}
          paid={checkoutSuccess && hasPro && proSource === 'polar'}
        />
      )}

      {/* No transform anywhere on this subtree — the sheets below are `position: fixed`. */}
      <div
        data-testid="teacher-dashboard-grid"
        className={cn(
          // ~1280 content cap: wide monitors keep desktop density without stretching tables.
          'relative mx-auto flex min-h-full min-w-0 w-full max-w-[1280px] flex-col gap-3 px-3 py-2 sm:gap-4 sm:px-5 sm:py-3 lg:px-8 lg:py-4 lg:[@media(max-height:800px)]:py-2',
          deck && !split && 'lg:max-w-2xl',
          split && [
            // 640–1023: two-column (launcher | pulse/detail); <640 stays stacked.
            'sm:grid sm:min-h-0 sm:grid-cols-2 sm:content-start sm:items-start sm:gap-x-6 sm:gap-y-4 lg:gap-x-8 lg:gap-y-5',
            // A phone turned sideways (844x390) is short, not narrow: it gets the desktop split.
            `${LANDSCAPE}:grid ${LANDSCAPE}:min-h-0 ${LANDSCAPE}:grid-cols-2 ${LANDSCAPE}:content-start ${LANDSCAPE}:items-start ${LANDSCAPE}:gap-2 ${LANDSCAPE}:py-1.5`,
          ],
        )}
      >
        {upsell.pinned ? (
          <div data-testid="teacher-dashboard-pinned-banner" data-hq-upsell="pinned" className={cn('sm:col-span-full', `${LANDSCAPE}:col-span-full`)}>
            {banner}
          </div>
        ) : (
          <TeacherTrialUpgradeStatus suppressed={!!pinBanner} />
        )}
        {/* Top row: which class, and the ONE Tools entry (+ Go Pro chip). The dock is rendered LAST so keyboard order meets the primary action first. */}
        <div className={cn('flex min-h-9 shrink-0 items-center gap-2 sm:col-span-full lg:min-h-10', `${LANDSCAPE}:col-span-full`)}>
          {/* `contain: inline-size` — a long class name must truncate here, not widen the shell past a 390px phone. */}
          <div className="min-w-0 flex-1 [contain:inline-size]">
            {classroomsLoading ? (
              <span
                data-testid="hq-class-chip-skeleton"
                aria-hidden="true"
                className="block h-9 w-28 animate-pulse rounded-neo bg-neo-navy-light motion-reduce:animate-none"
              />
            ) : classrooms.length > 1 ? (
              <ClassSwitcher
                className="flex-nowrap overflow-x-auto pb-1 [scrollbar-width:none]"
                classrooms={classrooms}
                selectedId={selectedClassroomId}
                onSelect={setSelectedClassroomId}
                studentLimit={hasPro ? undefined : FREE_TIER_LIMITS.studentsPerClass}
              />
            ) : selectedClassroom ? (
              <span
                data-testid="hq-class-chip"
                className="inline-flex min-h-9 max-w-full items-center font-neo-display text-sm font-bold uppercase tracking-wide text-neo-cyan lg:text-base"
              >
                {/* Class names are DATA, often in another script: `dir="auto"` isolates it so the ellipsis lands at the name's own end. */}
                <span dir="auto" className="min-w-0 truncate text-start">
                  {selectedClassroom.name}
                </span>
              </span>
            ) : null}
            {/* First-run only, and a chip in the empty class slot: a modal here covered the first action on first visit. */}
            {!classroomsLoading && classrooms.length === 0 && (
              <TeacherOnboarding onDismiss={() => setWalkthroughOpen(false)} presentation="chip" onOpenChange={setWalkthroughOpen} />
            )}
          </div>
          {/* Room for the absolute dock at this row's end. */}
          <div
            aria-hidden="true"
            className={cn('shrink-0', upsell.chipVisible ? 'w-36 max-[360px]:w-28 sm:w-60 md:w-72' : 'w-10 sm:w-36 md:w-44')}
          />
        </div>

        {hasTeacherAccess && step !== 'loading' && step !== 'error' ? (
          <div className={cn('sm:col-span-full', `${LANDSCAPE}:col-span-full`)}>
            <TeacherOnboardingChecklistLive
              classroomCount={classrooms.length}
              classroomId={selectedClassroom?.id ?? null}
              rosterCount={studentCount}
              joinCode={selectedClassroom?.join_code}
              reportsHref={reportsHref}
              onCreateClassroom={focusCreateClassroom}
              onCreateAssignment={() => setShowAssignmentCreator(true)}
              onStartLive={() => setLauncherOpen(true)}
              hideCreateClassroomCta={step === 'createClass'}
              hideAssignmentCta={offerFirstAssignment}
              hideStartLiveCta={step === 'goLive'}
              hasPro={hasPro}
              compact
            />
          </div>
        ) : null}
        {step === 'error' ? (
          <HqLoadError onRetry={() => refreshClassrooms()} className={cn('sm:col-span-full', `${LANDSCAPE}:col-span-full`)} />
        ) : step === 'loading' ? (
          <GetStudentsInSkeleton className="mx-auto w-full max-w-2xl" />
        ) : step === 'createClass' || step === 'getStudents' ? (
          <div
            className={cn(
              'mx-auto flex w-full max-w-2xl flex-col gap-3',
              // A just-made class puts its code and GO LIVE side by side on a laptop, so GO LIVE stays above the fold.
              launcherShown && 'lg:max-w-4xl lg:grid lg:grid-cols-2 lg:items-start lg:gap-4',
            )}
          >
            {step === 'createClass' ? (
              <div data-hq-primary="createClass" className="flex flex-col">
                <PlayTabFirstRunCard onJoinCodeCreated={setNewlyCreatedJoinCode} initialJoinCode={newlyCreatedJoinCode} />
              </div>
            ) : selectedClassroom ? (
              <div data-hq-primary="getStudents" className="flex flex-col">
                <GetStudentsInCard
                  classroom={{ ...selectedClassroom, join_code: selectedClassroom.join_code || '' }}
                  onOpenProjector={() => setProjectorOpen(true)}
                />
              </div>
            ) : null}
            {!launcherShown ? (
              <div className="flex justify-center">
                {showLauncherLink(t(step === 'createClass' ? 'hqCalm.playWithoutClass' : 'hqCalm.startAnyway'))}
              </div>
            ) : null}
            {launcherShown ? launcher : null}
          </div>
        ) : (
          <>
            <div
              data-testid="teacher-dashboard-main"
              data-hq-primary="goLive"
              className={cn('min-w-0 shrink-0 sm:col-span-1', `${LANDSCAPE}:col-span-1`)}
            >
              {launcher}
            </div>
            {selectedClassroom ? (
              <>
                <div
                  data-testid="teacher-dashboard-aside"
                  className={cn('flex min-w-0 flex-col gap-3 sm:col-span-1 sm:row-span-2', `${LANDSCAPE}:col-span-1 ${LANDSCAPE}:row-span-2`)}
                >
                  <HqClassPulse
                    classroomId={selectedClassroom.id}
                    studentCount={studentCount}
                    assignmentCount={assignmentCount}
                    submittedCount={submittedCount}
                    hasPro={hasPro}
                    upsell={upsell.pulse}
                    onUpgrade={upsell.chip ? () => setProOpen(true) : undefined}
                    onOpenAssignments={() => {
                      setToolsPanel('assignments');
                      openTools(true);
                    }}
                  />
                  {offerFirstAssignment ? (
                    <div className="flex">
                      <FirstAssignmentInlineCta classroomId={selectedClassroom.id} onCta={() => setShowAssignmentCreator(true)} />
                    </div>
                  ) : null}
                  <StartLiveClassCta
                    classroomId={selectedClassroom.id}
                    studentCount={studentCount}
                    assignmentCount={assignmentCount}
                    joinCode={selectedClassroom.join_code || ''}
                    onStart={() => router.push(liveClassroomHref(language, selectedClassroom.id))}
                  />
                </div>
                <HqJoinStrip
                  className={cn('sm:col-span-1 sm:col-start-1', `${LANDSCAPE}:col-span-1 ${LANDSCAPE}:col-start-1`)}
                  classroomId={selectedClassroom.id}
                  joinCode={selectedClassroom.join_code || ''}
                  studentCount={studentCount}
                  onOpenProjector={() => setProjectorOpen(true)}
                />
              </>
            ) : null}
          </>
        )}

        <HqDock
          className="absolute end-3 top-2 z-10 max-w-[calc(100%-0.75rem)] sm:end-5 sm:top-3 lg:end-8 lg:top-4"
          classroomCount={classrooms.length}
          reportsHref={reportsHref}
          lessonsOpen={lessonsOpen}
          onLessonsOpenChange={setLessonsOpen}
          lessons={<LessonBuilder initialReviewWords={deepLink.reviewWords} />}
          toolsOpen={toolsOpen}
          onToolsOpenChange={openTools}
          onLastGame={() => setToolsPanel('lastGame')}
          hideShortcuts={toolsPanel !== 'home'}
          tools={
            hasTeacherAccess ? (
              <HqToolsContent
                open={toolsOpen}
                panel={toolsPanel}
                onPanelChange={setToolsPanel}
                assignmentCount={assignmentCount}
                classroomCount={classrooms.length}
                selectedClassroom={selectedClassroom}
                reportsHref={reportsHref}
                hideCreateClassroomCta={classrooms.length === 0 || !!newlyCreatedJoinCode}
                onCreateClassroom={focusCreateClassroom}
                onCreateAssignment={() => setShowAssignmentCreator(true)}
                onInvite={() => focusDeck('hq-copy-link')}
                onPlay={() => {
                  setLauncherOpen(true);
                  focusDeck('play-now-go');
                }}
                onReviewWords={openReviewLesson}
              />
            ) : undefined
          }
          pro={
            upsell.chip === 'banner' ? (
              banner
            ) : upsell.chip === 'usage' ? (
              <div data-testid="teacher-dashboard-usage-prompt">{usagePrompt}</div>
            ) : undefined
          }
          proChipHidden={!upsell.chipVisible}
          proOpen={proOpen}
          onProOpenChange={setProOpen}
        />
      </div>

      {projectorOpen && selectedClassroom ? (
        <HqProjectorSheet
          classroom={{
            ...selectedClassroom,
            join_code: selectedClassroom.join_code || '',
          }}
          onClose={closeProjector}
        />
      ) : null}

      {selectedClassroomId && (
        <AssignmentCreator
          classroomId={selectedClassroomId}
          isOpen={showAssignmentCreator}
          onClose={() => setShowAssignmentCreator(false)}
          onComplete={() => setShowAssignmentCreator(false)}
        />
      )}
    </EducationShell>
  );
}
