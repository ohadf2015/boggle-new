'use client';

import { useEffect, useRef } from 'react';
import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { shouldShowFirstAssignmentCta } from '@/lib/education/firstAssignmentCta';
import {
  trackEduFirstAssignmentCtaClicked,
  trackEduFirstAssignmentCtaShown,
} from '@/lib/education/telemetry';

export interface FirstAssignmentPanelProps {
  classroomId: string;
  studentCount: number;
  assignmentCount: number | null;
  hasActiveRoom?: boolean;
  onCta: () => void;
  className?: string;
}

/**
 * Persistent HQ panel: students are in, nothing has been assigned, no live
 * room. One CTA opens the existing AssignmentCreator — not a new system.
 */
export function FirstAssignmentPanel({
  classroomId,
  studentCount,
  assignmentCount,
  hasActiveRoom = false,
  onCta,
  className,
}: FirstAssignmentPanelProps) {
  const { t } = useLanguage();
  const show = shouldShowFirstAssignmentCta({
    studentCount,
    assignmentCount,
    hasActiveRoom,
  });
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!show) {
      shownFor.current = null;
      return;
    }
    if (shownFor.current === classroomId) return;
    shownFor.current = classroomId;
    trackEduFirstAssignmentCtaShown({ classroomId });
  }, [show, classroomId]);

  if (!show) return null;

  const onClick = () => {
    trackEduFirstAssignmentCtaClicked({ classroomId });
    onCta();
  };

  return (
    <section
      data-testid="hq-first-assignment"
      className={cn(
        '@container flex shrink-0 items-center gap-2 rounded-neo-lg border-2 border-neo-lime/70 bg-neo-navy-light/95 p-2 shadow-hard sm:flex-col sm:items-stretch sm:p-4 [@media(orientation:landscape)_and_(max-height:500px)]:flex-row [@media(orientation:landscape)_and_(max-height:500px)]:items-center [@media(orientation:landscape)_and_(max-height:500px)]:p-1.5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:items-start">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-lime text-black shadow-hard-sm sm:size-9">
          <ClipboardList className="size-5" strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-neo-display text-xs font-black uppercase leading-tight text-neo-white sm:text-base">
            {t('academy.hq.firstAssignmentTitle', 'Assign their first game')}
          </h2>
          <p className="mt-1 hidden font-neo-body text-sm font-bold text-neo-white/70 text-pretty sm:block [@media(orientation:landscape)_and_(max-height:500px)]:hidden">
            {t(
              'academy.hq.firstAssignmentBody',
              'Students are in. Send one assignment so they play before the next class.',
            )}
          </p>
        </div>
      </div>
      <button
        type="button"
        data-testid="hq-first-assignment-cta"
        onClick={onClick}
        className={cn(
          'inline-flex min-h-10 shrink-0 items-center justify-center rounded-neo border-3 border-black sm:min-h-11 sm:w-full [@media(orientation:landscape)_and_(max-height:500px)]:w-auto [@media(orientation:landscape)_and_(max-height:500px)]:min-h-9',
          'bg-neo-lime px-3 font-neo-display text-xs font-black uppercase tracking-wide text-black shadow-hard-sm sm:px-4 sm:text-sm',
          'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
          'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        {t('academy.hq.firstAssignmentCta', 'Create assignment')}
      </button>
    </section>
  );
}

export default FirstAssignmentPanel;
