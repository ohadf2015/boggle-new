'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { freeInsightClassId } from '@/lib/education/pro/freeClassInsight';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { ClassReportHeader } from '@/components/teacher/reports/ClassReportHeader';
import { FreeWeekInsight, type FreeWeekStatus } from '@/components/teacher/analytics/free/FreeWeekInsight';
import { ReportsFreeInsights } from './ReportsFreeInsights';
import { OwnClassProPreview } from './OwnClassProPreview';
import { reportId } from './reportParams';

const FRAME = 'mx-auto mb-4 flex w-full max-w-5xl flex-col gap-4 sm:mb-6';

interface FreeClass {
  id: string;
  name: string;
  created_at: string;
  member_count?: number;
}

/** The class the list view previews: the free class when anyone has joined it, else the first class that has students. */
export function ownPreviewClass<C extends FreeClass>(classrooms: readonly C[]): C | null {
  const withStudents = classrooms.filter((c) => (c.member_count ?? 0) > 0);
  const freeId = freeInsightClassId(classrooms);
  return withStudents.find((c) => c.id === freeId) ?? withStudents[0] ?? null;
}

/** A free teacher's reports page: their real week and roster first; the Pro lock follows. */
export function ReportsLockedTitle({ onWeekStatus }: { onWeekStatus?: (status: FreeWeekStatus) => void }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classrooms, isLoading } = useClassrooms();
  const askedId = reportId(searchParams?.get('classroomId'));
  const selected = askedId ? classrooms?.find((c) => c.id === askedId) : undefined;

  if (askedId && isLoading) return <div aria-busy="true" className={`${FRAME} h-40 rounded-neo-xl bg-neo-cream/10 motion-safe:animate-pulse`} />;

  if (selected) {
    return (
      <div data-testid="reports-free-class" className={FRAME}>
        <ClassReportHeader
          eyebrow={t('teacher.reports.title')}
          name={selected.name}
          memberCount={selected.member_count}
          onBack={() => router.push(`/${language}/teacher/classroom/${selected.id}`)}
          link={{ href: teacherHostHref(language, { classroomId: selected.id }), label: t('teacher.weekInsight.startGame'), testId: 'reports-start-game' }}
        />
        <FreeWeekInsight classroomId={selected.id} locale={language} onStatus={onWeekStatus} />
        <OwnClassProPreview classroomId={selected.id} className={selected.name} />
      </div>
    );
  }

  const preview = classrooms ? ownPreviewClass(classrooms) : null;
  return (
    <div className={FRAME}>
      <div>
        <h1 className="font-neo-display text-2xl font-bold leading-tight text-neo-white sm:text-3xl">{t('teacher.reports.title')}</h1>
        <p data-testid="reports-locked-value" className="mt-1 max-w-prose text-sm leading-snug text-neo-cream sm:text-base">
          {t('teacher.reports.lockedValue')}
        </p>
      </div>
      <ReportsFreeInsights onWeekStatus={onWeekStatus} />
      {preview ? <OwnClassProPreview classroomId={preview.id} className={preview.name} /> : null}
    </div>
  );
}
