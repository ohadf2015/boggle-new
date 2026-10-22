'use client';

import React, { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomAnalytics } from '@/hooks/useClassroomAnalytics';
import { MetricCard } from './MetricCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { AlertTriangle, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AnalyticsDashboardProps {
  /** Classroom ID to fetch analytics for */
  classroomId: string;
  /** Callback when viewing filtered student list */
  onViewStudents?: (filter: 'struggling') => void;
  /** Callback when creating review lesson with mistake words */
  onCreateReviewLesson?: (words: string[]) => void;
  /** False when the host page already carries the analytics title. */
  showHeader?: boolean;
}

// ============================================
// COMPONENT
// ============================================

/**
 * The four class metrics (needing help, average XP, active today, common
 * mistakes), each with its action. The host page's tabs carry the student
 * table, lesson chart and heatmap; a student row there opens the report.
 */
export function AnalyticsDashboard({
  classroomId,
  onViewStudents,
  onCreateReviewLesson,
  showHeader = true,
}: AnalyticsDashboardProps) {
  const { t } = useLanguage();
  const { metrics, isLoading, error, refresh } = useClassroomAnalytics({ classroomId });

  const handleViewStudents = useCallback(() => {
    onViewStudents?.('struggling');
  }, [onViewStudents]);

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

  // Format class average XP with thousands separator
  const formattedAverageXp = metrics.classAverageXp.toLocaleString('en-US');

  // Active students ratio
  const activeStudentsRatio = `${metrics.activeStudentsToday}/${metrics.totalStudents}`;

  // Engagement percentage
  const engagementPercent =
    metrics.totalStudents > 0
      ? Math.round((metrics.activeStudentsToday / metrics.totalStudents) * 100)
      : 0;

  // Common mistakes count
  const commonMistakesCount = metrics.commonMistakes.length;

  // Extract words from common mistakes for review lesson
  const mistakeWords = metrics.commonMistakes.map(m => m.word);

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {showHeader && (
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
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Metric 1: Students Needing Help (Urgent) */}
        <MetricCard
          title={t('education.analytics.studentsNeedingHelp')}
          value={metrics.studentsNeedingHelp}
          icon={<AlertTriangle className="w-6 h-6" />}
          severity="urgent"
          compact
          testId="metric-students-needing-help"
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
          testId="metric-class-average-xp"
          compact
        />

        {/* Metric 3: Active Students Today (Info) */}
        <MetricCard
          title={t('education.analytics.activeStudentsToday')}
          value={activeStudentsRatio}
          icon={<Users className="w-6 h-6" />}
          severity="info"
          trendValue={`${engagementPercent}%`}
          trend={engagementPercent >= 70 ? 'up' : engagementPercent >= 50 ? 'neutral' : 'down'}
          testId="metric-active-students"
          compact
        />

        {/* Metric 4: Common Mistakes (Warning) */}
        <MetricCard
          title={t('education.analytics.commonMistakes')}
          value={commonMistakesCount}
          icon={<AlertCircle className="w-6 h-6" />}
          severity="warning"
          testId="metric-common-mistakes"
          compact
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
    </div>
  );
}

export default AnalyticsDashboard;
