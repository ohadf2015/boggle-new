/**
 * StudentProgressReport - Individual Student Progress Report View
 *
 * Displays detailed progress metrics for a single student with
 * word mastery breakdown and PDF export capability.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getStudentReportData,
  StudentReportData,
  DateRange,
} from '@/lib/supabase/analytics';
import logger from '@/utils/logger';

// =============================================
// TYPE DEFINITIONS
// =============================================

export interface StudentProgressReportProps {
  studentId: string;
  classroomId: string;
  lessonId?: string;
  dateRange?: DateRange;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Format minutes to hours and minutes string
 */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Get mastery status label
 */
function getMasteryStatus(mastered: boolean): string {
  return mastered ? 'Mastered' : 'Practicing';
}

/**
 * Get mastery status color class
 */
function getMasteryColor(mastered: boolean): string {
  return mastered
    ? 'bg-green-500 text-white'
    : 'bg-yellow-500 text-black';
}

// =============================================
// COMPONENT
// =============================================

/**
 * StudentProgressReport - Individual student progress view
 *
 * Fetches and displays student progress data with metrics,
 * word mastery breakdown, and PDF export functionality.
 */
export function StudentProgressReport({
  studentId,
  classroomId,
  lessonId,
  dateRange,
}: StudentProgressReportProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<StudentReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch data on mount or when props change
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const result = await getStudentReportData(
        studentId,
        classroomId,
        lessonId,
        dateRange
      );

      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [studentId, classroomId, lessonId, dateRange]);

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
        type: 'student' as const,
        studentName: data.studentName,
        classroomName: data.classroomName,
        generatedAt: new Date(),
        metrics: {
          wordsLearned: data.metrics.wordsLearned,
          totalWords: data.metrics.totalWords,
          accuracy: data.metrics.accuracy,
          practiceTimeMinutes: data.metrics.practiceTimeMinutes,
          currentStreak: data.metrics.currentStreak,
          longestStreak: data.metrics.longestStreak,
          sessionsCompleted: data.metrics.sessionsCompleted,
          averageScore: data.metrics.averageScore,
          masteryLevel: data.metrics.masteryLevel,
        },
        wordMastery: data.wordMastery.map((w) => ({
          word: w.word,
          mastered: w.mastered,
          accuracy: w.accuracy,
          attempts: w.attempts,
        })),
      };

      // Generate PDF blob
      const blob = await pdf(<ProgressReportPDF data={pdfData} />).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.studentName.replace(/\s+/g, '_')}_progress_report.pdf`;
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
            {t('teacher.reports.studentReport')}
          </h1>
          <p className="text-xl text-neo-white mt-1">{data.studentName}</p>
          <p className="text-neo-gray">{data.classroomName}</p>
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

      {/* Metrics Summary */}
      <section>
        <h2 className="text-lg font-bold text-neo-white mb-4 font-neo-display">
          {t('teacher.reports.sections.summary')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Words Learned */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.wordsLearned')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {data.metrics.wordsLearned} / {data.metrics.totalWords}
            </p>
          </div>

          {/* Accuracy */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.accuracy')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {data.metrics.accuracy}%
            </p>
          </div>

          {/* Practice Time */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.practiceTime')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {formatMinutes(data.metrics.practiceTimeMinutes)}
            </p>
          </div>

          {/* Current Streak */}
          <div className="p-4 bg-neo-navy border-neo border-black rounded-neo shadow-hard">
            <p className="text-sm text-neo-gray">
              {t('teacher.reports.metrics.currentStreak')}
            </p>
            <p className="text-2xl font-bold text-neo-white">
              {data.metrics.currentStreak} days
            </p>
          </div>
        </div>
      </section>

      {/* Word Mastery */}
      <section>
        <h2 className="text-lg font-bold text-neo-white mb-4 font-neo-display">
          {t('teacher.reports.sections.wordMastery')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-neo-navy border-b-2 border-black">
                <th className="text-left p-3 text-neo-white font-bold">{t('teacher.reports.columns.word')}</th>
                <th className="text-left p-3 text-neo-white font-bold">{t('teacher.reports.columns.status')}</th>
                <th className="text-left p-3 text-neo-white font-bold">{t('teacher.reports.columns.accuracy')}</th>
                <th className="text-left p-3 text-neo-white font-bold">{t('teacher.reports.columns.attempts')}</th>
              </tr>
            </thead>
            <tbody>
              {data.wordMastery.map((word, index) => (
                <tr
                  key={word.word}
                  className={`border-b border-neo-gray/30 ${
                    index % 2 === 0 ? 'bg-neo-navy/50' : 'bg-neo-navy/30'
                  }`}
                >
                  <td className="p-3 text-neo-white font-medium">{word.word}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${getMasteryColor(
                        word.mastered
                      )}`}
                    >
                      {getMasteryStatus(word.mastered)}
                    </span>
                  </td>
                  <td className="p-3 text-neo-white">{word.accuracy}%</td>
                  <td className="p-3 text-neo-white">{word.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-neo-white mb-4 font-neo-display">
            {t('teacher.reports.sections.recommendations')}
          </h2>
          <ul className="space-y-2">
            {data.recommendations.map((recommendation, index) => (
              <li
                key={`rec-${index}-${recommendation}`}
                className="flex items-start gap-2 p-3 bg-neo-navy/50 border-neo border-black rounded-neo"
              >
                <span className="text-neo-lime font-bold">-</span>
                <span className="text-neo-white">{recommendation}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default StudentProgressReport;
