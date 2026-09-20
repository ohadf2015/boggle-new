/**
 * ClassProgressReport - Class Progress Report View
 *
 * Class-wide progress: headline metrics, top performers, students needing
 * attention and the full ranking, with PDF export. Every student name drills
 * into that student's report.
 */

'use client';

import { useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassReportData, DateRange } from '@/lib/supabase/analytics';
import { Stat } from '@/components/ui/Stat';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { downloadReportPdf } from './downloadReportPdf';
import { ISSUE_LABEL_KEY } from './reportLabels';
import {
  AccuracyBar,
  ReportEmpty,
  ReportError,
  ReportHeader,
  ReportSkeleton,
  SectionTitle,
  useReportData,
  useReportExport,
} from './ReportChrome';

export interface ClassProgressReportProps {
  classroomId: string;
  dateRange?: DateRange;
  onStudentClick?: (studentId: string) => void;
}

/** Podium fills — accent fills take black ink only. */
const PODIUM = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink'];

export function ClassProgressReport({ classroomId, dateRange, onStudentClick }: ClassProgressReportProps) {
  const { t, language, dir } = useLanguage();

  const load = useCallback(() => getClassReportData(classroomId, dateRange), [classroomId, dateRange]);
  const { data, loading, failed, retry } = useReportData(load);

  const build = useCallback(async () => {
    if (!data) return;
    await downloadReportPdf({
      t,
      language,
      dir,
      fileName: t('teacher.reports.export.fileClass', { name: data.classroomName }),
      data: {
        type: 'class',
        classroomName: data.classroomName,
        teacherName: data.teacherName,
        generatedAt: new Date(),
        metrics: { ...data.metrics },
        topPerformers: data.topPerformers.map(({ studentName, accuracy, wordsLearned }) => ({ studentName, accuracy, wordsLearned })),
        studentsNeedingAttention: data.studentsNeedingAttention.map(({ studentName, accuracy, issue }) => ({ studentName, accuracy, issue })),
        studentRankings: data.studentRankings.map(({ rank, studentName, score, accuracy, wordsLearned }) => ({
          rank,
          studentName,
          score,
          accuracy,
          wordsLearned,
        })),
      },
    });
  }, [data, t, language, dir]);
  const exporter = useReportExport(build);

  if (loading) return <ReportSkeleton />;
  if (failed) return <ReportError onRetry={retry} />;
  if (!data) return <ReportEmpty />;

  const { metrics } = data;

  /** A student's name — a drill-down link when the page supports it. */
  const studentName = (studentId: string, name: string, className?: string) =>
    onStudentClick ? (
      <button
        type="button"
        onClick={() => onStudentClick(studentId)}
        aria-label={t('teacher.reports.viewStudentProgress', { name })}
        className={cn(
          'group inline-flex min-h-11 items-center gap-1 text-start font-bold text-neo-white underline-offset-4 transition-colors hover:text-neo-lime hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan',
          className
        )}
      >
        <span className="break-words">{name}</span>
        <DirectionalIcon
          icon={ChevronRight}
          className="size-4 shrink-0 opacity-40 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100 rtl:group-hover:-translate-x-0.5"
        />
      </button>
    ) : (
      <span className={cn('font-bold text-neo-white', className)}>{name}</span>
    );

  return (
    <div className="space-y-8">
      <ReportHeader
        title={t('teacher.reports.classReport')}
        subject={data.classroomName}
        meta={[t('teacher.reports.teacherLine', { name: data.teacherName })]}
        exportState={exporter.state}
        onExport={exporter.run}
      />

      <section aria-label={t('teacher.reports.sections.summary')} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat value={metrics.totalStudents} label={t('teacher.reports.metrics.totalStudents')} size="lg" className="w-full" />
        <Stat value={metrics.activeStudents} label={t('teacher.reports.metrics.activeStudents')} size="lg" className="w-full" />
        <Stat value={`${metrics.classAverageAccuracy}%`} label={t('teacher.reports.metrics.classAverageAccuracy')} size="lg" className="w-full" />
        <Stat value={`${metrics.completionRate}%`} label={t('teacher.reports.metrics.completionRate')} size="lg" className="w-full" />
      </section>

      {data.topPerformers.length > 0 && (
        <section>
          <SectionTitle>{t('teacher.reports.sections.topPerformers')}</SectionTitle>
          <ol className="grid gap-3 sm:grid-cols-3">
            {data.topPerformers.map((performer, index) => (
              <li
                key={performer.studentId}
                className="flex items-center gap-3 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light p-3 shadow-hard-sm"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-neo border-2 border-black font-neo-display text-lg font-black text-black',
                    PODIUM[index] ?? 'bg-neo-cream'
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  {studentName(performer.studentId, performer.studentName)}
                  <p className="text-sm text-neo-cream/75 tabular-nums">
                    {`${performer.accuracy}% · ${t('education.classroomGame.words', { count: performer.wordsLearned })}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {data.studentsNeedingAttention.length > 0 && (
        <section>
          <SectionTitle>{t('teacher.reports.sections.needsAttention')}</SectionTitle>
          <ul className="divide-y divide-neo-pink/25 rounded-neo border-2 border-neo-pink bg-neo-pink/10">
            {data.studentsNeedingAttention.map((student) => (
              <li key={student.studentId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1">
                <div className="min-w-0 flex-1">{studentName(student.studentId, student.studentName)}</div>
                <span className="text-sm text-neo-white">
                  <AccuracyBar value={student.accuracy} />
                </span>
                <span className="rounded-neo border-2 border-black bg-neo-pink px-2 py-0.5 text-xs font-bold text-black">
                  {t(ISSUE_LABEL_KEY[student.issue])}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>{t('teacher.reports.sections.studentRankings')}</SectionTitle>
        <div className="overflow-x-auto rounded-neo border-2 border-neo-cream/25">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neo-navy text-neo-cream/80">
                <th scope="col" className="w-16 p-3 text-start font-bold">{t('teacher.reports.columns.rank')}</th>
                <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.student')}</th>
                <th scope="col" className="hidden p-3 text-end font-bold sm:table-cell">{t('teacher.reports.columns.score')}</th>
                <th scope="col" className="p-3 text-start font-bold">{t('teacher.reports.columns.accuracy')}</th>
                <th scope="col" className="p-3 text-end font-bold">{t('teacher.reports.columns.words')}</th>
              </tr>
            </thead>
            <tbody>
              {data.studentRankings.map((student) => (
                <tr key={student.studentId} className="border-t border-neo-cream/40 transition-colors hover:bg-neo-cream/5">
                  <td className="px-3 font-neo-display text-base font-black text-neo-cream/80 tabular-nums">{student.rank}</td>
                  <td className="px-3">{studentName(student.studentId, student.studentName)}</td>
                  <td className="hidden px-3 text-end text-neo-white tabular-nums sm:table-cell">{student.score}</td>
                  <td className="px-3 text-neo-white">
                    <AccuracyBar value={student.accuracy} />
                  </td>
                  <td className="px-3 text-end text-neo-white tabular-nums">{student.wordsLearned}</td>
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
