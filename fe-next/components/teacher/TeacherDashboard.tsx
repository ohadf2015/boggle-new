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
import QuickStartButton from './QuickStartButton';
import { useRecentGameSettings, type GameConfiguration } from '@/hooks/useRecentGameSettings';
import { useClassrooms } from '@/hooks/useClassroom';
import { AssignmentTrackingPanel, AssignmentCreator } from './assignments';
import { DuelMonitoringPanel } from './dashboard';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
import {
  Gamepad2, BookOpen, BarChart3, FileText, Users, Swords,
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
  const { profile } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const { getMostRecent, hasRecentConfig } = useRecentGameSettings();
  const { classrooms } = useClassrooms();
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

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
      <TeacherOnboarding />

      <m.div
        className="w-full max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Greeting */}
        <m.div variants={slideUp} className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white">
            {t('teacher.dashboard.title')}
          </h1>
          <p className="text-sm text-neo-white font-neo-body mt-1">
            {t('teacher.dashboard.subtitle')}
          </p>
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
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 rounded-neo font-neo-body font-bold text-sm transition-all',
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
              {/* Start Game CTA */}
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

              {/* Quick Start */}
              {hasRecentConfig && (
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
                <ClassroomManager />
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
            </m.div>
          )}

          {activeTab === 'review' && (
            <m.div key="review" {...fadeSlide} className="space-y-6">
              {classrooms.length === 0 ? (
                <p className="text-neo-white font-neo-body font-bold text-center py-8">
                  {t('teacher.dashboard.createClassroomFirst')}
                </p>
              ) : (
                <>
                  {/* Analytics */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-4 h-4 text-neo-lime" />
                      <h2 className="text-lg font-neo-display font-bold text-neo-white">
                        {t('teacher.dashboard.analytics')}
                      </h2>
                    </div>
                    {classroomSelect}
                    {selectedClassroomId && (
                      <AnalyticsDashboard
                        classroomId={selectedClassroomId}
                        onCreateReviewLesson={(words) => {
                          const wordsParam = encodeURIComponent(words.join(','));
                          router.push(`/${language}/teacher?tab=lessons&reviewWords=${wordsParam}`);
                        }}
                      />
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
