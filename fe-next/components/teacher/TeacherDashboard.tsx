/**
 * TeacherDashboard - Simplified Version
 *
 * Single-page card-based layout with quick actions
 * No tab navigation, everything visible in one flow
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { TeacherOnboarding } from '@/components/education/TeacherOnboarding';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ClassroomManager from './ClassroomManager';
import LessonBuilder from './LessonBuilder';
import { Gamepad2, BookPlus, ChevronDown, ChevronUp } from 'lucide-react';

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [showClassrooms, setShowClassrooms] = useState(true);
  const [showLessons, setShowLessons] = useState(false);

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />

      {/* Teacher Onboarding Wizard - shows on first visit */}
      <TeacherOnboarding />

      <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-neo-display text-neo-white mb-2">
            {t('teacher.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body">
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
              'bg-gradient-to-br from-neo-cyan to-neo-cyan/80',
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
            <h3 className="text-xl font-neo-display text-neo-black mb-1">
              {t('education.classroomGame.startGame')}
            </h3>
            <p className="text-sm text-neo-black/80 font-neo-body">
              {t('education.classroomGame.startGameDescription')}
            </p>
          </button>

          {/* Create New Lesson */}
          <button
            onClick={() => setShowLessons(true)}
            className={cn(
              'group p-6 rounded-neo border-neo border-neo-black',
              'bg-gradient-to-br from-neo-pink to-neo-pink/80',
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
            <h3 className="text-xl font-neo-display text-neo-black mb-1">
              {t('teacher.dashboard.createLesson')}
            </h3>
            <p className="text-sm text-neo-black/80 font-neo-body">
              {t('teacher.dashboard.createLessonDescription')}
            </p>
          </button>
        </div>

        {/* Classrooms Section - Collapsible */}
        <section className="mb-8">
          <button
            onClick={() => setShowClassrooms(!showClassrooms)}
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-neo border-neo-black',
              'bg-neo-navy shadow-hard hover:shadow-hard-lg transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-neo-display text-neo-white">
                {t('teacher.dashboard.classrooms')}
              </h2>
              <span className="px-2 py-1 bg-neo-cyan/20 text-neo-cyan text-xs font-bold rounded-neo border border-neo-cyan/50">
                {t('teacher.dashboard.manage')}
              </span>
            </div>
            {showClassrooms ? (
              <ChevronUp className="w-6 h-6 text-neo-white" />
            ) : (
              <ChevronDown className="w-6 h-6 text-neo-white" />
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
            className={cn(
              'w-full flex items-center justify-between p-4',
              'rounded-neo border-neo border-neo-black',
              'bg-neo-navy shadow-hard hover:shadow-hard-lg transition-all',
              'text-left',
              'focus:outline-none focus:ring-2 focus:ring-neo-yellow'
            )}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-neo-display text-neo-white">
                {t('teacher.dashboard.lessons')}
              </h2>
              <span className="px-2 py-1 bg-neo-pink/20 text-neo-pink text-xs font-bold rounded-neo border border-neo-pink/50">
                {t('teacher.dashboard.build')}
              </span>
            </div>
            {showLessons ? (
              <ChevronUp className="w-6 h-6 text-neo-white" />
            ) : (
              <ChevronDown className="w-6 h-6 text-neo-white" />
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
    </div>
  );
}
