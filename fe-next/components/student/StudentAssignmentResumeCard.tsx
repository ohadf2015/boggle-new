'use client';

/**
 * Resume card for the student class view: shown when an assignment is started
 * but unfinished, so the student has a way back to it. Renders nothing when
 * there is no started assignment.
 */

import Link from 'next/link';
import { Play } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { NextOpenAssignment } from './nextOpenAssignment';

export const STUDENT_ASSIGNMENT_RESUME_TESTID = 'student_assignment_resume';

export interface StudentAssignmentResumeCardProps {
  next: NextOpenAssignment | null;
}

export function StudentAssignmentResumeCard({ next }: StudentAssignmentResumeCardProps) {
  const { t } = useLanguage();
  if (!next) return null;

  return (
    <div
      data-testid={STUDENT_ASSIGNMENT_RESUME_TESTID}
      className="mb-3 rounded-neo border-3 border-neo-black bg-neo-cyan p-3 shadow-edu-lip-sm"
    >
      <p className="font-neo-body text-xs font-black uppercase text-neo-black/70">
        {t('student.classView.resumeAssignmentLabel', 'Continue your assignment')}
      </p>
      <Link
        href={next.href}
        data-testid="student_assignment_resume_cta"
        data-assignment-id={next.assignmentId}
        onClick={() => {
          posthog.capture('student_assignment_resume_clicked', {
            assignment_id: next.assignmentId,
            lesson_id: next.lessonId,
          });
        }}
        className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-edu-paper px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-black outline-none transition-transform hover:-translate-y-0.5 active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow"
      >
        <DirectionalIcon icon={Play} mirror className="h-5 w-5 fill-neo-black text-neo-black" />
        <span dir="auto" className="line-clamp-2 text-center">
          {t('student.classView.resumeAssignment', 'Resume {title}', { title: next.title })}
        </span>
      </Link>
    </div>
  );
}
