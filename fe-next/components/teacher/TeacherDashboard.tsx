/**
 * TeacherDashboard — one screen.
 *
 * It used to be three tabs (Play / Prepare / Review). Measured live at
 * 1440x900, the landing screen carried a Pro banner, a plan badge, a tab bar, a
 * students-present strip, a generic START GAME, a Duel Activity panel and a tip
 * card — and not a single lesson. The lessons a teacher came for were a tab
 * away, so hosting a specific word list cost three taps and a hunt.
 *
 * Now: the lessons ARE the screen, each card hosts itself, and every other
 * surface (classrooms, assignments, last-game insights, analytics, reports)
 * lives in one disclosure that stays shut until asked for.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { EducationHeader } from '@/components/education/EducationHeader';
// Measured as the biggest remaining first-load cost on this dashboard, and it
// renders only for a first-time teacher. `ssr: false` because it is a modal
// nobody sees on the server render anyway.
const TeacherOnboarding = dynamic(
  () => import('@/components/education/TeacherOnboarding').then((m) => m.TeacherOnboarding),
  { ssr: false }
);
import { cn } from '@/lib/utils';
import ClassroomManager from './ClassroomManager';
import LessonBuilder from './LessonBuilder';
import PlayTabFirstRunCard from './PlayTabFirstRunCard';
import QuickStartButton from './QuickStartButton';
import RepeatLastGameButton from './RepeatLastGameButton';
import StudentsPresentStrip from './StudentsPresentStrip';
import { useRecentGameSettings, type GameConfiguration } from '@/hooks/useRecentGameSettings';
import { useClassrooms } from '@/hooks/useClassroom';
import { AssignmentTrackingPanel, AssignmentCreator } from './assignments';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
import { LastGameInsights } from './analytics/LastGameInsights';
import { ProGate } from './ProGate';
import { TeacherPlanBadge } from './TeacherPlanBadge';
import { ProWelcomeCelebration } from './ProWelcomeCelebration';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherDashboardDeepLink } from '@/hooks/useTeacherDashboardDeepLink';
import { BarChart3, FileText, ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { stagger, slideUp } from './teacherDashboardTabs';
import { isTeacherProfile } from '@/lib/education/teacherRole';

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  // `?reviewWords=` is written by the "Practice these words" CTA on the
  // after-game insights card and read here, once, on first render.
  const deepLink = useTeacherDashboardDeepLink();
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [newlyCreatedJoinCode, setNewlyCreatedJoinCode] = useState<string | null>(null);
  const { classrooms, isLoading: classroomsLoading, error: classroomsError, refresh: refreshClassrooms } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const { getMostRecent, hasRecentConfig } = useRecentGameSettings();
  // Only for the one-time gifted-Pro celebration; the header chip reads the
  // entitlement itself. The hook de-duplicates the request across consumers.
  const { grant: proGrant, loading: proLoading } = useTeacherPro();

  const hasTeacherAccess = isTeacherProfile(profile);

  useEffect(() => {
    if (classrooms.length >= 1 && !selectedClassroomId) {
      setSelectedClassroomId(classrooms[0].id);
    }
  }, [classrooms, selectedClassroomId]);

  // Land back here with the missed words in hand, straight into the lesson
  // creator — there is no tab to route to any more.
  const openReviewLesson = useCallback(
    (words: string[]) => {
      router.push(`/${language}/teacher?reviewWords=${encodeURIComponent(words.join(','))}`);
    },
    [router, language]
  );

  const handleQuickStart = useCallback(
    (config: GameConfiguration) => {
      const lessonParam = config.lessonIds[0] || '';
      router.push(`/${language}/education/classroom-game?lessonId=${lessonParam}`);
    },
    [router, language]
  );

  const handleRepeatLast = useCallback(
    (_config: GameConfiguration) => {
      router.push(`/${language}/education/classroom-game?flow=repeatLast`);
    },
    [router, language]
  );

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />
      <TeacherOnboarding />
      {!proLoading && <ProWelcomeCelebration grant={proGrant} />}

      <m.div
        className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <m.div variants={slideUp} className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white">
              {t('teacher.dashboard.title')}
            </h1>
            <p className="text-sm text-neo-white font-neo-body mt-1">
              {t('teacher.dashboard.subtitle')}
            </p>
          </div>
          {/* The plan, at a glance — a gifted teacher must be able to SEE the
              gift took, and a free teacher must never wonder which plan they
              are on. */}
          <TeacherPlanBadge className="shrink-0" />
        </m.div>

        {classroomsError ? (
          // Pessimistic: never show the lessons or an empty card while the
          // classroom read is broken. Solid cream card — the dashboard root is
          // bg-neo-navy, so a translucent red stays dark and text-black would
          // sit at ~1.3:1 against it. The red border carries the semantic.
          <m.div
            variants={slideUp}
            data-testid="play-tab-error-card"
            className="rounded-neo border-3 border-neo-red bg-neo-cream shadow-hard px-6 py-8 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-neo border-2 border-neo-red bg-neo-red/10 shadow-hard-sm">
              <BarChart3 className="h-8 w-8 text-neo-red" />
            </div>
            <p className="text-black font-neo-body font-black text-lg text-balance">
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
                'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all',
                'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
              )}
            >
              {t('teacher.dashboard.retry')}
            </button>
          </m.div>
        ) : (
          <>
            {/* Who is already waiting. One line, and the reason to press host. */}
            {!classroomsLoading && classrooms.length > 0 && (
              <m.div variants={slideUp} className="mb-6">
                <StudentsPresentStrip classrooms={classrooms} />
              </m.div>
            )}

            {/* A teacher with no classroom yet needs a join code before a lesson
                is worth anything, so the first run keeps its own card. */}
            {!classroomsLoading && (classrooms.length === 0 || newlyCreatedJoinCode) && (
              <m.div variants={slideUp} className="mb-6">
                <PlayTabFirstRunCard
                  onJoinCodeCreated={setNewlyCreatedJoinCode}
                  initialJoinCode={newlyCreatedJoinCode}
                />
              </m.div>
            )}

            {hasRecentConfig && classrooms.length > 0 && (
              <m.div variants={slideUp} className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuickStartButton config={getMostRecent()} onClick={handleQuickStart} />
                <RepeatLastGameButton config={getMostRecent()} onClick={handleRepeatLast} />
              </m.div>
            )}

            {/* The screen. Paste words, get a lesson, host it from its card. */}
            <m.div variants={slideUp}>
              <LessonBuilder initialReviewWords={deepLink.reviewWords} />
            </m.div>
          </>
        )}

        {/* Everything that is not "host my words": open only when asked. */}
        {hasTeacherAccess && (
          <details
            data-testid="teacher-tools"
            className="group mt-10 rounded-neo border-2 border-black/30 bg-neo-navy-light"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-5 py-3 font-neo-display font-bold text-neo-white marker:content-none">
              <ChevronDown
                className="size-4 shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
              {t('teacher.dashboard.tools', 'Class tools')}
            </summary>

            <div className="space-y-8 border-t-2 border-black/30 px-5 py-6">
              {/* One classroom picker for every surface below it — it used to be
                  rendered three times, once per section. */}
              {classrooms.length > 1 && (
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="teacher-tools-classroom"
                    className="text-neo-white font-neo-body font-bold text-sm"
                  >
                    {t('teacher.dashboard.selectClassroom')}
                  </label>
                  <select
                    id="teacher-tools-classroom"
                    value={selectedClassroomId}
                    onChange={(e) => setSelectedClassroomId(e.target.value)}
                    className="px-3 py-1.5 bg-neo-cream border-2 border-black text-black font-neo-body font-bold text-sm shadow-hard-sm rounded-neo focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <ClassroomManager />

              {selectedClassroomId && (
                <>
                  {/* "Which words did we miss in the round we just played" is the
                      question a teacher has at the bell — free for everyone. The
                      cross-game trend view below is what Pro sells. */}
                  <LastGameInsights
                    classroomId={selectedClassroomId}
                    onCreateReviewLesson={openReviewLesson}
                  />

                  <AssignmentTrackingPanel
                    classroomId={selectedClassroomId}
                    onCreateAssignment={() => setShowAssignmentCreator(true)}
                  />

                  <ProGate feature="analytics">
                    <AnalyticsDashboard
                      classroomId={selectedClassroomId}
                      onCreateReviewLesson={openReviewLesson}
                    />
                  </ProGate>

                  <Link
                    href={`/${language}/teacher/reports`}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-neo border-2 border-black',
                      'bg-neo-cream shadow-hard hover:shadow-hard-lg transition-shadow',
                      'text-black font-neo-body font-bold'
                    )}
                  >
                    <div className="w-10 h-10 rounded-neo bg-neo-lime border-2 border-black flex items-center justify-center shadow-hard-sm shrink-0">
                      <FileText className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase">{t('teacher.dashboard.viewReports')}</p>
                      <p className="text-xs text-black/60">{t('teacher.dashboard.viewReportsDesc')}</p>
                    </div>
                  </Link>
                </>
              )}
            </div>
          </details>
        )}
      </m.div>

      {selectedClassroomId && (
        <AssignmentCreator
          classroomId={selectedClassroomId}
          isOpen={showAssignmentCreator}
          onClose={() => setShowAssignmentCreator(false)}
          onComplete={() => setShowAssignmentCreator(false)}
        />
      )}
    </div>
  );
}
