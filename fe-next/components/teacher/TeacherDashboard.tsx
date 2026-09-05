/**
 * TeacherDashboard - Friendly Homeroom Edition
 *
 * 3-tab layout matching a teacher's daily workflow:
 * - Play: Start games, quick start, duel activity
 * - Prepare: Classrooms + Lesson builder
 * - Review: Analytics, assignments, reports
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { TeacherOnboarding } from '@/components/education/TeacherOnboarding';
import { TeacherWelcomeBanner } from '@/components/education/TeacherWelcomeBanner';
import { cn } from '@/lib/utils';
import ClassroomManager from './ClassroomManager';
import LessonBuilder from './LessonBuilder';
import PlayTabFirstRunCard from './PlayTabFirstRunCard';
import QuickStartButton from './QuickStartButton';
import StudentsPresentStrip from './StudentsPresentStrip';
import { useRecentGameSettings, type GameConfiguration } from '@/hooks/useRecentGameSettings';
import { useClassrooms } from '@/hooks/useClassroom';
import { AssignmentTrackingPanel, AssignmentCreator } from './assignments';
import { DuelMonitoringPanel } from './dashboard';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
import { LastGameInsights } from './analytics/LastGameInsights';
import { ProGate } from './ProGate';
import { CurriculumWordListBrowser } from './curriculum/CurriculumWordListBrowser';
import { TeacherPlanBadge } from './TeacherPlanBadge';
import { ProWelcomeCelebration } from './ProWelcomeCelebration';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import {
  Gamepad2, BookOpen, BarChart3, FileText, Users, Swords, HelpCircle, Plus,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'play' | 'prepare' | 'review';

const tabConfig: { id: Tab; icon: typeof Gamepad2; color: string; activeBg: string; activeText: string }[] = [
  { id: 'play', icon: Gamepad2, color: 'neo-cyan', activeBg: 'bg-neo-cyan', activeText: 'text-black' },
  { id: 'prepare', icon: BookOpen, color: 'neo-pink', activeBg: 'bg-neo-pink', activeText: 'text-black' },
  { id: 'review', icon: BarChart3, color: 'neo-lime', activeBg: 'bg-neo-lime', activeText: 'text-black' },
];

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const slideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 320, damping: 24 } },
};

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const { profile, user } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [openCreateClassroom, setOpenCreateClassroom] = useState(false);
  const [newlyCreatedJoinCode, setNewlyCreatedJoinCode] = useState<string | null>(null);
  const { getMostRecent, hasRecentConfig } = useRecentGameSettings();
  const { classrooms, isLoading: classroomsLoading, error: classroomsError, refresh: refreshClassrooms } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  // Only for the one-time gifted-Pro celebration; the header chip reads the
  // entitlement itself. The hook de-duplicates the request across consumers.
  const { grant: proGrant, loading: proLoading } = useTeacherPro();

  useEffect(() => {
    if (activeTab !== 'prepare') {
      setOpenCreateClassroom(false);
    }
  }, [activeTab]);

  // Check if user has teacher access
  const hasTeacherAccess = profile?.user_role === 'teacher' || profile?.is_admin === true;

  useEffect(() => {
    if (classrooms.length >= 1 && !selectedClassroomId) {
      setSelectedClassroomId(classrooms[0].id);
    }
  }, [classrooms, selectedClassroomId]);

  const handleQuickStart = useCallback(
    (config: GameConfiguration) => {
      const lessonParam = config.lessonIds[0] || '';
      router.push(`/${language}/education/classroom-game?lessonId=${lessonParam}`);
    },
    [router, language]
  );

  const classroomSelect = classrooms.length > 1 ? (
    <div className="flex items-center gap-3 mb-4">
      <label className="text-neo-white font-neo-body font-bold text-sm">
        {t('teacher.dashboard.selectClassroom')}:
      </label>
      <select
        value={selectedClassroomId}
        onChange={(e) => setSelectedClassroomId(e.target.value)}
        className="px-3 py-1.5 bg-neo-cream border-2 border-black text-black font-neo-body font-bold text-sm shadow-hard-sm rounded-neo focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
      >
        {classrooms.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  ) : null;

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />
      <TeacherOnboarding
        forceShow={showTutorial}
        onDismiss={() => setShowTutorial(false)}
      />
      {!proLoading && <ProWelcomeCelebration grant={proGrant} />}

      <m.div
        className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Greeting + tutorial reopen */}
        <m.div variants={slideUp} className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white">
                {t('teacher.dashboard.title')}
              </h1>
              <p className="text-sm text-neo-white font-neo-body mt-1">
                {t('teacher.dashboard.subtitle')}
              </p>
              {/* The plan, at a glance — a gifted teacher must be able to SEE the
                  gift took, and a free teacher must never wonder which plan they
                  are on. */}
              <TeacherPlanBadge className="mt-3" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="create-classroom-shortcut"
                onClick={() => {
                  setActiveTab('prepare');
                  setOpenCreateClassroom(true);
                }}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1.5 rounded-neo px-3 sm:px-4',
                  'border-3 border-black bg-neo-yellow text-black font-neo-display font-black shadow-hard',
                  'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all',
                  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
                )}
              >
                <Plus className="size-4" aria-hidden="true" />
                {t('teacher.classroom.create', 'Create classroom')}
              </button>
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                aria-label={t('education.onboarding.showTutorial')}
                title={t('education.onboarding.showTutorial')}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  'border-2 border-black bg-neo-lime text-black shadow-hard-sm',
                  'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                  'transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
                )}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </m.div>

        {/* Teacher Welcome Banner */}
        {hasTeacherAccess && (
          <m.div variants={slideUp} className="mb-6">
            <TeacherWelcomeBanner hasAccess={hasTeacherAccess} />
          </m.div>
        )}

        {/* Tab Bar */}
        <m.div variants={slideUp} className="mb-6">
          <div
            className="inline-flex rounded-neo border-2 border-black bg-neo-navy-light p-1 gap-1 shadow-hard-sm"
            role="tablist"
          >
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-neo font-neo-body font-bold text-sm transition-all',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime focus-visible:ring-offset-1 focus-visible:ring-offset-neo-navy',
                    isActive
                      ? cn(tab.activeBg, tab.activeText, 'border-2 border-black shadow-hard-sm')
                      : 'text-neo-white hover:text-neo-white hover:bg-neo-white/5 border-2 border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t(`teacher.dashboard.tab.${tab.id}`)}
                </button>
              );
            })}
          </div>
        </m.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'play' && (
            <m.div key="play" {...fadeSlide} className="space-y-6">
              {/* Start Game CTA — four-way branch: error, loading, empty, has classrooms */}
              {classroomsError ? (
                // Error state: show error card with retry (pessimistic — never show CTA or empty card).
                // Solid cream card, matching the review-tab empty state below: the dashboard root is
                // bg-neo-navy, so a translucent bg-neo-red/5 stays dark and the text-black copy would
                // sit at ~1.3:1 against it. The red border carries the error semantic for free.
                <m.div
                  variants={fadeSlide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
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
              ) : classroomsLoading ? (
                // Loading: show neutral skeleton
                <div className="w-full h-24 rounded-neo bg-neo-white/10 border-3 border-black/10 shadow-hard-sm animate-pulse" />
              ) : classrooms.length === 0 || newlyCreatedJoinCode ? (
                // Empty state: show first-run card (or after creation, show join code)
                <PlayTabFirstRunCard
                  onJoinCodeCreated={setNewlyCreatedJoinCode}
                  initialJoinCode={newlyCreatedJoinCode}
                />
              ) : (
                // Has classrooms: show students present strip + Start Game CTA
                <>
                  <m.div variants={fadeSlide}>
                    <StudentsPresentStrip classrooms={classrooms} />
                  </m.div>
                  <m.button
                  onClick={() => router.push(`/${language}/education/classroom-game`)}
                  whileHover={{ y: -3, boxShadow: '6px 6px 0px black' }}
                  whileTap={{ scale: 0.98, y: 1, boxShadow: '2px 2px 0px black' }}
                  className={cn(
                    'w-full flex items-center gap-5 p-6 rounded-neo border-3 border-black',
                    'bg-neo-cyan shadow-hard-lg text-left',
                    'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
                  )}
                >
                  <div className="w-14 h-14 rounded-neo bg-black border-2 border-black flex items-center justify-center shadow-hard-sm shrink-0">
                    <Gamepad2 className="w-7 h-7 text-neo-cyan" />
                  </div>
                  <div>
                    <h2 className="text-xl font-neo-display font-black text-black uppercase tracking-tight">
                      {t('education.classroomGame.startGame')}
                    </h2>
                    <p className="text-sm text-black/70 font-neo-body font-bold mt-0.5">
                      {t('education.classroomGame.startGameDescription')}
                    </p>
                  </div>
                </m.button>
                </>
              )}

              {/* Quick Start — gated on having classrooms (prevents dead-end with zero classrooms + recent config) */}
              {hasRecentConfig && classrooms.length > 0 && (
                <QuickStartButton config={getMostRecent()} onClick={handleQuickStart} />
              )}

              {/* Duel Activity */}
              {classrooms.length > 0 && selectedClassroomId && (
                <section className="rounded-neo border-2 border-black/30 bg-neo-navy-light p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Swords className="w-4 h-4 text-neo-pink" />
                    <h3 className="text-base font-neo-display font-bold text-neo-white">
                      {t('teacher.dashboard.duelActivity')}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-neo-pink text-black rounded-neo border border-black">
                      {t('teacher.dashboard.live')}
                    </span>
                  </div>
                  {classroomSelect}
                  <DuelMonitoringPanel classroomId={selectedClassroomId} />
                </section>
              )}

              {/* Tip */}
              <div className="flex items-start gap-3 p-4 rounded-neo border-2 border-neo-lime/30 bg-neo-lime/5">
                <span className="text-lg shrink-0">💡</span>
                <div>
                  <p className="text-sm font-bold text-neo-lime">{t('teacher.dashboard.quickTip')}</p>
                  <p className="text-xs text-neo-white font-neo-body mt-0.5">
                    {t('teacher.dashboard.quickTipDescription')}
                  </p>
                </div>
              </div>
            </m.div>
          )}

          {activeTab === 'prepare' && (
            <m.div key="prepare" {...fadeSlide} className="space-y-8">
              {/* Classrooms */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-neo-cyan" />
                  <h2 className="text-lg font-neo-display font-bold text-neo-white">
                    {t('teacher.dashboard.classrooms')}
                  </h2>
                </div>
                <ClassroomManager autoOpenCreate={openCreateClassroom} />
              </section>

              {/* Lessons */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-neo-pink" />
                  <h2 className="text-lg font-neo-display font-bold text-neo-white">
                    {t('teacher.dashboard.lessons')}
                  </h2>
                </div>
                <LessonBuilder />
              </section>

              {/* Curriculum word lists — 138 curated grade-level lists that had no in-app
                  entry point before this. Grade bands are the most concrete thing teachers
                  named on the access-request form. */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-neo-lime" />
                  <h2 className="text-lg font-neo-display font-bold text-neo-white">
                    {t('teacher.curriculum.title')}
                  </h2>
                </div>
                <CurriculumWordListBrowser
                  teacherId={user?.id}
                  classroomId={selectedClassroomId || undefined}
                />
              </section>
            </m.div>
          )}

          {activeTab === 'review' && (
            <m.div key="review" {...fadeSlide} className="space-y-6">
              {classrooms.length === 0 ? (
                <div className="rounded-neo border-3 border-black bg-neo-cream shadow-hard px-6 py-10 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-neo border-2 border-black bg-neo-lime shadow-hard-sm">
                    <BarChart3 className="h-8 w-8 text-black" />
                  </div>
                  <p className="text-black font-neo-body font-black text-lg text-balance">
                    {t('teacher.dashboard.createClassroomFirst')}
                  </p>
                  <p className="mt-1 text-sm font-bold text-black/60 text-pretty">
                    {t('teacher.dashboard.reviewEmptyHint')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('prepare')}
                    className={cn(
                      'mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-neo px-6 py-2.5',
                      'border-3 border-black bg-neo-cyan font-neo-display font-black text-black shadow-hard',
                      'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all'
                    )}
                  >
                    <Plus className="h-5 w-5" />
                    {t('teacher.classroom.create')}
                  </button>
                </div>
              ) : (
                <>
                  {/* Last class game — free for every teacher, above the Pro gate.
                      "Which words did we miss in the round we just played" is the
                      question a teacher has at the bell; the cross-game trend view
                      below is what Pro sells. */}
                  {selectedClassroomId && (
                    <section>
                      {classroomSelect}
                      <LastGameInsights
                        classroomId={selectedClassroomId}
                        onCreateReviewLesson={(words) => {
                          const wordsParam = encodeURIComponent(words.join(','));
                          router.push(`/${language}/teacher?tab=lessons&reviewWords=${wordsParam}`);
                        }}
                      />
                    </section>
                  )}

                  {/* Analytics */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-4 h-4 text-neo-lime" />
                      <h2 className="text-lg font-neo-display font-bold text-neo-white">
                        {t('teacher.dashboard.analytics')}
                      </h2>
                    </div>
                    {selectedClassroomId && (
                      <ProGate feature="analytics">
                        <AnalyticsDashboard
                          classroomId={selectedClassroomId}
                          onCreateReviewLesson={(words) => {
                            const wordsParam = encodeURIComponent(words.join(','));
                            router.push(`/${language}/teacher?tab=lessons&reviewWords=${wordsParam}`);
                          }}
                        />
                      </ProGate>
                    )}
                  </section>

                  {/* Assignments */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-4 h-4 text-neo-lime" />
                      <h2 className="text-lg font-neo-display font-bold text-neo-white">
                        {t('teacher.dashboard.assignments')}
                      </h2>
                    </div>
                    {classroomSelect}
                    {selectedClassroomId && (
                      <AssignmentTrackingPanel
                        classroomId={selectedClassroomId}
                        onCreateAssignment={() => setShowAssignmentCreator(true)}
                      />
                    )}
                  </section>

                  {/* Reports link */}
                  {selectedClassroomId && (
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
                  )}
                </>
              )}
            </m.div>
          )}
        </AnimatePresence>
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
