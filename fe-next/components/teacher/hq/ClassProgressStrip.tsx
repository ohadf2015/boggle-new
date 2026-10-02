'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { shouldShowClassProgressStrip } from '@/lib/education/classProgressStrip';
import {
  trackTeacherHqProgressViewed,
  trackTeacherHqUpgradeClicked,
} from '@/lib/education/telemetry';

export interface ClassProgressStripProps {
  classroomId: string;
  studentCount: number;
  assignmentCount: number | null;
  submittedCount: number | null;
  hasPro: boolean;
  className?: string;
  action?: ReactNode;
}

/**
 * Compact HQ strip: class has students and at least one assignment.
 * Counts may be 0. Free teachers get one Teacher Pro link to the live upgrade route.
 */
export function ClassProgressStrip({
  classroomId,
  studentCount,
  assignmentCount,
  submittedCount,
  hasPro,
  className,
  action,
}: ClassProgressStripProps) {
  const { t, language } = useLanguage();
  const show = shouldShowClassProgressStrip({ studentCount, assignmentCount });
  const submitted = submittedCount ?? 0;
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!show) {
      shownFor.current = null;
      return;
    }
    if (shownFor.current === classroomId) return;
    shownFor.current = classroomId;
    trackTeacherHqProgressViewed({
      classroomId,
      studentCount,
      assignmentCount: assignmentCount ?? 0,
      submittedCount: submitted,
      hasPro,
    });
  }, [show, classroomId, studentCount, assignmentCount, submitted, hasPro]);

  if (!show) return null;

  const upgradeHref = `/${language}/teacher/upgrade`;

  return (
    <section
      data-testid="hq-class-progress"
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-2 rounded-neo border-2 border-neo-cyan/60 bg-neo-navy-light/95 px-2 py-1.5 shadow-hard-sm sm:gap-3 sm:px-3',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cyan text-black shadow-hard-sm',
          action && 'max-sm:hidden',
        )}
      >
        <TrendingUp className="size-4" strokeWidth={3} aria-hidden="true" />
      </span>
      <h2 className="sr-only">{t('academy.hq.progressTitle', 'Class progress')}</h2>
      <ul
        className={cn(
          'flex min-w-0 flex-1 items-center gap-y-0.5 font-neo-display font-black uppercase text-neo-white sm:text-sm',
          action ? 'gap-x-1.5 whitespace-nowrap text-[0.65rem] tracking-normal max-sm:flex-nowrap max-sm:overflow-hidden sm:flex-wrap sm:gap-x-3' : 'flex-wrap gap-x-3 text-xs tracking-wide',
        )}
      >
        <li data-testid="hq-class-progress-students">
          <span className="text-neo-cyan">{studentCount}</span>{' '}
          {t('academy.hq.progressStudents', 'students')}
        </li>
        <li data-testid="hq-class-progress-assignments">
          <span className="text-neo-lime">{assignmentCount}</span>{' '}
          {t('academy.hq.progressAssignments', 'assignments')}
        </li>
        <li data-testid="hq-class-progress-submitted">
          <span className="text-neo-white">{submitted}</span>{' '}
          {t('academy.hq.progressSubmitted', 'submitted')}
        </li>
      </ul>
      {action}
      {hasPro ? null : (
        <Link
          href={upgradeHref}
          data-testid="hq-class-progress-upgrade"
          onClick={() => trackTeacherHqUpgradeClicked({ classroomId })}
          className={cn(
            'inline-flex min-h-9 shrink-0 items-center justify-center rounded-neo border-2 border-black',
            'bg-neo-lime px-2.5 font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-black shadow-hard-sm sm:px-3 sm:text-xs',
            'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5',
            'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
          )}
        >
          {t('academy.hq.progressUpgrade', 'Teacher Pro')}
        </Link>
      )}
    </section>
  );
}

export default ClassProgressStrip;
