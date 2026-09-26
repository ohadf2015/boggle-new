'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import {
  TEACHER_PRO_CHECKOUT_PATH,
} from '@/components/education/TeacherProCheckoutCta';

/**
 * Live Polar Teacher Pro trial — days remaining + paid checkout CTA.
 *
 * Distinct from the access-trial `TrialUrgencyBanner` and from the expired
 * `TeacherProTrialEndedBanner`. A live Polar trial is already Pro, so the
 * header chip used to be the only UI; conversion needs an upgrade path
 * before the clock hits zero. Destination is the existing Polar front door
 * (`/{locale}/teacher/upgrade`), not a second checkout POST.
 */
export function TeacherProTrialLifecycleBanner({
  trialExpires,
}: {
  trialExpires: string | null;
}) {
  const { t, language } = useLanguage();
  const [nowMs] = useState(() => Date.now());
  const daysLeft = polarTrialDaysLeft(trialExpires, nowMs);
  const urgent = daysLeft !== null && daysLeft <= 3;
  const title =
    daysLeft === null
      ? t('teacher.plan.trialActive')
      : daysLeft <= 0
        ? t('teacher.subscription.trialLifecycleTitleToday')
        : daysLeft === 1
          ? t('teacher.subscription.trialLifecycleTitleOne')
          : t('teacher.subscription.trialLifecycleTitle', { count: String(daysLeft) });

  return (
    <aside
      data-testid="teacher-pro-trial-lifecycle"
      data-days={daysLeft === null ? '' : String(daysLeft)}
      className={`border-b-3 border-black px-4 py-3 ${urgent ? 'bg-neo-pink' : 'bg-neo-lime'}`}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {title}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {t('teacher.subscription.trialLifecycleBody')}
          </p>
        </div>
        <Link
          href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
          data-testid="teacher-pro-trial-lifecycle-cta"
          className="inline-flex shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-black px-4 py-2 font-neo-display text-sm font-black text-white shadow-hard hover:-translate-y-0.5"
        >
          {t('teacher.subscription.trialLifecycleCta')}
        </Link>
      </div>
    </aside>
  );
}
