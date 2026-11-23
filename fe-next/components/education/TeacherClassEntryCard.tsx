'use client';

import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { CopyCode } from '@/components/home-preview/ClassroomStrip';
import type { TrialStatus } from '@/lib/education/trial';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { TrialPill } from './HomeEducationCard';

interface TeacherClassEntryCardProps {
  trial: TrialStatus | null;
  /** Preview only: show this class instead of reading the teacher's list. */
  previewClass?: { id: string; name: string; join_code: string };
}

/**
 * A teacher's way into their class at the TOP of home: one compact row. The whole bar opens the
 * classroom; with a class it also shows the class, its join code and a Start button.
 */
export function TeacherClassEntryCard({ trial, previewClass }: TeacherClassEntryCardProps) {
  const { t, language } = useLanguage();
  const { classrooms } = useClassrooms();
  // Ordered newest-created first.
  const newest = previewClass ?? (classrooms[0] as { id: string; name: string; join_code: string } | undefined);

  return (
    <div
      data-testid="home-teacher-class-card"
      className={cn(
        'group relative flex w-full flex-wrap items-center gap-x-3 gap-y-2.5 rounded-neo border-[3px] border-neo-black bg-neo-cyan px-3 py-2.5 text-neo-black shadow-hard',
        'motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 active:translate-y-px'
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-10 w-10 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream bg-neo-navy text-neo-cyan motion-safe:transition-transform motion-safe:group-hover:-rotate-6', newest ? 'hidden sm:flex' : 'flex')}
      >
        <GraduationCap className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/${language}/teacher`}
            data-testid="home-teacher-class-entry"
            onClick={() => trackLandingCtaClick('education_strip', { role: 'teacher', target: 'teacher', placement: 'top' })}
            className={cn(
              'block truncate font-neo-display font-black leading-tight',
              newest ? 'text-xs uppercase tracking-wide rtl:tracking-normal' : 'text-base sm:text-lg',
              'after:absolute after:inset-0 after:rounded-[inherit] after:content-[""]',
              'focus:outline-hidden focus-visible:after:ring-4 focus-visible:after:ring-neo-black focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-neo-navy'
            )}
          >
            {t('education.nav.myClassroom')}
          </Link>
          {newest ? <span className="relative z-10 shrink-0"><CopyCode code={newest.join_code} t={t} compact /></span> : null}
        </div>
        {newest ? (
          <p data-testid="home-teacher-class-name" className="mt-0.5 truncate font-neo-display text-lg font-black leading-tight">{newest.name}</p>
        ) : null}
      </div>
      {trial ? <TrialPill trial={trial} t={t} language={language} showOnPhones /> : null}
      {newest ? (
        <span
          aria-hidden="true"
          data-testid="home-teacher-class-open"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-neo border-2 border-neo-cream bg-neo-navy px-3 py-2 font-neo-display text-sm font-black text-neo-lime shadow-hard-sm sm:w-auto sm:shrink-0"
        >
          {t('homeFresh.sections.classrooms.openClassroom')}
          <DirectionalIcon icon={ArrowRight} className="h-4 w-4" />
        </span>
      ) : (
        <DirectionalIcon icon={ArrowRight} className="h-5 w-5 shrink-0" />
      )}
    </div>
  );
}

export default TeacherClassEntryCard;
