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
        '@container flex shrink-0 flex-col gap-2 rounded-neo-lg border-2 border-neo-lime/70 bg-neo-navy-light/95 p-3 shadow-hard sm:p-4',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-lime text-black shadow-hard-sm">
          <ClipboardList className="size-5" strokeWidth={3} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-neo-display text-base font-black uppercase leading-tight text-neo-white">
            {t('academy.hq.firstAssignmentTitle', 'Assign their first game')}
          </h2>
          <p className="mt-1 font-neo-body text-sm font-bold text-neo-white/70 text-pretty">
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
          'inline-flex min-h-11 w-full items-center justify-center rounded-neo border-3 border-black',
          'bg-neo-lime px-4 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard-sm',
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
