'use client';

import Link from 'next/link';
import { GraduationCap, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { TrialStatus } from '@/lib/education/trial';

export type EducationHomeRole = 'teacher' | 'student' | 'promo';

interface HomeEducationCardProps {
  /** Which dashboard this user belongs to. */
  role: EducationHomeRole;
  /** Teacher trial countdown, or null for unbounded/ no trial. Ignored for students. */
  trial?: TrialStatus | null;
  /** Student's classroom name — used as the subtitle when present. Ignored for teachers. */
  classroomName?: string | null;
}

/**
 * Homepage entry point for education — a teacher (with a live trial countdown), a student
 * who's been added to a classroom, or the one-shot `promo` pitch for everyone else. Purely
 * presentational: the connected wrapper decides whether to render it at all and feeds the
 * role/trial/classroom. Keeps education one tap from the main home surface so approved
 * teachers and enrolled students don't have to remember the /teacher or /student URLs —
 * and so everyone else learns the classroom mode exists at least once.
 */
export function HomeEducationCard({ role, trial, classroomName }: HomeEducationCardProps) {
  const { t, language } = useLanguage();
  const isTeacher = role === 'teacher';
  const isPromo = role === 'promo';

  // The promo lands on the public /education page, not a dashboard the viewer can't open.
  const target = `/${language}/${isPromo ? 'education' : isTeacher ? 'teacher' : 'student'}`;
  const Icon = isPromo ? Sparkles : isTeacher ? GraduationCap : BookOpen;

  // Keys stay literal rather than built from `role` — the education i18n guardrail
  // (app/[locale]/education/__tests__/educationTranslationKeys.test.ts) can only see
  // statically-written keys, and a template literal would silently opt out of it.
  const title = isPromo
    ? t('education.home.promo_title')
    : isTeacher
      ? t('education.home.teacher_title')
      : t('education.home.student_title');
  const subtitle = isPromo
    ? t('education.home.promo_subtitle')
    : isTeacher
      ? t('education.home.teacher_subtitle')
      : classroomName || t('education.home.student_subtitle');
  const cta = isPromo
    ? t('education.home.promo_cta')
    : isTeacher
      ? t('education.home.teacher_cta')
      : t('education.home.student_cta');
  const badge = isPromo
    ? t('education.home.badge_promo')
    : isTeacher
      ? t('education.home.badge_teacher')
      : t('education.home.badge_student');

  // Icon tile + accent per role. Teacher = cyan, student = lime, promo = purple — matches
  // the education header/menu color language.
  const accent = isPromo ? 'bg-neo-purple' : isTeacher ? 'bg-neo-cyan' : 'bg-neo-lime';

  return (
    <Link
      href={target}
      data-testid="home-education-card"
      className={cn(
        'group flex w-full items-center gap-3 sm:gap-4',
        'rounded-neo border-neo bg-neo-white dark:bg-neo-navy-light',
        'p-3 sm:p-4 shadow-hard',
        'transition-all duration-100',
        'hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg',
        'active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-sm',
        'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2'
      )}
    >
      {/* Role icon tile */}
      <span
        className={cn(
          'flex shrink-0 items-center justify-center',
          'h-11 w-11 sm:h-14 sm:w-14',
          'rounded-neo border-neo text-neo-black shadow-hard-sm',
          accent
        )}
        aria-hidden="true"
      >
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>

      {/* Copy */}
      <div className="min-w-0 flex-1">
        <span className="inline-block rounded-full border-2 border-neo-black bg-neo-cream px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-neo-black dark:bg-neo-navy dark:text-neo-white">
          {badge}
        </span>
        <h3
          data-testid="home-education-title"
          className="mt-1 truncate text-base font-black leading-tight text-neo-black dark:text-neo-white sm:text-lg font-neo-display"
        >
          {title}
        </h3>
        <p
          data-testid="home-education-subtitle"
          className="truncate text-xs font-semibold text-neo-black/70 dark:text-neo-white/70 sm:text-sm"
        >
          {subtitle}
        </p>
      </div>

      {/* Teacher trial pill */}
      {isTeacher && trial && <TrialPill trial={trial} t={t} />}

      {/* CTA affordance */}
      <span
        className={cn(
          'ml-auto hidden shrink-0 items-center gap-1.5 sm:flex',
          'rounded-neo border-neo bg-neo-navy px-3 py-2 text-sm font-bold text-neo-white shadow-hard-sm',
          'transition-transform group-hover:translate-x-0.5'
        )}
      >
        {cta}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </span>
      {/* Mobile: chevron only (label lives above) */}
      <ArrowRight
        className="ml-auto h-5 w-5 shrink-0 text-neo-black/60 dark:text-neo-white/60 sm:hidden rtl:rotate-180"
        aria-hidden="true"
      />
    </Link>
  );
}

interface TrialPillProps {
  trial: TrialStatus;
  t: (key: string) => string;
}

/**
 * Compact trial countdown badge. Reuses the shared unit strings from
 * education.trial.* so we don't re-translate "days left"/"hours left". Switches
 * to an urgent tone in the last stretch; shows a soft "ended" chip once expired
 * (access is not revoked — the card still links into the dashboard).
 */
function TrialPill({ trial, t }: TrialPillProps) {
  if (trial.isExpired) {
    return (
      <span
        data-testid="home-education-trial"
        className="hidden shrink-0 rounded-neo border-neo bg-neo-pink px-2.5 py-1.5 text-center text-[11px] font-black uppercase tracking-wide text-neo-white shadow-hard-sm sm:block"
      >
        {t('education.home.trial_ended')}
      </span>
    );
  }

  // Final day → count in hours so the number keeps moving; otherwise whole days.
  const finalDay = trial.daysLeft <= 1;
  const count = finalDay ? trial.hoursLeft : trial.daysLeft;
  const unitKey = finalDay
    ? 'education.trial.hours_left'
    : trial.daysLeft === 1
      ? 'education.trial.day_left'
      : 'education.trial.days_left';
  const tone = trial.isUrgent ? 'bg-neo-pink text-neo-white' : 'bg-neo-lime text-neo-navy';

  return (
    <span
      data-testid="home-education-trial"
      className={cn(
        'hidden shrink-0 flex-col items-center rounded-neo border-neo px-2.5 py-1.5 text-center shadow-hard-sm sm:flex',
        tone
      )}
    >
      <span data-testid="home-education-trial-count" className="text-xl font-black leading-none font-neo-display">
        {count}
      </span>
      <span data-testid="home-education-trial-unit" className="mt-0.5 text-[9px] font-bold uppercase tracking-wide">
        {t(unitKey)}
      </span>
    </span>
  );
}
