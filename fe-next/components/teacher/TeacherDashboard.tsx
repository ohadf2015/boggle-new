/**
 * TeacherDashboard — "Teacher HQ", the one-screen command deck.
 *
 * Zero scroll at phone and desktop, on the observatory art. Class chips pick
 * the class; the hero is START A GAME (mode cards → the express lobby, so a
 * teacher reaches a joinable room in ≤3 taps with the class preselected); the
 * second hero is GET STUDENTS IN (70% of classes never get a student — the join
 * code, link and projector are the product). Lessons, class tools and the Pro
 * ask open as sheets from the dock; nothing stacks into a long column.
 */
'use client';

import { type ReactNode, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TEACHER_TV_SCALE } from '@/components/teacher/hq/tvScale';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
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
import { ProWelcomeCelebration } from './ProWelcomeCelebration';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherDashboardDeepLink } from '@/hooks/useTeacherDashboardDeepLink';
import { useTeacherOnboardingState } from '@/hooks/useOnboardingState';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import {
  trackEduTeacherDashboardViewed,
  trackEduTeacherToolsOpened,
} from '@/lib/education/telemetry';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { GetStudentsInCard } from './hq/GetStudentsInCard';
import { GetStudentsInSkeleton } from './hq/GetStudentsInSkeleton';
import { HqProjectorSheet } from './hq/HqProjectorSheet';
import { HqDock } from './hq/HqDock';
import { HqToolsContent } from './hq/HqToolsContent';

export interface TeacherDashboardProps {
  /**
   * The trial / Pro strip, when the route client has one to show. A slot, not
   * a sibling: next to an `h-dvh` root it grew the page past the viewport.
   * On HQ it lives behind the "Go Pro" dock chip, after the hero.
   */
  banner?: ReactNode;
  /** The usage-triggered Pro card (10+ students / 3+ assignments). Same chip. */
  usagePrompt?: ReactNode;
}

