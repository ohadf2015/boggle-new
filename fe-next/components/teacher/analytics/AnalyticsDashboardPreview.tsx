'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomAnalytics } from '@/hooks/useClassroomAnalytics';
import { MetricCard } from './MetricCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { AlertTriangle, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AnalyticsDashboardPreviewProps {
  /** Classroom ID to fetch analytics for */
  classroomId: string;
  /** Callback when creating review lesson with mistake words. Free for every teacher. */
  onCreateReviewLesson?: (words: string[]) => void;
}
// Deliberately no `onViewStudents`: in preview mode the per-student table is not rendered at
// all, so any handler an caller threads in would act on something absent. Accepting the prop
// only made it possible to wire this button to nothing, which is what happened.

// ============================================
// COMPONENT
// ============================================

/**
 * AnalyticsDashboardPreview Component
 *
 * Limited preview of analytics showing only headline metrics for free teachers:
 * 1. Students Needing Help (urgent)
 * 2. Class Average XP (info)
 * 3. Active Today (info)
 * 4. Common Mistakes (warning)
 *
 * Does NOT fetch or render:
 * - Student progress table (detailed per-student data)
 * - Lesson effectiveness chart (deep analysis)
 * - Vocabulary heatmap (deep analysis)
 * - Student detail dialog (individual deep dive)
 * - Export functionality
 *
 * This is the honest preview: genuinely valuable summary metrics that make the
 * full version desirable, without rendering or fetching paid content.
 */
export function AnalyticsDashboardPreview({
  classroomId,
  onCreateReviewLesson,
}: AnalyticsDashboardPreviewProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { metrics, isLoading, error, refresh } = useClassroomAnalytics({ classroomId });

  // The count is free; WHICH students are struggling is the paid half, and the table is
  // deliberately not rendered here. An earlier cut scrolled to a ref on an empty div, so this
  // button took a free teacher precisely nowhere — the dead end this preview exists to remove.
  // Asking "who?" is the moment of most interest, so send her to the thing that answers it.
  const handleViewStudents = useCallback(() => {
    router.push(`/${language}/teacher/upgrade`);
  }, [router, language]);

  // ==================== LOADING STATE ====================

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <PageLoader size="lg" text={t('education.analytics.loading')} />
      </div>
    );
  }

  // ==================== ERROR STATE ====================

  if (error) {
    return (
      <div
        className={cn(
          'bg-neo-cream border-3 border-black shadow-hard rounded-neo p-6',
          'flex flex-col items-center gap-4 text-center'
        )}
      >
        <div className="w-14 h-14 rounded-neo bg-neo-pink border-3 border-black flex items-center justify-center shadow-hard-sm">
          <AlertCircle className="w-8 h-8 text-black" />
        </div>
        <div>
          <h3 className="text-xl font-neo-display font-black text-black mb-2">
            {t('education.analytics.error')}
          </h3>
          <p className="text-black/60 font-bold text-sm">{error.message}</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className={cn(
            'px-6 py-2 bg-neo-cyan text-black border-3 border-black',
            'font-black font-neo-body rounded-neo shadow-hard-sm',
            'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
            'transition-all duration-100'
          )}
        >
          {t('education.analytics.retry')}
        </button>
      </div>
    );
  }

  // ==================== NO DATA STATE ====================

  if (!metrics) {
    return (
      <div
        className={cn(
          'bg-neo-cream border-3 border-black shadow-hard rounded-neo p-6',
          'flex flex-col items-center gap-4 text-center'
        )}
      >
        <div className="w-14 h-14 rounded-neo bg-neo-cyan border-3 border-black flex items-center justify-center shadow-hard-sm">
          <Users className="w-8 h-8 text-black" />
        </div>
        <div>
          <h3 className="text-xl font-neo-display font-black text-black mb-2">
            {t('education.analytics.noData')}
          </h3>
          <p className="text-black/60 font-bold text-sm">{t('education.analytics.assignLessons')}</p>
        </div>
      </div>
    );
  }

  // ==================== COMPUTE DERIVED VALUES ====================

  const formattedAverageXp = metrics.classAverageXp.toLocaleString('en-US');
  const activeStudentsRatio = `${metrics.activeStudentsToday}/${metrics.totalStudents}`;
  const engagementPercent =
    metrics.totalStudents > 0
      ? Math.round((metrics.activeStudentsToday / metrics.totalStudents) * 100)
      : 0;
  const commonMistakesCount = metrics.commonMistakes.length;
  const mistakeWords = metrics.commonMistakes.map(m => m.word);

  // ==================== RENDER ====================

  return (
    <div className="space-y-6" data-testid="pro-gate-preview-analytics">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-neo bg-neo-cyan border-3 border-black flex items-center justify-center shadow-hard-sm">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-neo-display font-black text-neo-white">
              {t('education.analytics.title')}
            </h2>
            <p className="text-neo-white text-sm font-bold">{t('education.analytics.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Headline Metric Cards - The Free Slice */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Students Needing Help (Urgent) */}
        <MetricCard
          title={t('education.analytics.studentsNeedingHelp')}
          value={metrics.studentsNeedingHelp}
          icon={<AlertTriangle className="w-6 h-6" />}
          severity="urgent"
          testId="metric-students-needing-help-preview"
          actionable={{
            label: t('education.analytics.viewStudents'),
            onClick: handleViewStudents,
          }}
        />

        {/* Metric 2: Class Average XP (Info) */}
        <MetricCard
          title={t('education.analytics.classAverageXp')}
          value={formattedAverageXp}
          icon={<TrendingUp className="w-6 h-6" />}
          severity="info"
          testId="metric-class-average-xp-preview"
        />

        {/* Metric 3: Active Students Today (Info) */}
        <MetricCard
          title={t('education.analytics.activeStudentsToday')}
          value={activeStudentsRatio}
          icon={<Users className="w-6 h-6" />}
          severity="info"
          trendValue={`${engagementPercent}%`}
          trend={engagementPercent >= 70 ? 'up' : engagementPercent >= 50 ? 'neutral' : 'down'}
          testId="metric-active-students-preview"
        />

        {/* Metric 4: Common Mistakes (Warning) */}
        <MetricCard
          title={t('education.analytics.commonMistakes')}
          value={commonMistakesCount}
          icon={<AlertCircle className="w-6 h-6" />}
          severity="warning"
          testId="metric-common-mistakes-preview"
          actionable={
            onCreateReviewLesson && commonMistakesCount > 0
              ? {
                  label: t('education.analytics.createReviewLesson'),
                  onClick: () => onCreateReviewLesson(mistakeWords),
                }
              : undefined
          }
        />
      </div>

      {/* Preview Boundary - Everything Below This Is Locked */}
      <div className="border-t-2 border-dashed border-neo-white/20 pt-4">
        <div className="bg-neo-navy-light border-2 border-dashed border-neo-white/20 rounded-neo p-4 text-center">
          <p className="text-sm font-bold text-neo-white/60">
            {t('education.analytics.previewLocked')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboardPreview;
