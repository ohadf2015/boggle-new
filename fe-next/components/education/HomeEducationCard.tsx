'use client';

import Link from 'next/link';
import { GraduationCap, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { trialCountdownUnit, type TrialStatus } from '@/lib/education/trial';
import { trackLandingCtaClick } from '@/utils/growthTracking';

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
 * who's been added to a classroom, or the always-on `promo` pitch for everyone else. Purely
 * presentational: the connected wrapper decides whether to render it at all and feeds the
 * role/trial/classroom. Keeps education one tap from the main home surface so approved
 * teachers and enrolled students don't have to remember the /teacher or /student URLs —
 * and so everyone else can find classroom mode on every homepage visit.
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
    ? t('education.home.promo_line')
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
  // the education header/menu color language. Literal class strings (Tailwind v4).
  const accent = isPromo ? 'bg-neo-purple' : isTeacher ? 'bg-neo-cyan' : 'bg-neo-lime';
  const shadow = isPromo ? 'shadow-hard-purple' : isTeacher ? 'shadow-hard-cyan' : 'shadow-hard-lime';
  const border = isPromo ? 'border-neo-purple' : isTeacher ? 'border-neo-cyan' : 'border-neo-lime';
  const ring = isPromo
    ? 'focus-visible:after:ring-neo-purple'
    : isTeacher
      ? 'focus-visible:after:ring-neo-cyan'
      : 'focus-visible:after:ring-neo-lime';

  // One slim strip: the main link stretches over the whole card (::after), so the
  // strip is a single tap target on phones; from sm up the promo adds a second,
  // stacked-above link for students who arrive with a class code.
  return (
    <div
      data-testid="home-education-strip"
      data-edu-role={role}
      className={cn(
        'group relative flex w-full items-center gap-3 sm:gap-4',
        'overflow-hidden rounded-neo border-[3px] bg-neo-navy-light',
        border,
        'px-3 py-2.5 sm:px-4 sm:py-3',
        shadow,
        'motion-safe:transition-transform motion-safe:duration-150',
        'motion-safe:hover:-translate-y-0.5 active:translate-y-px'
      )}
    >
      {/* Role icon tile */}
      <span
        className={cn(
          'flex shrink-0 items-center justify-center',
          'h-10 w-10 sm:h-12 sm:w-12',
          'rounded-neo border-2 border-neo-black text-neo-black shadow-hard-sm',
          'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:group-hover:-rotate-6 motion-safe:group-hover:scale-110',
          accent
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
      </span>

      {/* Copy — the title is the main link; its ::after covers the whole strip. */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden shrink-0 rounded-full border-2 border-neo-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-[10px] font-black uppercase leading-none tracking-wide text-neo-black sm:inline-block">
            {badge}
          </span>
          <Link
            href={target}
            data-testid="home-education-card"
            onClick={() => trackLandingCtaClick('education_strip', { role, target: isPromo ? 'education' : role })}
            className={cn(
              'min-w-0 truncate font-neo-display text-[0.95rem] font-black leading-tight text-neo-white sm:text-base',
              'after:absolute after:inset-0 after:rounded-[inherit] after:content-[""]',
              'focus:outline-hidden focus-visible:after:ring-4 focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-neo-navy',
              ring
            )}
          >
            <span data-testid="home-education-title">{title}</span>
          </Link>
        </div>
        <p
          data-testid="home-education-subtitle"
          className="mt-0.5 line-clamp-2 font-neo-body text-xs leading-snug text-neo-cream/80 sm:truncate sm:text-sm"
        >
          {subtitle}
        </p>
      </div>

      {/* Teacher trial pill */}
      {isTeacher && trial && <TrialPill trial={trial} t={t} language={language} />}

      {/* Students with a class code skip the teacher pitch (sm and up; on phones
          the whole strip is one tap target and /education carries the join link). */}
      {isPromo && (
        <Link
          href={`/${language}/join`}
          data-testid="home-education-join"
          onClick={() => trackLandingCtaClick('education_strip', { role, target: 'join' })}
          className={cn(
            'relative z-10 hidden shrink-0 items-center rounded-neo border-2 border-neo-cream/50 px-3 py-2',
            'font-neo-display text-sm font-bold text-neo-cream sm:inline-flex',
            'hover:border-neo-lime hover:text-neo-lime',
            'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
          )}
        >
          {t('education.home.join_cta')}
        </Link>
      )}

      {/* CTA affordance (decorative: the stretched title link is the target) */}
      <span
        aria-hidden="true"
        className={cn(
          'hidden shrink-0 items-center gap-1.5 sm:flex',
          'rounded-neo border-2 border-neo-black px-3 py-2 font-neo-display text-sm font-black text-neo-black shadow-hard-sm',
          accent,
          'motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 rtl:motion-safe:group-hover:-translate-x-0.5'
        )}
      >
        {cta}
        <DirectionalIcon icon={ArrowRight} className="h-4 w-4" />
      </span>
      {/* Mobile: chevron only */}
      <DirectionalIcon
        icon={ArrowRight}
        className="h-5 w-5 shrink-0 text-neo-cream/70 sm:hidden"
      />
    </div>
  );
}

interface TrialPillProps {
  trial: TrialStatus;
  t: (key: string) => string;
  language: string;
}

/**
 * Compact trial countdown badge. Reuses the shared unit strings from
 * education.trial.* so we don't re-translate "days left"/"hours left". Switches
 * to an urgent tone in the last stretch; shows a soft "ended" chip once expired
 * (access is not revoked — the card still links into the dashboard).
 */
function TrialPill({ trial, t, language }: TrialPillProps) {
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
  // Shared with TrialUrgencyBanner so the two badges agree, and so the singular
  // hour gets its own unit string (the badge stacks bare number over bare unit,
  // so the unit has to carry its own grammatical number).
  const { key: unitKey, count } = trialCountdownUnit(trial, language);
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
