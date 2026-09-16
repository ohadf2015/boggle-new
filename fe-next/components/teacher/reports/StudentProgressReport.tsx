/**
 * StudentProgressReport - Individual Student Progress Report View
 *
 * Detailed progress for a single student: headline metrics, a mastery meter,
 * the per-word breakdown and recommendations, with PDF export.
 */

'use client';

import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStudentReportData, DateRange } from '@/lib/supabase/analytics';
import { Stat } from '@/components/ui/Stat';
import { cn } from '@/lib/utils';
import { downloadReportPdf } from './downloadReportPdf';
import { RECOMMENDATION_LABEL_KEY, formatPracticeMinutes, percentOf } from './reportLabels';
import {
  AccuracyBar,
  MasteryMeter,
  ReportEmpty,
  ReportError,
  ReportHeader,
  ReportSkeleton,
  SectionTitle,
  useReportData,
  useReportExport,
} from './ReportChrome';

export interface StudentProgressReportProps {
  studentId: string;
  classroomId: string;
  lessonId?: string;
  dateRange?: DateRange;
}

export function StudentProgressReport({ studentId, classroomId, lessonId, dateRange }: StudentProgressReportProps) {
  const { t, language, dir } = useLanguage();

  const load = useCallback(
    () => getStudentReportData(studentId, classroomId, lessonId, dateRange),
    [studentId, classroomId, lessonId, dateRange]
  );
  const { data, loading, failed, retry } = useReportData(load);

  const build = useCallback(async () => {
    if (!data) return;
    await downloadReportPdf({
      t,
      language,
      dir,
      fileName: t('teacher.reports.export.fileStudent', { name: data.studentName }),
      data: {
        type: 'student',
        studentName: data.studentName,
        classroomName: data.classroomName,
        generatedAt: new Date(),
        metrics: { ...data.metrics },
        wordMastery: data.wordMastery.map(({ word, mastered, accuracy, attempts }) => ({ word, mastered, accuracy, attempts })),
        recommendations: data.recommendations,
      },
    });
  }, [data, t, language, dir]);
  const exporter = useReportExport(build);

  if (loading) return <ReportSkeleton />;
  if (failed) return <ReportError onRetry={retry} />;
  if (!data) return <ReportEmpty />;

  const { metrics } = data;
  const masteredPct = percentOf(metrics.wordsLearned, metrics.totalWords);

  return (
    <div className="space-y-8">
      <ReportHeader
        title={t('teacher.reports.studentReport')}
        subject={data.studentName}
        meta={[data.classroomName]}
        exportState={exporter.state}
        onExport={exporter.run}
      />

      <section aria-label={t('teacher.reports.sections.summary')} className="space-y-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat value={`${metrics.wordsLearned} / ${metrics.totalWords}`} label={t('teacher.reports.metrics.wordsLearned')} size="lg" className="w-full" />
          <Stat value={`${metrics.accuracy}%`} label={t('teacher.reports.metrics.accuracy')} size="lg" className="w-full" />
          <Stat value={formatPracticeMinutes(t, metrics.practiceTimeMinutes)} label={t('teacher.reports.metrics.practiceTime')} size="lg" className="w-full" />
          <Stat value={t('teacher.reports.streakDays', { count: metrics.currentStreak })} label={t('teacher.reports.metrics.currentStreak')} size="lg" className="w-full" />
        </div>

        <MasteryMeter percent={masteredPct} label={t('teacher.reports.masteredShare', { percent: masteredPct })} />

        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {[
            [t('teacher.reports.metrics.sessionsCompleted'), metrics.sessionsCompleted],
            [t('teacher.reports.metrics.averageScore'), metrics.averageScore],
            [t('teacher.reports.metrics.longestStreak'), t('teacher.reports.streakDays', { count: metrics.longestStreak })],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-baseline gap-2">
              <dt className="text-neo-cream/75">{label}</dt>
              <dd className="font-bold text-neo-white tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <SectionTitle>{t('teacher.reports.sections.wordMastery')}</SectionTitle>
        {data.wordMastery.length === 0 ? (
          <p className="rounded-neo border-2 border-dashed border-neo-cream/30 p-6 text-center text-neo-cream/80">
            {t('teacher.reports.noWordsYet')}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-neo border-2 border-neo-cream/25">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-neo-navy text-neo-cream/80">
                  <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.word')}</th>
                  <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.status')}</th>
                  <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.accuracy')}</th>
                  <th scope="col" className="p-3 text-end font-bold">{t('teacher.reports.columns.attempts')}</th>
                </tr>
              </thead>
              <tbody>
                {data.wordMastery.map((word) => (
                  <tr key={word.word} className="border-t border-neo-cream/10 transition-colors hover:bg-neo-cream/5">
                    <td className="p-3 font-bold text-neo-white">{word.word}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'inline-block rounded-neo border-2 border-black px-2 py-0.5 text-xs font-bold text-black',
                          word.mastered ? 'bg-neo-lime' : 'bg-neo-yellow'
                        )}
                      >
                        {word.mastered ? t('teacher.reports.mastery.mastered') : t('teacher.reports.mastery.practicing')}
                      </span>
                    </td>
                    <td className="p-3 text-neo-white">
                      <AccuracyBar value={word.accuracy} />
                    </td>
                    <td className="p-3 text-end text-neo-white tabular-nums">{word.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data.recommendations && data.recommendations.length > 0 && (
        <section>
          <SectionTitle>{t('teacher.reports.sections.recommendations')}</SectionTitle>
          <ul className="space-y-2">
            {data.recommendations.map((recommendation) => (
              <li
                key={recommendation}
                className="flex items-start gap-3 rounded-neo border-2 border-neo-cream/25 bg-neo-navy-light p-4"
              >
                <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 border-2 border-black bg-neo-lime" />
                <span className="text-neo-white">{t(RECOMMENDATION_LABEL_KEY[recommendation])}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default StudentProgressReport;
