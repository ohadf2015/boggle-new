'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeCapture } from '@/lib/education/telemetryCore';
import { cn } from '@/lib/utils';
import { useDeadEndPractice } from './useDeadEndPractice';
import type { DeadEndState } from './deadEndPractice';

const LOOK = {
  primary:
    'flex min-h-14 w-full items-center justify-center gap-3 rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-2 text-neo-navy shadow-hard transition-transform active:translate-x-[2px] active:translate-y-[2px] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-lime',
  quiet:
    'inline-flex min-h-11 items-center gap-2 self-start rounded-neo border-2 border-neo-lime/70 bg-neo-navy px-3 py-1.5 text-neo-lime focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-lime',
} as const;

interface DeadEndPracticeLinkProps {
  state: DeadEndState;
  classroomId?: string | null;
  variant?: keyof typeof LOOK;
  className?: string;
  onClick?: () => void;
}

export function DeadEndPracticeLink({ state, classroomId, variant = 'primary', className, onClick }: DeadEndPracticeLinkProps) {
  const { t } = useLanguage();
  const { href, target, lessonName } = useDeadEndPractice(classroomId);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    safeCapture('edu_dead_end_shown', { state });
  }, [state]);

  const primary = variant === 'primary';
  const body = (
    <>
      <Play aria-hidden="true" className={cn('shrink-0', primary ? 'size-6' : 'size-4')} strokeWidth={3} />
      <span className="flex min-w-0 flex-col text-start leading-tight">
        <span className={cn('font-neo-display font-black uppercase', primary ? 'text-xl' : 'text-sm')}>{t('education.student.deadEnd.practiceCta')}</span>
        {href && (
          <span dir="auto" className={cn('line-clamp-2 font-neo-body font-bold', primary ? 'text-sm opacity-80' : 'text-xs opacity-90')}>
            {lessonName ?? t('education.student.deadEnd.starterWords')}
          </span>
        )}
      </span>
    </>
  );

  if (!href) {
    return (
      <span data-testid="dead-end-practice" role="status" aria-busy="true" className={cn(LOOK[variant], 'opacity-70', className)}>
        {body}
      </span>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      data-testid="dead-end-practice"
      data-target={target}
      onClick={() => {
        safeCapture('edu_dead_end_recovered', { state, target });
        onClick?.();
      }}
      className={cn(LOOK[variant], className)}
    >
      {body}
    </Link>
  );
}

export default DeadEndPracticeLink;
