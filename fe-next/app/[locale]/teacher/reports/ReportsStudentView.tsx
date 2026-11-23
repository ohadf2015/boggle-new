'use client';

import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { StudentArcView } from '@/components/teacher/reports/StudentArcView';
import { StudentParentPreview } from '@/components/teacher/reports/StudentParentPreview';
import { StudentProgressReport } from '@/components/teacher/reports/StudentProgressReport';

interface ReportsStudentViewProps {
  classroomId: string;
  studentId: string;
  studentName: string | null;
  onBack: () => void;
}

export function ReportsStudentView({ classroomId, studentId, studentName, onBack }: ReportsStudentViewProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2 text-neo-white shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0 active:shadow-none"
        aria-label={t('teacher.reports.backToClass')}
      >
        <DirectionalIcon icon={ArrowLeft} className="size-5" />
        <span>{t('teacher.reports.backToClass')}</span>
      </button>
      <StudentArcView studentId={studentId} classroomId={classroomId} studentName={studentName ?? undefined} />
      <StudentParentPreview classroomId={classroomId} studentId={studentId} studentName={studentName ?? undefined} />
      <StudentProgressReport studentId={studentId} classroomId={classroomId} />
    </div>
  );
}
