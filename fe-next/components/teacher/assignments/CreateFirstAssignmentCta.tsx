'use client';

/**
 * Empty-class primary CTA on the teacher class assignment view.
 * Hidden once the class has any assignment (start-live-class takes over).
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherAssignHref } from '@/hooks/useTeacherDashboardDeepLink';
import {
  trackTeacherFirstAssignmentCtaClicked,
  trackTeacherFirstAssignmentCtaViewed,
} from '@/lib/education/telemetry';

export const TEACHER_FIRST_ASSIGNMENT_CTA_TESTID = 'teacher-first-assignment-cta';

export interface CreateFirstAssignmentCtaProps {
  classroomId: string;
  /** Null while the list is unresolved — unknown must not look like zero. */
  assignmentCount: number | null;
}

export function CreateFirstAssignmentCta({
  classroomId,
  assignmentCount,
}: CreateFirstAssignmentCtaProps) {
  const { t, language } = useLanguage();
  const show = assignmentCount === 0;

  useEffect(() => {
    if (!show) return;
    trackTeacherFirstAssignmentCtaViewed({ classroomId });
  }, [show, classroomId]);

  if (!show) return null;

  return (
    <Link
      href={teacherAssignHref(language, classroomId)}
      data-testid={TEACHER_FIRST_ASSIGNMENT_CTA_TESTID}
      onClick={() => trackTeacherFirstAssignmentCtaClicked({ classroomId })}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-4 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
    >
      <ClipboardList className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
      {t('teacher.tracking.createFirst', 'Create first assignment')}
    </Link>
  );
}

export default CreateFirstAssignmentCta;
