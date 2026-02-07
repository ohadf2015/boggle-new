'use client';

import React from 'react';
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
}

// ============================================
// COMPONENT
// ============================================

/**
 * AnalyticsDashboard Component
 *
 * Main analytics dashboard displaying 4 key classroom metrics:
 * 1. Students Needing Help (urgent) - Students with <60% accuracy
 * 2. Class Average XP (info) - Average XP across all students
 * 3. Active Today (info) - Student engagement ratio
 * 4. Common Mistakes (warning) - Top mistake words
 *
 * Research shows limiting to 3-5 metrics prevents data fatigue.
 * Actionable buttons enable teacher workflows (view students, create review lesson).
 *
 * @example
 * <AnalyticsDashboard
 *   classroomId="class-123"
 *   onViewStudents={(filter) => navigate(`/students?filter=${filter}`)}
 *   onCreateReviewLesson={(words) => navigate(`/lessons/create?words=${words.join(',')}`)}
 * />
 */
export function AnalyticsDashboard({
  classroomId,
  onViewStudents,
  onCreateReviewLesson,
}: AnalyticsDashboardProps) {
  const { t } = useLanguage();
  const { metrics, isLoading, error, refresh } = useClassroomAnalytics({ classroomId });

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
          'bg-neo-navy border-neo border-neo-pink shadow-hard rounded-neo p-6',
          'flex flex-col items-center gap-4 text-center'
        )}
      >
        <AlertCircle className="w-12 h-12 text-neo-pink" />
        <div>
          <h3 className="text-xl font-neo-display text-neo-white mb-2">
            {t('education.analytics.error')}
          </h3>
          <p className="text-neo-white/70 text-sm">{error.message}</p>
        </div>
        <button
          onClick={refresh}
          className={cn(
            'px-6 py-2 bg-neo-cyan text-neo-black',
            'font-bold font-neo-body rounded-neo shadow-hard-sm',
            'hover:shadow-hard-pressed active:shadow-hard-pressed',
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
          'bg-neo-navy border-neo border-neo-black shadow-hard rounded-neo p-6',
          'flex flex-col items-center gap-4 text-center'
        )}
      >
        <Users className="w-12 h-12 text-neo-cyan" />
        <div>
          <h3 className="text-xl font-neo-display text-neo-white mb-2">
            {t('education.analytics.noData')}
          </h3>
          <p className="text-neo-white/70 text-sm">{t('education.analytics.assignLessons')}</p>
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-neo-display text-neo-white">
            {t('education.analytics.title')}
          </h2>
          <p className="text-neo-white/70 text-sm">{t('education.analytics.subtitle')}</p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Students Needing Help (Urgent) */}
        <MetricCard
          title={t('education.analytics.studentsNeedingHelp')}
          value={metrics.studentsNeedingHelp}
          icon={<AlertTriangle className="w-6 h-6" />}
          severity="urgent"
          testId="metric-students-needing-help"
          actionable={
            onViewStudents
              ? {
                  label: t('education.analytics.viewStudents'),
                  onClick: () => onViewStudents('struggling'),
                }
              : undefined
          }
        />

        {/* Metric 2: Class Average XP (Info) */}
        <MetricCard
          title={t('education.analytics.classAverageXp')}
          value={formattedAverageXp}
          icon={<TrendingUp className="w-6 h-6" />}
          severity="info"
          testId="metric-class-average-xp"
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
        />

        {/* Metric 4: Common Mistakes (Warning) */}
        <MetricCard
          title={t('education.analytics.commonMistakes')}
          value={commonMistakesCount}
          icon={<AlertCircle className="w-6 h-6" />}
          severity="warning"
          testId="metric-common-mistakes"
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

      {/* Placeholder for future sections (charts, individual progress, etc.) */}
    </div>
  );
}

export default AnalyticsDashboard;
