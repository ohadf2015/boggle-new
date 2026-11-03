'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import type { TrialStatus } from '@/lib/education/trial';

const PRIMARY =
  'group flex min-h-14 w-full items-center justify-center gap-3 rounded-neo border-neo-thick border-neo-black bg-neo-navy px-5 py-3 ' +
  'font-neo-display text-lg font-black text-neo-white text-balance shadow-hard-lg transition-[box-shadow,transform] duration-100 ' +
  'hover:-translate-y-0.5 hover:shadow-hard-xl active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan';
const SECONDARY =
  'flex min-h-11 w-full items-center justify-center rounded-neo border-neo border-neo-navy/40 px-4 py-2 font-neo-display text-base font-bold ' +
  'text-neo-navy transition-colors hover:bg-neo-navy/10 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan';

function TrialNote({ trial }: { trial: TrialStatus }) {
  const { t, language } = useLanguage();
  if (trial.isExpired) {
    return <p data-testid="access-trial-note" className="mt-5 text-center text-sm font-semibold text-neo-navy/80">{t('education.trial.expired_kept')}</p>;
  }
  const expires = new Date(trial.expiresAt);
  if (Number.isNaN(expires.getTime())) return null;
  const date = expires.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <p data-testid="access-trial-note" className="mt-5 text-center text-sm font-semibold text-neo-navy/80">
      {t('education.trial.body', { date, days: trial.daysLeft })}
    </p>
  );
}

/** An approved teacher's next step: her first class while she has none, her dashboard after. */
export function AccessApprovedCard({ trial, showTrial }: { trial: TrialStatus | null; showTrial: boolean }) {
  const { t, language } = useLanguage();
  const { classrooms, isLoading, error } = useClassrooms();
  const firstClass = !isLoading && !error && classrooms.length === 0;
  const dashboard = `/${language}/teacher`;

  return (
    <div className="relative rounded-neo-xl border-neo-thick border-neo-black bg-neo-lime p-6 pt-14 text-neo-navy shadow-hard-xl sm:p-8 sm:pt-16">
      <span className="absolute -top-12 start-1/2 flex size-24 shrink-0 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-neo-thick border-neo-black bg-neo-cyan shadow-hard rtl:translate-x-1/2 [contain:layout]">
        <Image src="/mascot/teacher/teacher-hero.webp" alt="" aria-hidden="true" width={96} height={96} priority className="size-full object-contain" />
      </span>
      <h1 className="text-center font-neo-display text-[clamp(1.75rem,6vw,2.5rem)] font-black leading-tight tracking-[-0.02em] text-balance">
        {t('education.access.already_approved_title')}
      </h1>
      {isLoading ? (
        <div data-testid="approved-actions-loading" aria-hidden="true" className="mt-6 flex flex-col gap-3">
          <div className="min-h-14 animate-pulse rounded-neo bg-neo-navy/20" />
          <div className="min-h-11" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <Link href={firstClass ? `/${language}/teacher/classroom/new` : dashboard} className={PRIMARY}>
            {firstClass ? t('education.trial.cta') : t('education.access.go_to_teacher')}
            <DirectionalIcon icon={ArrowRight} className="size-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
          </Link>
          {firstClass && (
            <Link href={dashboard} className={SECONDARY}>
              {t('education.access.go_to_teacher')}
            </Link>
          )}
        </div>
      )}
      {showTrial && trial && <TrialNote trial={trial} />}
    </div>
  );
}