export default function TeacherDashboard({ banner, usagePrompt }: TeacherDashboardProps = {}) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  // `?reviewWords=` is written by the "Practice these words" CTA on the
  // after-game insights card and read here, once, on first render.
  const deepLink = useTeacherDashboardDeepLink();
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState(() => deepLink.reviewWords.length > 0);
  const [proOpen, setProOpen] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [newlyCreatedJoinCode, setNewlyCreatedJoinCode] = useState<string | null>(null);
  // Only ONE fixed overlay at a time: the Pro welcome waits for the first-run
  // walkthrough. Read pessimistically — `completed || skipped` is only true once
  // the flag has actually resolved (pitfall class 1).
  const { isCompleted: onboardingCompleted, isSkipped: onboardingSkipped } =
    useTeacherOnboardingState();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const onboardingClear = onboardingCompleted || onboardingSkipped || onboardingDismissed;
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
  const reportsHref = selectedClassroomId
    ? `/${language}/teacher/reports?classroomId=${selectedClassroomId}`
    : `/${language}/teacher/reports`;

  const openTools = useCallback(
    (open: boolean) => {
      if (open && !toolsOpen) trackEduTeacherToolsOpened(snapshot);
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

  // The whole hand-off: stash what to play (and for which class), then go.
  // The express lobby does the rest — room and code — without another screen.
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

  const hasProChip = !!(banner || usagePrompt);
  const firstRun = !classroomsLoading && (classrooms.length === 0 || !!newlyCreatedJoinCode);

  return (
    <EducationShell
      className={cn(TEACHER_TV_SCALE, isRTL && 'rtl')}
      scrollRegionLabel={t('teacher.dashboard.title')}
      header={<EducationHeader />}
      statusRow={<TeacherStatusRow />}
      contentClassName="relative"
    >
      {/* The walkthrough is gated on having NO classroom: a teacher who has one
          is not first-run, and a fullscreen modal over START is the defect the
          addendum names. Read pessimistically (never while loading). */}
      {!classroomsLoading && classrooms.length === 0 && (
        <TeacherOnboarding onDismiss={() => setOnboardingDismissed(true)} />
      )}
      {!proLoading && onboardingClear && (
        <ProWelcomeCelebration
          grant={proGrant}
          paid={checkoutSuccess && hasPro && proSource === 'polar'}
        />
      )}

      {/* Observatory art behind the deck. Dark-only surface: navy ground,
          never a cream/dark pair (pitfall class 5). No transform anywhere on
          this subtree — the sheets below are `position: fixed`. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image
          src="/images/education/teacher-hq-bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="select-none object-cover"
        />
        <div className="absolute inset-0 bg-neo-navy/55" />
      </div>

      <div
        data-testid="teacher-dashboard-grid"
        className={cn(
          'relative mx-auto flex h-full min-h-0 w-full max-w-[1640px] flex-col gap-2 px-3 py-2',
          'sm:gap-3 sm:px-5 sm:py-3',
          'lg:grid lg:grid-cols-5 lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4 lg:px-8 lg:py-4',
          // A phone turned sideways (844x390) is short, not narrow: the stacked
          // column would be ~2x its height. It gets the desktop split instead.
          '[@media(orientation:landscape)_and_(max-height:500px)]:grid [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-5 [@media(orientation:landscape)_and_(max-height:500px)]:grid-rows-[auto_minmax(0,1fr)] [@media(orientation:landscape)_and_(max-height:500px)]:gap-2 [@media(orientation:landscape)_and_(max-height:500px)]:py-1.5',
        )}
      >
        {/* Top row: which class, and the ONE Tools entry (+ Go Pro chip).
            The shell's tab bar is the nav; nothing else competes with it. The
            dock sits in this row's end but is rendered LAST, so keyboard and
            screen-reader order still meet START before any secondary surface. */}
        <div className="flex min-h-9 shrink-0 items-center gap-2 lg:col-span-5 lg:min-h-10 [@media(orientation:landscape)_and_(max-height:500px)]:col-span-5">
          {/* `contain: inline-size` — a long class name must truncate here, not
              widen the whole shell column past a 390px phone. */}
          <div className="min-w-0 flex-1 [contain:inline-size]">
            {classroomsLoading ? (
              // The chip's slot while the class read is open — the row keeps
              // its height and the name lands in place, never pushes in.
              <span
                data-testid="hq-class-chip-skeleton"
                aria-hidden="true"
                className="block h-9 w-28 animate-pulse rounded-neo border-3 border-neo-cyan/60 bg-neo-navy motion-reduce:animate-none"
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
                className="inline-flex min-h-9 max-w-full items-center rounded-neo border-3 border-black bg-neo-cyan px-3 font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm"
              >
                {/* Class names are DATA, often in the other script (a Latin
                    name under Hebrew UI): `dir="auto"` isolates it and makes
                    the ellipsis land at the name's own end, never a leading
                    "…ERA'S CLASS". `text-start` follows that resolved dir. */}
                <span dir="auto" className="min-w-0 truncate text-start">
                  {selectedClassroom.name}
                </span>
              </span>
            ) : null}
          </div>
          {/* Room for the dock that sits over this row's end (rendered last). */}
          <div aria-hidden="true" className={cn('shrink-0', hasProChip ? 'w-60 sm:w-72' : 'w-36 sm:w-44')} />
        </div>

        {classroomsError ? (
          // Pessimistic: never an empty deck while the classroom read is broken.
          <div
            data-testid="play-tab-error-card"
            className="rounded-neo border-3 border-neo-red bg-neo-cream px-6 py-8 text-center shadow-hard lg:col-span-5 [@media(orientation:landscape)_and_(max-height:500px)]:col-span-5"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-neo border-2 border-neo-red bg-neo-red/10 shadow-hard-sm">
              <BarChart3 className="h-8 w-8 text-neo-red" />
            </div>
            <p className="font-neo-body text-lg font-black text-black text-balance">
              {t('teacher.dashboard.classroomLoadError')}
            </p>
            <p className="mt-1 text-sm font-bold text-black/60 text-pretty">
              {t('teacher.dashboard.classroomLoadErrorHint')}
            </p>
            <button
              type="button"
              onClick={() => refreshClassrooms()}
              data-testid="play-tab-error-retry-button"
              className={cn(
                'mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-neo px-6 py-2.5',
                'border-3 border-black bg-neo-cyan font-neo-display font-black text-black shadow-hard',
                'transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
                'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
              )}
            >
              {t('teacher.dashboard.retry')}
            </button>
          </div>
        ) : (
          <>
            {/* Phone: the hero sizes to its CONTENT (mode cards hold a fixed
                aspect) and the join slot takes what is left — neither column
                may stretch into space the other hasn't claimed yet. */}
            <div
              data-testid="teacher-dashboard-main"
              className="shrink-0 lg:col-span-3 lg:min-h-0 [@media(orientation:landscape)_and_(max-height:500px)]:col-span-3 [@media(orientation:landscape)_and_(max-height:500px)]:min-h-0"
            >
              <PlayNowLauncher onLaunch={handleQuickLaunch} />
            </div>

            <div
              data-testid="teacher-dashboard-aside"
              className="flex min-h-0 flex-1 flex-col lg:col-span-2 [@media(orientation:landscape)_and_(max-height:500px)]:col-span-2"
            >
              {/* Step 2 is ALWAYS mounted, in one frame: skeleton while the
                  class read is open (or the default class is a render away),
                  "create your class" for a teacher with none, else the card. */}
              {firstRun ? (
                // A teacher with no class yet needs a join code before anything.
                <PlayTabFirstRunCard
                  className="flex-1"
                  onJoinCodeCreated={setNewlyCreatedJoinCode}
                  initialJoinCode={newlyCreatedJoinCode}
                />
              ) : selectedClassroom ? (
                <GetStudentsInCard
                  className="flex-1"
                  classroom={{
                    ...selectedClassroom,
                    join_code: selectedClassroom.join_code || '',
                  }}
                  onOpenProjector={() => setProjectorOpen(true)}
                />
              ) : (
                <GetStudentsInSkeleton className="flex-1" />
              )}
            </div>
          </>
        )}

        <HqDock
          className="absolute end-3 top-2 z-10 sm:end-5 sm:top-3 lg:end-8 lg:top-4"
          classroomCount={classrooms.length}
          reportsHref={reportsHref}
          lessonsOpen={lessonsOpen}
          onLessonsOpenChange={setLessonsOpen}
          lessons={<LessonBuilder initialReviewWords={deepLink.reviewWords} />}
          toolsOpen={toolsOpen}
          onToolsOpenChange={openTools}
          tools={
            hasTeacherAccess ? (
              <HqToolsContent
                open={toolsOpen}
                classroomCount={classrooms.length}
                selectedClassroom={selectedClassroom}
                reportsHref={reportsHref}
                hideCreateClassroomCta={classrooms.length === 0 || !!newlyCreatedJoinCode}
                onCreateClassroom={focusCreateClassroom}
                onCreateAssignment={() => setShowAssignmentCreator(true)}
                onInvite={() => focusDeck('hq-copy-link')}
                onPlay={() => focusDeck('play-now-go')}
                onReviewWords={openReviewLesson}
              />
            ) : undefined
          }
          pro={
            banner || usagePrompt ? (
              <>
                {banner}
                {usagePrompt ? (
                  <div data-testid="teacher-dashboard-usage-prompt">{usagePrompt}</div>
                ) : null}
              </>
            ) : undefined
          }
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
