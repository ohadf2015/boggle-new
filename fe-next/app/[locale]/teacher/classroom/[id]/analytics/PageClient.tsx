/**
 * Analytics Page Client Component
 *
 * Client-side analytics dashboard integrating:
 * - Real-time progress updates (useRealtimeClassroomProgress)
 * - Analytics metrics dashboard
 * - Student progress table
 * - Lesson effectiveness chart
 * - Vocabulary mastery heatmap
 *
 * Uses Radix UI Tabs for detailed view navigation.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealtimeClassroomProgress } from '@/hooks/useRealtimeClassroomProgress';
import { AnalyticsDashboard } from '@/components/teacher/analytics/AnalyticsDashboard';
import { StudentProgressTable } from '@/components/teacher/analytics/StudentProgressTable';
import LessonEffectivenessChart from '@/components/teacher/analytics/LessonEffectivenessChart';
import { VocabularyHeatmap } from '@/components/teacher/analytics/VocabularyHeatmap';
import { LiveActivityIndicator } from '@/components/teacher/analytics/LiveActivityIndicator';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AnalyticsPageClientProps {
  classroomId: string;
  locale: string;
}

// ============================================
// COMPONENT
// ============================================

export function AnalyticsPageClient({ classroomId, locale }: AnalyticsPageClientProps) {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // ==================== REALTIME CONNECTION ====================

  const {
    isConnected,
    activeStudentsCount,
    lastUpdate,
    connectionStatus,
    recentActivity,
  } = useRealtimeClassroomProgress({
    classroomId,
    enabled: true,
    onStudentActivity: (studentId, activity) => {
      console.log(`Student ${studentId} activity: ${activity}`);
      // Activity updates will trigger re-renders in analytics hooks
    },
  });

  // ==================== AUTH CHECK ====================

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/${locale}/auth/signin?redirect=/teacher/classroom/${classroomId}/analytics`);
    }
  }, [user, authLoading, router, locale, classroomId]);

  // ==================== LOADING STATE ====================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  // ==================== NAVIGATION HANDLERS ====================

  const handleBackToClassroom = () => {
    router.push(`/${locale}/teacher/classroom/${classroomId}`);
  };

  const handleViewStudents = (filter: 'struggling') => {
    // Navigate to students tab with filter
    console.log('Filter students:', filter);
  };

  const handleCreateReviewLesson = (words: string[]) => {
    // Navigate to lesson creation with pre-filled words
    console.log('Create review lesson with words:', words);
  };

  const handleStudentClick = (studentId: string) => {
    // Navigate to individual student detail
    console.log('View student:', studentId);
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-neo-navy p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Title & Back Button */}
          <div>
            <button
              onClick={handleBackToClassroom}
              className={cn(
                'inline-flex items-center gap-2 mb-3',
                'text-neo-cyan hover:text-neo-yellow',
                'transition-colors duration-200'
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-neo-body">{t('education.analytics.backToClassroom')}</span>
            </button>

            <h1 className="text-3xl md:text-4xl font-neo-display text-neo-white mb-2">
              {t('education.analytics.title')}
            </h1>
            <p className="text-neo-white/70 font-neo-body">
              {t('education.analytics.subtitle')}
            </p>
          </div>

          {/* Live Activity Indicator */}
          <div
            className={cn(
              'bg-neo-navy/50 border-neo border-neo-black shadow-hard rounded-neo',
              'px-4 py-3'
            )}
          >
            <LiveActivityIndicator
              isConnected={isConnected}
              activeStudentsCount={activeStudentsCount}
              lastUpdate={lastUpdate}
              connectionStatus={connectionStatus}
            />
          </div>
        </div>

        {/* Metrics Dashboard */}
        <div className="bg-neo-navy/30 border-neo border-neo-black shadow-hard rounded-neo p-6">
          <AnalyticsDashboard
            classroomId={classroomId}
            onViewStudents={handleViewStudents}
            onCreateReviewLesson={handleCreateReviewLesson}
          />
        </div>

        {/* Detailed Views Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList
            className={cn(
              'grid w-full grid-cols-3 gap-2',
              'bg-neo-navy/50 border-neo border-neo-black shadow-hard rounded-neo p-2'
            )}
          >
            <TabsTrigger
              value="students"
              className={cn(
                'font-neo-body font-bold rounded-neo',
                'data-[state=active]:bg-neo-cyan data-[state=active]:text-neo-black',
                'data-[state=inactive]:text-neo-white/70',
                'transition-all duration-200'
              )}
            >
              {t('education.analytics.viewStudents')}
            </TabsTrigger>
            <TabsTrigger
              value="lessons"
              className={cn(
                'font-neo-body font-bold rounded-neo',
                'data-[state=active]:bg-neo-pink data-[state=active]:text-neo-white',
                'data-[state=inactive]:text-neo-white/70',
                'transition-all duration-200'
              )}
            >
              {t('education.analytics.viewLessons')}
            </TabsTrigger>
            <TabsTrigger
              value="vocabulary"
              className={cn(
                'font-neo-body font-bold rounded-neo',
                'data-[state=active]:bg-neo-yellow data-[state=active]:text-neo-black',
                'data-[state=inactive]:text-neo-white/70',
                'transition-all duration-200'
              )}
            >
              {t('education.analytics.viewVocabulary')}
            </TabsTrigger>
          </TabsList>

          {/* Student Progress Tab */}
          <TabsContent value="students" className="space-y-4">
            <div className="bg-neo-navy/30 border-neo border-neo-black shadow-hard rounded-neo p-6">
              <h2 className="text-2xl font-neo-display text-neo-white mb-4">
                {t('education.analytics.studentProgress')}
              </h2>
              <StudentProgressTable
                classroomId={classroomId}
                onStudentClick={handleStudentClick}
              />
            </div>
          </TabsContent>

          {/* Lesson Effectiveness Tab */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="bg-neo-navy/30 border-neo border-neo-black shadow-hard rounded-neo p-6">
              <LessonEffectivenessChart classroomId={classroomId} />
            </div>
          </TabsContent>

          {/* Vocabulary Mastery Tab */}
          <TabsContent value="vocabulary" className="space-y-4">
            <div className="bg-neo-navy/30 border-neo border-neo-black shadow-hard rounded-neo p-6">
              <h2 className="text-2xl font-neo-display text-neo-white mb-4">
                {t('education.analytics.vocabularyMastery')}
              </h2>
              <VocabularyHeatmap classroomId={classroomId} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Recent Activity Feed (if any) */}
        {recentActivity.length > 0 && (
          <div
            className={cn(
              'bg-neo-navy/30 border-neo border-neo-black shadow-hard rounded-neo p-4',
              'hidden lg:block'
            )}
          >
            <h3 className="text-lg font-neo-display text-neo-white mb-3">
              Recent Activity
            </h3>
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div
                  key={`${activity.studentId}-${activity.timestamp.getTime()}-${index}`}
                  className="flex items-center justify-between text-sm font-neo-body"
                >
                  <span className="text-neo-white/80">
                    {activity.studentName}{' '}
                    <span className="text-neo-cyan">
                      {activity.activity === 'lesson_completed'
                        ? 'completed a lesson'
                        : activity.activity === 'xp_gained'
                        ? 'gained XP'
                        : 'attempted a word'}
                    </span>
                  </span>
                  <span className="text-neo-white/50 text-xs">
                    {new Date(activity.timestamp).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
