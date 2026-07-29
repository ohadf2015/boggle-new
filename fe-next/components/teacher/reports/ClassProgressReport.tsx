/**
 * ClassProgressReport - Class Progress Report View
 *
 * Displays class-wide progress metrics with top performers,
 * students needing attention, rankings, and PDF export capability.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getClassReportData,
  ClassReportData,
  DateRange,
} from '@/lib/supabase/analytics';
import logger from '@/utils/logger';

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface ClassProgressReportProps {
  classroomId: string;
  dateRange?: DateRange;
  onStudentClick?: (studentId: string) => void;
}

// =============================================
// COMPONENT
// =============================================

/**
 * ClassProgressReport - Class-wide progress view
 *
 * Fetches and displays class progress data with metrics,
 * top performers, students needing attention, rankings, and PDF export.
 */
export function ClassProgressReport({
  classroomId,
  dateRange,
  onStudentClick,
}: ClassProgressReportProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<ClassReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch data on mount or when props change
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const result = await getClassReportData(classroomId, dateRange);

      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [classroomId, dateRange]);

  // Handle PDF export
  const handleExportPDF = useCallback(async () => {
    if (!data) return;

    setExporting(true);

    try {
      // Dynamically import PDF components to reduce initial bundle size
      const [{ pdf }, { ProgressReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./ProgressReportPDF'),
      ]);

      // Convert data to PDF format
      const pdfData = {
        type: 'class' as const,
        classroomName: data.classroomName,
        teacherName: data.teacherName,
        generatedAt: new Date(),
        metrics: {
          totalStudents: data.metrics.totalStudents,
          activeStudents: data.metrics.activeStudents,
          classAverageAccuracy: data.metrics.classAverageAccuracy,
          classAverageWordsLearned: data.metrics.classAverageWordsLearned,
          completionRate: data.metrics.completionRate,
          participationRate: data.metrics.participationRate,
        },
        topPerformers: data.topPerformers.map((p) => ({
          studentName: p.studentName,
          accuracy: p.accuracy,
          wordsLearned: p.wordsLearned,
        })),
        studentRankings: data.studentRankings.map((s) => ({
          rank: s.rank,
          studentName: s.studentName,
          score: s.score,
          accuracy: s.accuracy,
          wordsLearned: s.wordsLearned,
        })),
      };

      // Generate PDF blob
      const blob = await pdf(<ProgressReportPDF data={pdfData} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.classroomName.replace(/\s+/g, '_')}_class_report.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Error generating PDF:', err);
    } finally {
      setExporting(false);
    }
  }, [data]);

  // Handle student click - just pass through to parent handler
  const handleStudentClick = onStudentClick;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neo-gray animate-pulse">
          {t('teacher.reports.loading')}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">{t('teacher.reports.error')}</div>
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neo-gray">{t('teacher.reports.noData')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neo-white font-neo-display">
            {t('teacher.reports.classReport')}
          </h1>
          <p className="text-xl text-neo-white mt-1">{data.classroomName}</p>
          <p className="text-neo-gray">Teacher: {data.teacherName}</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="px-4 py-2 bg-neo-lime text-black font-bold rounded-neo border-neo border-black shadow-hard hover:shadow-hard-pressed transition-shadow disabled:opacity-50"
        >
          {exporting
            ? t('teacher.reports.export.downloading')
            : t('teacher.reports.export.pdf')}
        </button>
      </div>

      {/* Class Metrics */}
      <section>
        <h2 className="text-lg font-bold text-neo-white mb-4 font-neo-display">
          {t('teacher.reports.sections.summary')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Students */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.totalStudents')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {data.metrics.totalStudents}
            </p>
          </div>

          {/* Active Students */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.activeStudents')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {data.metrics.activeStudents}
            </p>
          </div>

          {/* Class Average Accuracy */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.classAverageAccuracy')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {data.metrics.classAverageAccuracy}%
            </p>
          </div>

          {/* Completion Rate */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.completionRate')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {data.metrics.completionRate}%
            </p>
          </div>
        </div>
      </section>

      {/* Top Performers */}
      {data.topPerformers.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-neo-white mb-4 font-neo-display">
            {t('teacher.reports.sections.topPerformers')}
          </h2>
          <div className="space-y-2">
            {data.topPerformers.map((performer, index) => (
              <div
                key={performer.studentId}
                className="flex items-center gap-4 p-3 bg-neo-lime/10 border-neo border-black rounded-neo"
              >
                <span className="text-xl font-bold text-neo-lime w-8">
                  #{index + 1}
                </span>
                {handleStudentClick ? (
                  <button
                    onClick={() => handleStudentClick(performer.studentId)}
                    className="flex-1 text-left text-neo-white font-medium hover:text-neo-lime transition-colors"
                    aria-label={`View ${performer.studentName}'s profile`}
                  >
                    {performer.studentName}
                  </button>
                ) : (
                  <span className="flex-1 text-neo-white font-medium">
                    {performer.studentName}
                  </span>
                )}
                <span className="text-neo-gray text-sm">
                  {performer.accuracy}% | {performer.wordsLearned} words
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Students Needing Attention */}
      {data.studentsNeedingAttention.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-neo-white mb-4 font-neo-display">
            {t('teacher.reports.sections.needsAttention')}
          </h2>
          <div className="space-y-2">
            {data.studentsNeedingAttention.map((student) => (
              <div
                key={student.studentId}
                className="flex items-center gap-4 p-3 bg-red-500/10 border-neo border-black rounded-neo"
              >
                {handleStudentClick ? (
                  <button
                    onClick={() => handleStudentClick(student.studentId)}
                    className="flex-1 text-left text-neo-white font-medium hover:text-neo-lime transition-colors"
                    aria-label={`View ${student.studentName}'s profile`}
                  >
                    {student.studentName}
                  </button>
                ) : (
                  <span className="flex-1 text-neo-white font-medium">
                    {student.studentName}
                  </span>
                )}
                <span className="text-neo-gray text-sm">
                  {student.accuracy}%
                </span>
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  {student.issue}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Student Rankings */}
      <section>
        <h2 className="text-lg font-bold text-neo-white mb-4 font-neo-display">
          {t('teacher.reports.sections.studentRankings')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neo-navy border-b-2 border-black">
                <th className="text-left p-3 text-neo-white font-bold w-16">Rank</th>
                <th className="text-left p-3 text-neo-white font-bold">Student</th>
                <th className="text-left p-3 text-neo-white font-bold">Score</th>
                <th className="text-left p-3 text-neo-white font-bold">Accuracy</th>
                <th className="text-left p-3 text-neo-white font-bold">Words</th>
              </tr>
            </thead>
            <tbody>
              {data.studentRankings.map((student, index) => (
                <tr
                  key={student.studentId}
                  className={`border-b border-neo-gray/30 ${
                    index % 2 === 0 ? 'bg-neo-navy/50' : 'bg-neo-navy/30'
                  }`}
                >
                  <td className="p-3 text-neo-white font-bold">{student.rank}</td>
                  <td className="p-3">
                    {handleStudentClick ? (
                      <button
                        onClick={() => handleStudentClick(student.studentId)}
                        className="text-neo-white font-medium hover:text-neo-lime transition-colors"
                        aria-label={`View ${student.studentName}'s profile`}
                      >
                        {student.studentName}
                      </button>
                    ) : (
                      <span className="text-neo-white font-medium">
                        {student.studentName}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-neo-white">{student.score}</td>
                  <td className="p-3 text-neo-white">{student.accuracy}%</td>
                  <td className="p-3 text-neo-white">{student.wordsLearned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ClassProgressReport;
