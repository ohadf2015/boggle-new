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
import dynamic from 'next/dynamic';
const LessonEffectivenessChart = dynamic(
  () => import('@/components/teacher/analytics/LessonEffectivenessChart'),
  { ssr: false },
);
import { VocabularyHeatmap } from '@/components/teacher/analytics/VocabularyHeatmap';
import { LiveActivityIndicator } from '@/components/teacher/analytics/LiveActivityIndicator';
import { AssignmentTrackingPanel } from '@/components/teacher/assignments';
import { PageLoader } from '@/components/ui/PageLoader';
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

function AnalyticsPageClientInner({ classroomId, locale }: AnalyticsPageClientProps) {
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
    onStudentActivity: () => {
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
        <PageLoader size="lg" text={t('common.loading')} />
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

  const handleViewStudents = (_filter: 'struggling') => {
    // Navigate to students tab with filter
  };

  const handleCreateReviewLesson = (_words: string[]) => {
    // Navigate to lesson creation with pre-filled words
  };

  const handleStudentClick = (_studentId: string) => {
    // Navigate to individual student detail
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-neo-navy p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Title & Back Button */}
          <div>
            <button type="button"
              onClick={handleBackToClassroom}
              className={cn(
                'inline-flex items-center gap-2 mb-3',
                'text-neo-cyan hover:text-neo-lime',
                'transition-colors duration-200'
              )}
            >
              <ArrowLeft className="w-4 h-4 rtl:scale-x-[-1]" />
              <span className="text-sm font-neo-body">{t('education.analytics.backToClassroom')}</span>
            </button>

            <h1 className="text-3xl md:text-4xl font-neo-display text-neo-white mb-2">
              {t('education.analytics.title')}
            </h1>
            <p className="text-neo-white font-neo-body">
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
              'grid w-full grid-cols-4 gap-2',
              'bg-neo-navy/50 border-neo border-neo-black shadow-hard rounded-neo p-2'
            )}
          >
            <TabsTrigger
              value="students"
              className={cn(
                'font-neo-body font-bold rounded-neo',
                'data-[state=active]:bg-neo-cyan data-[state=active]:text-neo-black',
                'data-[state=inactive]:text-neo-white',
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
                'data-[state=inactive]:text-neo-white',
                'transition-all duration-200'
              )}
            >
              {t('education.analytics.viewLessons')}
            </TabsTrigger>
            <TabsTrigger
              value="vocabulary"
              className={cn(
                'font-neo-body font-bold rounded-neo',
                'data-[state=active]:bg-neo-lime data-[state=active]:text-neo-black',
                'data-[state=inactive]:text-neo-white',
                'transition-all duration-200'
              )}
            >
              {t('education.analytics.viewVocabulary')}
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className={cn(
                'font-neo-body font-bold rounded-neo',
                'data-[state=active]:bg-neo-lime data-[state=active]:text-neo-black',
                'data-[state=inactive]:text-neo-white',
                'transition-all duration-200'
              )}
            >
              {t('education.analytics.viewAssignments')}
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

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="bg-neo-navy/30 border-neo border-neo-black shadow-hard rounded-neo p-6">
              <AssignmentTrackingPanel
                classroomId={classroomId}
                onCreateAssignment={() => {
                  // Navigate to dashboard with assignment creator open
                  router.push(`/${locale}/teacher`);
                }}
              />
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
                  <span className="text-neo-white">
                    {activity.studentName}{' '}
                    <span className="text-neo-cyan">
                      {activity.activity === 'lesson_completed'
                        ? 'completed a lesson'
                        : activity.activity === 'xp_gained'
                        ? 'gained XP'
                        : 'attempted a word'}
                    </span>
                  </span>
                  <span className="text-neo-white text-xs">
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

import { TeacherGate } from '@/components/education/TeacherGate';

export function AnalyticsPageClient({ classroomId, locale }: AnalyticsPageClientProps) {
  return <TeacherGate><AnalyticsPageClientInner classroomId={classroomId} locale={locale} /></TeacherGate>;
}
