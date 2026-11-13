'use client';

import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { TrialStatus } from '@/lib/education/trial';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { TrialPill } from './HomeEducationCard';

interface TeacherClassEntryCardProps {
  trial: TrialStatus | null;
}

/**
 * A teacher's way into their class, at the TOP of the returning home (right under
 * the greeting). The slim education strip sat after every game mode, so on a phone
 * a teacher scrolled the whole page to find it. Solid cyan, one big tap target,
 * the open button visible at every width.
 */
export function TeacherClassEntryCard({ trial }: TeacherClassEntryCardProps) {
  const { t, language } = useLanguage();

  return (
    <div
      data-testid="home-teacher-class-card"
      className={cn(
        'group relative w-full rounded-neo border-[3px] border-neo-black bg-neo-cyan p-3 sm:p-4',
        'shadow-hard text-neo-black',
        'motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 active:translate-y-px'
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream bg-neo-navy text-neo-cyan shadow-hard-sm motion-safe:transition-transform motion-safe:group-hover:-rotate-6 sm:h-14 sm:w-14"
        >
          <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/${language}/teacher`}
            data-testid="home-teacher-class-entry"
            onClick={() => trackLandingCtaClick('education_strip', { role: 'teacher', target: 'teacher', placement: 'top' })}
            className={cn(
              'block truncate font-neo-display text-lg font-black leading-tight sm:text-xl',
              'after:absolute after:inset-0 after:rounded-[inherit] after:content-[""]',
              'focus:outline-hidden focus-visible:after:ring-4 focus-visible:after:ring-neo-black focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-neo-navy'
            )}
          >
            {t('education.nav.myClassroom')}
          </Link>
          <p className="mt-0.5 line-clamp-2 font-neo-body text-xs font-semibold leading-snug text-neo-black/75 sm:text-sm">
            {t('education.home.teacher_subtitle')}
          </p>
        </div>
        {trial ? <TrialPill trial={trial} t={t} language={language} showOnPhones /> : null}
      </div>

      {/* Decorative: the stretched title link is the target. Visible on phones too. */}
      <span
        aria-hidden="true"
        data-testid="home-teacher-class-entry-cta"
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy px-4 py-2.5',
          'font-neo-display text-base font-black text-neo-cream shadow-hard-sm',
          'motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 rtl:motion-safe:group-hover:-translate-x-0.5',
          'sm:ms-auto sm:w-fit'
        )}
      >
        {t('education.home.teacher_cta')}
        <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
      </span>
    </div>
  );
}

export default TeacherClassEntryCard;
