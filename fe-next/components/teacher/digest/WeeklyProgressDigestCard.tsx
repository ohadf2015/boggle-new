/**
 * Weekly progress digest card on Teacher HQ.
 *
 * Last-lesson digest lives on /teacher/reports. This card is the mid-trial
 * engagement beat: students / games / words / assignments + wow, and on
 * Polar trial day 7 a Teacher Pro checkout CTA.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useWeeklyProgressDigest } from '@/hooks/useWeeklyProgressDigest';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import { formatWowDelta, isPolarTrialDay7 } from '@/lib/education/weeklyProgressDigest';
import { isPolarTrialExpiryConversion } from '@/lib/education/polarTrialExpiryJourney';
import { trackTeacherDigestViewed } from '@/lib/education/telemetry';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { Stat } from '@/components/ui/Stat';
import { NeoPanel } from '@/components/ui/panel';

export interface WeeklyProgressDigestCardProps {
  classroomId: string;
  classroomName: string;
  /** Snapshot expected completions (assignments × roster). Null = unknown. */
  assignmentExpected: number | null;
  /** All-time submitted count used only when we lack dated completions. */
  assignmentSubmitted: number | null;
}

export function WeeklyProgressDigestCard({
  classroomId,
  classroomName,
  assignmentExpected,
  assignmentSubmitted,
}: WeeklyProgressDigestCardProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading, trialExpires, trialUsed } = useTeacherPro();
  const expected = assignmentExpected ?? 0;
  const datedCompletions = useMemo(() => [] as string[], []);
  const { metrics, isLoading, error, refresh } = useWeeklyProgressDigest(
    classroomId,
    expected,
    datedCompletions,
  );

  // Capture once per mount — Date.now() in render trips react-hooks/purity.
  const [now] = useState(() => Date.now());
  const daysLeft = polarTrialDaysLeft(trialExpires, now);
  const trialDay7 = isPolarTrialDay7(daysLeft);
  const trialExpired = isPolarTrialExpiryConversion(hasPro, trialUsed === true);
  const week = metrics?.thisWeek;
  const wow = metrics?.wow;

  useEffect(() => {
    if (isLoading || proLoading || !week) return;
    trackTeacherDigestViewed({
      hasPro,
      trialDay7,
      trialExpired,
      studentsActive: week.studentsActive,
    });
  }, [isLoading, proLoading, hasPro, trialDay7, trialExpired, week]);

  const assignmentPct =
    week && week.assignmentExpected > 0
      ? week.assignmentCompletionPct
      : assignmentSubmitted != null && expected > 0
        ? Math.round((assignmentSubmitted / expected) * 100)
        : null;

  return (
    <section
      data-testid="weekly-progress-digest"
      aria-label={t('teacher.digest.weeklyRegionLabel', { classroom: classroomName })}
      className="space-y-3"
    >
      <header>
        <h2 className="font-neo-display text-lg font-bold text-neo-white">
          {t('teacher.digest.weeklyTitle')}
        </h2>
        <p className="mt-1 text-sm font-bold text-neo-cream/75">{t('teacher.digest.weeklySubtitle')}</p>
      </header>

      {isLoading ? (
        <div
          data-testid="weekly-progress-digest-loading"
          aria-busy="true"
          className="flex min-h-20 items-center justify-center gap-2 text-neo-cream/80"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>{t('teacher.digest.weeklyLoading')}</span>
        </div>
      ) : error || !week || !wow ? (
        <NeoPanel tone="navy" className="p-4 text-center" data-testid="weekly-progress-digest-error">
          <p className="font-bold text-neo-white">{t('teacher.digest.weeklyLoadError')}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-3 inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cyan px-4 font-neo-display text-sm font-black text-black shadow-hard"
          >
            {t('teacher.digest.retry')}
          </button>
        </NeoPanel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              value={week.studentsActive}
              label={`${t('teacher.digest.weeklyStudentsActive')} (${formatWowDelta(wow.studentsActive)})`}
              size="lg"
              className="w-full"
            />
            <Stat
              value={week.gamesCompleted}
              label={`${t('teacher.digest.weeklyGames')} (${formatWowDelta(wow.gamesCompleted)})`}
              size="lg"
              className="w-full"
            />
            <Stat
              value={week.wordsCompleted}
              label={`${t('teacher.digest.weeklyWords')} (${formatWowDelta(wow.wordsCompleted)})`}
              size="lg"
              className="w-full"
            />
            <Stat
              value={assignmentPct != null ? `${assignmentPct}%` : '—'}
              label={t('teacher.digest.weeklyAssignments')}
              size="lg"
              className="w-full"
            />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-neo-cream/60">
            {t('teacher.digest.weeklyWow')}
          </p>
        </>
      )}

      {!proLoading && (trialExpired || trialDay7) && (
        <div
          data-testid={trialExpired ? 'weekly-progress-digest-expiry-cta' : 'weekly-progress-digest-day7-cta'}
          className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-5 text-center shadow-hard"
        >
          <p className="mb-3 text-sm font-bold text-neo-white/85">
            {t(trialExpired ? 'teacher.digest.weeklyExpiryHint' : 'teacher.digest.weeklyDay7Hint')}
          </p>
          <Link
            href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
            data-testid="weekly-progress-digest-pro-link"
            className="inline-flex min-h-11 items-center rounded-neo border-neo bg-neo-cyan px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg"
          >
            {t(trialExpired ? 'teacher.digest.weeklyExpiryCta' : 'teacher.digest.weeklyDay7Cta', {
              price: `$${TEACHER_PRO_PRICE_USD}`,
            })}
          </Link>
        </div>
      )}
    </section>
  );
}

export default WeeklyProgressDigestCard;
