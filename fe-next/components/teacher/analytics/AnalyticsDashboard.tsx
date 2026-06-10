'use client';

import React, { useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomAnalytics } from '@/hooks/useClassroomAnalytics';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import { MetricCard } from './MetricCard';
import { PageLoader } from '@/components/ui/PageLoader';
import { AlertTriangle, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VocabularyHeatmap } from './VocabularyHeatmap';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StudentProgressReport } from '@/components/teacher/reports/StudentProgressReport';
import { studentsToCsv } from '@/lib/education/studentProgressCsv';

const LessonEffectivenessChart = lazy(() => import('./LessonEffectivenessChart'));

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
  const { students } = useStudentProgressMetrics({ classroomId });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const studentTableRef = useRef<HTMLDivElement>(null);

  const handleViewStudents = useCallback(() => {
    if (typeof studentTableRef.current?.scrollIntoView === 'function') {
      studentTableRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    onViewStudents?.('struggling');
  }, [onViewStudents]);

  const handleExportReport = useCallback(() => {
    if (students.length === 0) return;
    const csv = studentsToCsv(students, {
      student: t('education.analytics.student'),
      level: t('education.analytics.colLevel'),
      mastery: t('education.analytics.mastery'),
      accuracy: t('education.analytics.accuracy'),
      streak: t('education.analytics.colStreak'),
    });
    // Prepend a UTF-8 BOM so spreadsheet apps render Hebrew/Japanese correctly.
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-progress-${classroomId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [students, classroomId, t]);

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

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Students Needing Help (Urgent) */}
        <MetricCard
          title={t('education.analytics.studentsNeedingHelp')}
          value={metrics.studentsNeedingHelp}
          icon={<AlertTriangle className="w-6 h-6" />}
          severity="urgent"
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

      {/* Student Progress Table */}
      <div ref={studentTableRef} className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-neo-display font-bold text-neo-white">
            {t('education.analytics.studentProgress')}
          </h3>
          <button
            onClick={handleExportReport}
            disabled={students.length === 0}
            className={cn(
              'px-4 py-2 bg-neo-cyan text-black border-3 border-black',
              'font-bold font-neo-body rounded-neo shadow-hard-sm',
              'hover:-translate-y-0.5 active:translate-y-0.5',
              'transition-all duration-100 text-sm',
              'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
            )}
          >
            {t('education.analytics.exportReport')}
          </button>
        </div>

        {students.length > 0 ? (
          <div className="border-3 border-black rounded-neo overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-neo-navy/60 border-b-2 border-black/30">
                  <th className="px-3 py-2 text-start text-xs font-bold text-neo-white">{t('education.analytics.student')}</th>
                  <th className="px-3 py-2 text-start text-xs font-bold text-neo-white">{t('education.analytics.colLevel')}</th>
                  <th className="px-3 py-2 text-start text-xs font-bold text-neo-white">{t('education.analytics.mastery')}</th>
                  <th className="px-3 py-2 text-start text-xs font-bold text-neo-white">{t('education.analytics.accuracy')}</th>
                  <th className="px-3 py-2 text-start text-xs font-bold text-neo-white">{t('education.analytics.colStreak')}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.studentId}
                    role="button"
                    tabIndex={0}
                    aria-label={`${student.displayName} — ${t('education.analytics.studentDetail')}`}
                    onClick={() => setSelectedStudentId(student.studentId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedStudentId(student.studentId);
                      }
                    }}
                    className="border-b border-black/10 hover:bg-neo-white/5 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neo-cyan"
                  >
                    <td className="px-3 py-2 text-sm font-bold text-neo-white">{student.displayName}</td>
                    <td className="px-3 py-2 text-sm text-neo-white">{student.currentLevel}</td>
                    <td className="px-3 py-2 text-sm text-neo-white">{student.vocabularyMastery}%</td>
                    <td className="px-3 py-2 text-sm text-neo-white">{student.overallAccuracy}%</td>
                    <td className="px-3 py-2 text-sm text-neo-white">{student.currentStreak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neo-white">{t('education.analytics.noStudents')}</p>
        )}
      </div>

      {/* Lesson Effectiveness Chart */}
      <div className="mt-6">
        <h3 className="text-lg font-neo-display font-bold text-neo-white mb-4">
          {t('education.analytics.lessonEffectiveness')}
        </h3>
        <Suspense fallback={<div className="animate-pulse h-48 bg-neo-white/5 rounded-neo" />}>
          <LessonEffectivenessChart classroomId={classroomId} />
        </Suspense>
      </div>

      {/* Vocabulary Mastery Heatmap */}
      <div className="mt-6">
        <VocabularyHeatmap classroomId={classroomId} />
      </div>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => { if (!open) setSelectedStudentId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('education.analytics.studentDetail')}</DialogTitle>
          </DialogHeader>
          {selectedStudentId && (
            <StudentProgressReport studentId={selectedStudentId} classroomId={classroomId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AnalyticsDashboard;
