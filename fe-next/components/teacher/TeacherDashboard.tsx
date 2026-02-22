/**
 * TeacherDashboard - Simplified Version
 *
 * Single-page card-based layout with quick actions
 * No tab navigation, everything visible in one flow
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { TeacherOnboarding } from '@/components/education/TeacherOnboarding';
import { cn } from '@/lib/utils';
import ClassroomManager from './ClassroomManager';
import LessonBuilder from './LessonBuilder';
import QuickStartButton from './QuickStartButton';
import { useRecentGameSettings, type GameConfiguration } from '@/hooks/useRecentGameSettings';
import { useClassrooms } from '@/hooks/useClassroom';
import { AssignmentTrackingPanel, AssignmentCreator } from './assignments';
import { DuelMonitoringPanel } from './dashboard';
import { Gamepad2, BookPlus, ChevronDown, ChevronUp, Swords } from 'lucide-react';

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [showClassrooms, setShowClassrooms] = useState(true);
  const [showLessons, setShowLessons] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [showDuels, setShowDuels] = useState(false);
  const [showAssignmentCreator, setShowAssignmentCreator] = useState(false);
  const { getMostRecent, hasRecentConfig } = useRecentGameSettings();
  const { classrooms } = useClassrooms();

  // Classroom selection for assignments and duels
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  // Auto-select first classroom if only one exists
  useState(() => {
    if (classrooms.length === 1 && !selectedClassroomId) {
      setSelectedClassroomId(classrooms[0].id);
    }
  });

  // Handle quick start - navigate to classroom game with pre-selected lessons
  const handleQuickStart = useCallback(
    (config: GameConfiguration) => {
      // Navigate to classroom game with the first lesson pre-selected
      const lessonParam = config.lessonIds[0] || '';
      router.push(`/${language}/education/classroom-game?lessonId=${lessonParam}`);
    },
    [router, language]
  );

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />

      {/* Teacher Onboarding Wizard - shows on first visit */}
      <TeacherOnboarding />

      <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🏫</span>
            <h1 className="text-3xl font-neo-display font-black text-neo-white text-balance">
              {t('teacher.dashboard.title')}
            </h1>
          </div>
          <p className="text-neo-white/70 font-neo-body text-pretty ps-1">
            {t('teacher.dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Actions - Primary CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Start Classroom Game */}
          <button
            onClick={() => router.push(`/${language}/education/classroom-game`)}
            className={cn(
              'group p-6 rounded-neo border-3 border-black',
              'bg-neo-cyan',
              'shadow-hard hover:shadow-hard-lg transition-all',
              'text-left hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-y-0.5 active:translate-x-0.5',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                'w-14 h-14 rounded-neo bg-black border-2 border-black flex items-center justify-center',
                'shadow-hard-sm'
              )}>
                <Gamepad2 className="w-7 h-7 text-neo-cyan" />
              </div>
              <span className="text-2xl font-black text-black opacity-40 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </div>
            <h3 className="text-xl font-neo-display font-black text-black mb-1 text-balance">
              {t('education.classroomGame.startGame')}
            </h3>
            <p className="text-sm text-black/70 font-neo-body font-bold text-pretty">
              {t('education.classroomGame.startGameDescription')}
            </p>
          </button>

          {/* Create New Lesson */}
          <button
            onClick={() => setShowLessons(true)}
            className={cn(
              'group p-6 rounded-neo border-3 border-black',
              'bg-neo-pink',
              'shadow-hard hover:shadow-hard-lg transition-all',
              'text-left hover:-translate-y-0.5 hover:-translate-x-0.5 active:translate-y-0.5 active:translate-x-0.5',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                'w-14 h-14 rounded-neo bg-black border-2 border-black flex items-center justify-center',
                'shadow-hard-sm'
              )}>
                <BookPlus className="w-7 h-7 text-neo-pink" />
              </div>
              <span className="text-2xl font-black text-black opacity-40 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </div>
            <h3 className="text-xl font-neo-display font-black text-black mb-1 text-balance">
              {t('teacher.dashboard.createLesson')}
            </h3>
            <p className="text-sm text-black/70 font-neo-body font-bold text-pretty">
              {t('teacher.dashboard.createLessonDescription')}
            </p>
          </button>
        </div>

        {/* Quick Start - Show only when there's a recent game */}
        {hasRecentConfig && (
          <div className="mb-8">
            <QuickStartButton
              config={getMostRecent()}
              onClick={handleQuickStart}
            />
          </div>
        )}

        {/* Assignment Tracking Section - Collapsible */}
        <section className="mb-6">
          <button
            onClick={() => setShowAssignments(!showAssignments)}
            aria-expanded={showAssignments}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-3 border-black',
              showAssignments ? 'bg-neo-yellow rounded-b-none border-b-0' : 'bg-white',
              'shadow-hard transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-neo-display font-black text-black text-balance">
                {t('teacher.dashboard.assignments')}
              </h2>
              <span className="px-2 py-0.5 bg-neo-yellow border-2 border-black text-black text-xs font-black rounded-neo shadow-hard-sm">
                {t('teacher.dashboard.track')}
              </span>
            </div>
            {showAssignments ? (
              <ChevronUp className="w-6 h-6 text-black" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-6 h-6 text-black" aria-hidden="true" />
            )}
          </button>

          {showAssignments && (
            <div className="rounded-neo rounded-t-none border-3 border-t-0 border-black bg-white shadow-hard p-4">
              {classrooms.length === 0 ? (
                <p className="text-black/60 font-neo-body font-bold text-center py-4">
                  {t('teacher.dashboard.createClassroomFirst')}
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Classroom selector if multiple classrooms */}
                  {classrooms.length > 1 && (
                    <div className="flex items-center gap-3">
                      <label className="text-black font-neo-body font-bold">
                        {t('teacher.dashboard.selectClassroom')}:
                      </label>
                      <select
                        value={selectedClassroomId}
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                        className={cn(
                          'px-4 py-2 bg-white border-2 border-black',
                          'text-black font-neo-body font-bold shadow-hard-sm rounded-neo',
                          'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
                        )}
                      >
                        {classrooms.map((classroom) => (
                          <option key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedClassroomId && (
                    <AssignmentTrackingPanel
                      classroomId={selectedClassroomId}
                      onCreateAssignment={() => setShowAssignmentCreator(true)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Duel Monitoring Section - Collapsible */}
        {classrooms.length > 0 && (
          <section className="mb-6">
            <button
              onClick={() => setShowDuels(!showDuels)}
              aria-expanded={showDuels}
              className={cn(
                'w-full flex items-center justify-between p-4',
                'rounded-neo border-3 border-black',
                showDuels ? 'bg-neo-pink rounded-b-none border-b-0' : 'bg-white',
                'shadow-hard transition-all',
                'text-left',
                'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
              )}
            >
              <div className="flex items-center gap-3">
                <Swords className="w-5 h-5 text-black" />
                <h2 className="text-xl font-neo-display font-black text-black text-balance">
                  {t('teacher.dashboard.duelActivity')}
                </h2>
                <span className="px-2 py-0.5 bg-neo-pink border-2 border-black text-black text-xs font-black rounded-neo shadow-hard-sm">
                  {t('teacher.dashboard.live')}
                </span>
              </div>
              {showDuels ? (
                <ChevronUp className="w-6 h-6 text-black" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-6 h-6 text-black" aria-hidden="true" />
              )}
            </button>

            {showDuels && selectedClassroomId && (
              <div className="rounded-neo rounded-t-none border-3 border-t-0 border-black bg-white shadow-hard p-4">
                {classrooms.length > 1 && (
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-black font-neo-body font-bold">
                      {t('teacher.dashboard.selectClassroom')}:
                    </label>
                    <select
                      value={selectedClassroomId}
                      onChange={(e) => setSelectedClassroomId(e.target.value)}
                      className={cn(
                        'px-4 py-2 bg-white border-2 border-black',
                        'text-black font-neo-body font-bold shadow-hard-sm rounded-neo',
                        'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
                      )}
                    >
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <DuelMonitoringPanel classroomId={selectedClassroomId} />
              </div>
            )}
          </section>
        )}

        {/* Classrooms Section - Collapsible */}
        <section className="mb-6">
          <button
            onClick={() => setShowClassrooms(!showClassrooms)}
            aria-expanded={showClassrooms}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-3 border-black',
              showClassrooms ? 'bg-neo-cyan rounded-b-none border-b-0' : 'bg-white',
              'shadow-hard transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-neo-display font-black text-black text-balance">
                {t('teacher.dashboard.classrooms')}
              </h2>
              <span className="px-2 py-0.5 bg-neo-cyan border-2 border-black text-black text-xs font-black rounded-neo shadow-hard-sm">
                {t('teacher.dashboard.manage')}
              </span>
            </div>
            {showClassrooms ? (
              <ChevronUp className="w-6 h-6 text-black" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-6 h-6 text-black" aria-hidden="true" />
            )}
          </button>

          {showClassrooms && (
            <div className="rounded-neo rounded-t-none border-3 border-t-0 border-black bg-white shadow-hard p-4">
              <ClassroomManager />
            </div>
          )}
        </section>

        {/* Lessons Section - Collapsible */}
        <section className="mb-6">
          <button
            onClick={() => setShowLessons(!showLessons)}
            aria-expanded={showLessons}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-3 border-black',
              showLessons ? 'bg-neo-pink rounded-b-none border-b-0' : 'bg-white',
              'shadow-hard transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-neo-display font-black text-black text-balance">
                {t('teacher.dashboard.lessons')}
              </h2>
              <span className="px-2 py-0.5 bg-neo-pink border-2 border-black text-black text-xs font-black rounded-neo shadow-hard-sm">
                {t('teacher.dashboard.build')}
              </span>
            </div>
            {showLessons ? (
              <ChevronUp className="w-6 h-6 text-black" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-6 h-6 text-black" aria-hidden="true" />
            )}
          </button>

          {showLessons && (
            <div className="rounded-neo rounded-t-none border-3 border-t-0 border-black bg-white shadow-hard p-4">
              <LessonBuilder />
            </div>
          )}
        </section>

        {/* Info Card - Quick Tips */}
        <div className="p-5 rounded-neo border-3 border-black bg-neo-yellow shadow-hard-sm">
          <h3 className="text-lg font-neo-display font-black text-black mb-2">
            💡 {t('teacher.dashboard.quickTip')}
          </h3>
          <p className="text-sm text-black/80 font-neo-body font-bold">
            {t('teacher.dashboard.quickTipDescription')}
          </p>
        </div>
      </div>

      {/* Assignment Creator Dialog */}
      {selectedClassroomId && (
        <AssignmentCreator
          classroomId={selectedClassroomId}
          isOpen={showAssignmentCreator}
          onClose={() => setShowAssignmentCreator(false)}
          onComplete={() => {
            setShowAssignmentCreator(false);
            // Assignments will auto-refresh via useAssignments hook
          }}
        />
      )}
    </div>
  );
}
