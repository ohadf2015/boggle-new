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

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealtimeClassroomProgress } from '@/hooks/useRealtimeClassroomProgress';
import { AnalyticsDashboard } from '@/components/teacher/analytics/AnalyticsDashboard';
import { ProGate } from '@/components/teacher/ProGate';
import { FreeGameHeadlineCard } from '@/components/teacher/rounds/FreeGameHeadlineCard';
import { StudentProgressTable } from '@/components/teacher/analytics/StudentProgressTable';
import { WordMasteryReport } from '@/components/teacher/reports/WordMasteryReport';
import { getClassroom } from '@/lib/supabase/education/classrooms';
import dynamic from 'next/dynamic';
const LessonEffectivenessChart = dynamic(
  () => import('@/components/teacher/analytics/LessonEffectivenessChart'),
  { ssr: false },
);
import { VocabularyHeatmap } from '@/components/teacher/analytics/VocabularyHeatmap';
import { LiveActivityIndicator } from '@/components/teacher/analytics/LiveActivityIndicator';
import { AssignmentTrackingPanel } from '@/components/teacher/assignments';
import { teacherAssignHref } from '@/hooks/useTeacherDashboardDeepLink';
import { PageLoader } from '@/components/ui/PageLoader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { OUTLINE_BUTTON } from '@/components/teacher/home/homeStyles';

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
  const [tab, setTab] = useState('students');
  const revealRef = useTeacherReveal<HTMLDivElement>();
  const tabsRef = useRef<HTMLDivElement>(null);
  const masteryRef = useRef<HTMLDivElement>(null);
  const [classroomName, setClassroomName] = useState('');

  useEffect(() => {
    let cancelled = false;
    getClassroom(classroomId)
      .then(({ data }) => {
        if (!cancelled && data?.name) setClassroomName(data.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

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
      const from = encodeURIComponent(`/${locale}/teacher/classroom/${classroomId}/analytics`);
      router.push(`/${locale}/education/access?from=${from}`);
    }
  }, [user, authLoading, router, locale, classroomId]);

  // ==================== LOADING STATE ====================

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  // ==================== NAVIGATION HANDLERS ====================

  const handleBackToClassroom = () => {
    // `/teacher/classroom/{id}` has no page of its own (only its `/analytics`
    // child does) — it 404s, and the 404 boundary used to bounce the teacher
    // to the main app homepage. `ClassroomManager` (mounted at the list route)
    // doesn't support selecting a classroom by id, so the list itself is the
    // real destination.
    router.push(`/${locale}/teacher/classroom`);
  };

  const handleViewStudents = (_filter: 'struggling') => {
    setTab('students');
    tabsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateReviewLesson = (_words: string[]) => {
    masteryRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const handleStudentClick = (studentId: string) => {
    const params = new URLSearchParams({ classroomId, studentId });
    router.push(`/${locale}/teacher/reports?${params.toString()}`);
  };

  // ==================== RENDER ====================

  return (
    <div ref={revealRef} className="mx-auto max-w-7xl space-y-4 md:space-y-5">
        <div data-tm className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
          <button
            type="button"
            onClick={handleBackToClassroom}
            title={t('education.analytics.backToClassroom')}
            className={cn(OUTLINE_BUTTON, 'shrink-0 max-sm:size-11 max-sm:px-0')}
          >
            <DirectionalIcon icon={ArrowLeft} className="size-4" />
            <span className="max-sm:sr-only">{t('education.analytics.backToClassroom')}</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-neo-body text-sm font-bold text-neo-cream/70">{t('teacher.classroom.cardClassReport', 'Class report')}</p>
            <h1 data-wipe className="font-neo-display text-2xl font-bold leading-tight text-neo-cream md:text-3xl">
              <bdi>{classroomName || t('education.analytics.title')}</bdi>
            </h1>
          </div>
          {connectionStatus === 'connected' && activeStudentsCount === 0 ? null : (
            <div data-testid="analytics-live" className="rounded-neo border-2 border-neo-cream/35 px-3 py-2">
              <LiveActivityIndicator
                isConnected={isConnected}
                activeStudentsCount={activeStudentsCount}
                lastUpdate={lastUpdate}
                connectionStatus={connectionStatus}
              />
            </div>
          )}
        </div>

        {/* One gate over the dashboard AND the detail tabs — the tabs are the analytics
            being sold; gating only the summary card left them open to free teachers. */}
        <div data-tm className="space-y-4 md:space-y-5 [&_[data-testid=pro-gate-preview]]:max-md:hidden">
        <FreeGameHeadlineCard classroomId={classroomId} />
        <ProGate
          feature="analytics"
          tone="calm"
          whileChecking={
            <div data-testid="analytics-pro-pending" aria-busy="true" className="flex min-h-60 items-center justify-center rounded-neo border-[2px] border-neo-cream/40 bg-neo-navy/30 shadow-hard">
              <PageLoader size="md" text={t('common.loading')} />
            </div>
          }
        >
          <div ref={masteryRef} className="scroll-mt-4">
            <WordMasteryReport classroomId={classroomId} classroomName={classroomName} />
          </div>

          <div className="bg-neo-navy/30 border-[2px] border-neo-cream/40 shadow-hard rounded-neo p-3 sm:p-6 empty:hidden">
            <AnalyticsDashboard
              classroomId={classroomId}
              onViewStudents={handleViewStudents}
              onCreateReviewLesson={handleCreateReviewLesson}
              showHeader={false}
            />
          </div>

          <Tabs ref={tabsRef} value={tab} onValueChange={setTab} className="scroll-mt-4 space-y-4">
            <TabsList
              className={cn(
                'grid h-auto w-full grid-cols-2 gap-2 sm:grid-cols-4',
                'bg-neo-navy/50 border-[2px] border-neo-cream/40 shadow-hard rounded-neo p-2'
              )}
            >
              <TabsTrigger
                value="students"
                className={cn(TAB_BASE, TAB_ACTIVE)}
              >
                {t('education.analytics.viewStudents')}
              </TabsTrigger>
              <TabsTrigger
                value="lessons"
                className={cn(TAB_BASE, TAB_ACTIVE)}
              >
                {t('education.analytics.viewLessons')}
              </TabsTrigger>
              <TabsTrigger
                value="vocabulary"
                className={cn(TAB_BASE, TAB_ACTIVE)}
              >
                {t('education.analytics.viewVocabulary')}
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className={cn(TAB_BASE, TAB_ACTIVE)}
              >
                {t('education.analytics.viewAssignments')}
              </TabsTrigger>
            </TabsList>

            {/* Student Progress Tab */}
            <TabsContent value="students" className="space-y-4">
              <div className="bg-neo-navy/30 border-[2px] border-neo-cream/40 shadow-hard rounded-neo p-6">
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
              <div className="bg-neo-navy/30 border-[2px] border-neo-cream/40 shadow-hard rounded-neo p-6">
                <LessonEffectivenessChart classroomId={classroomId} />
              </div>
            </TabsContent>

            {/* Vocabulary Mastery Tab */}
            <TabsContent value="vocabulary" className="space-y-4">
              <div className="bg-neo-navy/30 border-[2px] border-neo-cream/40 shadow-hard rounded-neo p-6">
                <h2 className="text-2xl font-neo-display text-neo-white mb-4">
                  {t('education.analytics.vocabularyMastery')}
                </h2>
                <VocabularyHeatmap classroomId={classroomId} />
              </div>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              <div className="bg-neo-navy/30 border-[2px] border-neo-cream/40 shadow-hard rounded-neo p-6">
                <AssignmentTrackingPanel
                  classroomId={classroomId}
                  onCreateAssignment={() => router.push(teacherAssignHref(locale, classroomId))}
                />
              </div>
            </TabsContent>
          </Tabs>
        </ProGate>
        </div>

        {/* Recent Activity Feed (if any) */}
        {recentActivity.length > 0 && (
          <div
            className={cn(
              'bg-neo-navy/30 border-[2px] border-neo-cream/40 shadow-hard rounded-neo p-4',
              'hidden lg:block'
            )}
          >
            <h3 className="text-lg font-neo-display text-neo-white mb-3">
              {t('education.analytics.recentActivity')}
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
                        ? t('education.analytics.activityCompletedLesson')
                        : activity.activity === 'xp_gained'
                        ? t('education.analytics.activityGainedXp')
                        : t('education.analytics.activityAttemptedWord')}
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
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

// Selected = lime ring on navy; unselected keeps a cream edge so it reads as tappable.
const TAB_ACTIVE =
  'data-[state=active]:border-neo-lime data-[state=active]:bg-neo-navy-light data-[state=active]:text-neo-cream data-[state=active]:ring-2 data-[state=active]:ring-neo-lime';

const TAB_BASE =
  'min-h-11 h-auto whitespace-normal px-2 py-2 text-sm leading-tight font-neo-body font-bold rounded-neo border-[2px] data-[state=inactive]:text-neo-white data-[state=inactive]:border-neo-cream transition-[color,background-color,border-color,transform] duration-200 active:translate-y-px motion-reduce:transition-none';

/**
 * Shell above gate — see `components/education/shell/__tests__/gatedShellOrder.test.ts`.
 * The gate's loader and denial are not this file's markup, so a shell mounted
 * only by the inner component would let those two branches scroll the document.
 */
export function AnalyticsPageClient({ classroomId, locale }: AnalyticsPageClientProps) {
  return (
    <AnalyticsShell>
      <TeacherGate>
        <AnalyticsPageClientInner classroomId={classroomId} locale={locale} />
      </TeacherGate>
    </AnalyticsShell>
  );
}

function AnalyticsShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <EducationShell
      scrollRegionLabel={t('teacher.shell.analyticsLabel')}
      contentClassName="p-4 md:px-8 md:py-6"
    >
      {children}
    </EducationShell>
  );
}
