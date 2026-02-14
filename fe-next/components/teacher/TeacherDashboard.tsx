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
          <h1 className="text-3xl font-neo-display text-neo-white mb-2 text-balance">
            {t('teacher.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body text-pretty">
            {t('teacher.dashboard.subtitle')}
          </p>
        </div>

        {/* Quick Actions - Primary CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Start Classroom Game */}
          <button
            onClick={() => router.push(`/${language}/education/classroom-game`)}
            className={cn(
              'group p-6 rounded-neo border-neo border-neo-black',
              'bg-neo-cyan',
              'shadow-hard hover:shadow-hard-lg transition-all',
              'text-left hover:translate-x-[-2px] hover:translate-y-[-2px]',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                'w-12 h-12 rounded-neo bg-neo-black flex items-center justify-center',
                'shadow-hard-sm'
              )}>
                <Gamepad2 className="w-6 h-6 text-neo-cyan" />
              </div>
              <div className="text-neo-black opacity-50 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </div>
            <h3 className="text-xl font-neo-display text-neo-black mb-1 text-balance">
              {t('education.classroomGame.startGame')}
            </h3>
            <p className="text-sm text-neo-black/80 font-neo-body text-pretty">
              {t('education.classroomGame.startGameDescription')}
            </p>
          </button>

          {/* Create New Lesson */}
          <button
            onClick={() => setShowLessons(true)}
            className={cn(
              'group p-6 rounded-neo border-neo border-neo-black',
              'bg-neo-pink',
              'shadow-hard hover:shadow-hard-lg transition-all',
              'text-left hover:translate-x-[-2px] hover:translate-y-[-2px]',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn(
                'w-12 h-12 rounded-neo bg-neo-black flex items-center justify-center',
                'shadow-hard-sm'
              )}>
                <BookPlus className="w-6 h-6 text-neo-pink" />
              </div>
              <div className="text-neo-black opacity-50 group-hover:opacity-100 transition-opacity">
                →
              </div>
            </div>
            <h3 className="text-xl font-neo-display text-neo-black mb-1 text-balance">
              {t('teacher.dashboard.createLesson')}
            </h3>
            <p className="text-sm text-neo-black/80 font-neo-body text-pretty">
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
        <section className="mb-8">
          <button
            onClick={() => setShowAssignments(!showAssignments)}
            aria-expanded={showAssignments}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-neo border-neo-black',
              'bg-neo-navy shadow-hard hover:shadow-hard-lg transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-neo-display text-neo-white text-balance">
                {t('teacher.dashboard.assignments')}
              </h2>
              <span className="px-2 py-1 bg-neo-yellow/20 text-neo-yellow text-xs font-bold rounded-neo border border-neo-yellow/50">
                {t('teacher.dashboard.track')}
              </span>
            </div>
            {showAssignments ? (
              <ChevronUp className="w-6 h-6 text-neo-white" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-6 h-6 text-neo-white" aria-hidden="true" />
            )}
          </button>

          {showAssignments && (
            <div className="mt-4">
              {classrooms.length === 0 ? (
                <div className="p-6 bg-neo-navy/30 border-neo border-neo-black rounded-neo shadow-hard">
                  <p className="text-neo-white/60 font-neo-body text-center">
                    {t('teacher.dashboard.createClassroomFirst')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Classroom selector if multiple classrooms */}
                  {classrooms.length > 1 && (
                    <div className="flex items-center gap-3">
                      <label className="text-neo-white font-neo-body">
                        {t('teacher.dashboard.selectClassroom')}:
                      </label>
                      <select
                        value={selectedClassroomId}
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                        className={cn(
                          'px-4 py-2 bg-neo-navy border-neo border-neo-black',
                          'text-neo-white font-neo-body shadow-hard-sm rounded-neo',
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
          <section className="mb-8">
            <button
              onClick={() => setShowDuels(!showDuels)}
              aria-expanded={showDuels}
              className={cn(
                'w-full flex items-center justify-between p-4',
                'rounded-neo border-neo border-neo-black',
                'bg-neo-navy shadow-hard hover:shadow-hard-lg transition-all',
                'text-left',
                'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
              )}
            >
              <div className="flex items-center gap-3">
                <Swords className="w-6 h-6 text-neo-pink" />
                <h2 className="text-2xl font-neo-display text-neo-white text-balance">
                  {t('teacher.dashboard.duelActivity')}
                </h2>
                <span className="px-2 py-1 bg-neo-pink/20 text-neo-pink text-xs font-bold rounded-neo border border-neo-pink/50">
                  {t('teacher.dashboard.live')}
                </span>
              </div>
              {showDuels ? (
                <ChevronUp className="w-6 h-6 text-neo-white" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-6 h-6 text-neo-white" aria-hidden="true" />
              )}
            </button>

            {showDuels && selectedClassroomId && (
              <div className="mt-4">
                <div className="p-6 bg-neo-navy/30 border-neo border-neo-black rounded-neo shadow-hard">
                  {classrooms.length > 1 && (
                    <div className="flex items-center gap-3 mb-4">
                      <label className="text-neo-white font-neo-body">
                        {t('teacher.dashboard.selectClassroom')}:
                      </label>
                      <select
                        value={selectedClassroomId}
                        onChange={(e) => setSelectedClassroomId(e.target.value)}
                        className={cn(
                          'px-4 py-2 bg-neo-navy border-neo border-neo-black',
                          'text-neo-white font-neo-body shadow-hard-sm rounded-neo',
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
              </div>
            )}
          </section>
        )}

        {/* Classrooms Section - Collapsible */}
        <section className="mb-8">
          <button
            onClick={() => setShowClassrooms(!showClassrooms)}
            aria-expanded={showClassrooms}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-neo border-neo-black',
              'bg-neo-navy shadow-hard hover:shadow-hard-lg transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-neo-display text-neo-white text-balance">
                {t('teacher.dashboard.classrooms')}
              </h2>
              <span className="px-2 py-1 bg-neo-cyan/20 text-neo-cyan text-xs font-bold rounded-neo border border-neo-cyan/50">
                {t('teacher.dashboard.manage')}
              </span>
            </div>
            {showClassrooms ? (
              <ChevronUp className="w-6 h-6 text-neo-white" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-6 h-6 text-neo-white" aria-hidden="true" />
            )}
          </button>

          {showClassrooms && (
            <div className="mt-4">
              <ClassroomManager />
            </div>
          )}
        </section>

        {/* Lessons Section - Collapsible */}
        <section className="mb-8">
          <button
            onClick={() => setShowLessons(!showLessons)}
            aria-expanded={showLessons}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-neo border-neo-black',
              'bg-neo-navy shadow-hard hover:shadow-hard-lg transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-neo-display text-neo-white text-balance">
                {t('teacher.dashboard.lessons')}
              </h2>
              <span className="px-2 py-1 bg-neo-pink/20 text-neo-pink text-xs font-bold rounded-neo border border-neo-pink/50">
                {t('teacher.dashboard.build')}
              </span>
            </div>
            {showLessons ? (
              <ChevronUp className="w-6 h-6 text-neo-white" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-6 h-6 text-neo-white" aria-hidden="true" />
            )}
          </button>

          {showLessons && (
            <div className="mt-4">
              <LessonBuilder />
            </div>
          )}
        </section>

        {/* Info Card - Quick Tips */}
        <div className={cn(
          'p-6 rounded-neo border-neo border-neo-yellow',
          'bg-neo-yellow/10 shadow-hard-sm'
        )}>
          <h3 className="text-lg font-neo-display text-neo-yellow mb-2">
            💡 {t('teacher.dashboard.quickTip')}
          </h3>
          <p className="text-sm text-neo-white/80 font-neo-body">
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
