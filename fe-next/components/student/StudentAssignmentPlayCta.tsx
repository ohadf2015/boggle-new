'use client';

/**
 * Primary Play CTA for the next-open-assignment on the student class view.
 * Renders nothing when there is no open assignment.
 */

import Link from 'next/link';
import { Play } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { STUDENT_ASSIGNMENT_CTA_TESTID, type NextOpenAssignment } from './nextOpenAssignment';
import { assignmentDueState } from '@/lib/education/assignmentDueReminders';

export interface StudentAssignmentPlayCtaProps {
  next: NextOpenAssignment | null;
}

export function StudentAssignmentPlayCta({ next }: StudentAssignmentPlayCtaProps) {
  const { t } = useLanguage();
  if (!next) return null;
  const urgency = assignmentDueState(next.dueDate);
  const label =
    urgency === 'overdue'
      ? t('student.classView.playAssignmentOverdue', 'Overdue · Play {title}', { title: next.title })
      : urgency === 'due_soon'
        ? t('student.classView.playAssignmentDueSoon', 'Due soon · Play {title}', { title: next.title })
        : t('student.classView.playAssignment', 'Play {title}', { title: next.title });

  return (
    <Link
      href={next.href}
      data-testid={STUDENT_ASSIGNMENT_CTA_TESTID}
      data-assignment-id={next.assignmentId}
      data-due-state={urgency}
      onClick={() => {
        posthog.capture('student_assignment_cta_clicked', {
          assignment_id: next.assignmentId,
          lesson_id: next.lessonId,
        });
      }}
      className="mb-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-black shadow-hard-sm outline-none transition-transform hover:-translate-y-0.5 active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-neo-yellow"
    >
      <DirectionalIcon icon={Play} mirror className="h-5 w-5 fill-neo-black text-neo-black" />
      <span dir="auto" className="line-clamp-2 text-center">
        {label}
      </span>
    </Link>
  );
}
