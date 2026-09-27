'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Polar Teacher Pro trial has ended. One pay CTA — not another free trial,
 * and not the access-trial `TrialUrgencyBanner`. The banner picker mounts
 * this alone so it does not stack on the milestone Pro ask.
 */
export function TeacherProTrialEndedBanner() {
  const { t, language } = useLanguage();

  return (
    <aside
      data-testid="teacher-pro-trial-ended"
      className="border-b-3 border-black bg-neo-pink px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {t('teacher.subscription.trialEndedTitle')}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {t('teacher.subscription.trialEndedBody')}
          </p>
        </div>
        <Link
          href={`/${language}/teacher/upgrade`}
          data-testid="teacher-pro-trial-ended-cta"
          className="inline-flex shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-black px-4 py-2 font-neo-display text-sm font-black text-white shadow-hard hover:-translate-y-0.5"
        >
          {t('teacher.subscription.trialEndedCta')}
        </Link>
      </div>
    </aside>
  );
}
