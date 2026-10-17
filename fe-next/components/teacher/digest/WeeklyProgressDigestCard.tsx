/**
 * Weekly progress digest card on Teacher HQ.
 *
 * Per-class this-week numbers (assignments, average score, movers, inactive 7d)
 * plus a Polar Teacher Pro CTA when the teacher is trialing or over free caps.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useWeeklyProgressDigest } from '@/hooks/useWeeklyProgressDigest';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import {
  formatWowDelta,
  isPolarTrialDay7,
  shouldShowDigestUpgradeCta,
} from '@/lib/education/weeklyProgressDigest';
import { isPolarTrialExpiryConversion } from '@/lib/education/polarTrialExpiryJourney';
import {
  trackTeacherDigestUpgradeCtaClicked,
  trackTeacherDigestViewed,
} from '@/lib/education/telemetry';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { FREE_TIER_LIMITS, TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { Stat } from '@/components/ui/Stat';
import { NeoPanel } from '@/components/ui/panel';

export interface WeeklyProgressDigestCardProps {
  classroomId: string;
  classroomName: string;
  /** Snapshot expected completions (assignments × roster). Null = unknown. */
  assignmentExpected?: number | null;
  /** All-time submitted count used only when we lack dated completions. */
  assignmentSubmitted?: number | null;
  /** Free-tier class/student cap already binding. Assignment cap is read from the window source. */
  overFreeTierCaps?: boolean;
}

export function WeeklyProgressDigestCard({
  classroomId,
  classroomName,
  assignmentExpected,
  assignmentSubmitted,
  overFreeTierCaps = false,
}: WeeklyProgressDigestCardProps) {
  const { t, language } = useLanguage();
  const { hasPro, loading: proLoading, trialExpires, trialUsed, status } = useTeacherPro();
  const expected = assignmentExpected ?? 0;
  const { metrics, isLoading, error, refresh, assignmentCount } = useWeeklyProgressDigest(classroomId);

  const [now] = useState(() => Date.now());
  const daysLeft = polarTrialDaysLeft(trialExpires, now);
  const trialDay7 = isPolarTrialDay7(daysLeft);
  const trialExpired = isPolarTrialExpiryConversion(hasPro, trialUsed === true);
  const isTrialing = daysLeft !== null || status === 'trialing';
  const isPaidPro = hasPro && !isTrialing;
  const overCap =
    overFreeTierCaps || assignmentCount >= FREE_TIER_LIMITS.assignmentsPerClass;
  const showCta = shouldShowDigestUpgradeCta({
    isPaidPro,
    isTrialing,
    trialExpired,
    overFreeTierCaps: overCap,
  });
  const week = metrics?.thisWeek;
  const wow = metrics?.wow;
  const students = metrics?.students ?? [];
  const inactive = students.filter((s) => s.inactive7d);
  const movers = students.filter((s) => !s.inactive7d).slice(0, 8);

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

  const ctaKind = trialExpired ? 'expiry' : overCap && !isTrialing ? 'overcap' : trialDay7 ? 'day7' : 'trial';
  const ctaHintKey =
    ctaKind === 'expiry'
      ? 'teacher.digest.weeklyExpiryHint'
      : ctaKind === 'overcap'
        ? 'teacher.digest.weeklyOverCapHint'
        : ctaKind === 'day7'
          ? 'teacher.digest.weeklyDay7Hint'
          : 'teacher.digest.weeklyTrialHint';
  const ctaLabelKey =
    ctaKind === 'expiry'
      ? 'teacher.digest.weeklyExpiryCta'
      : ctaKind === 'overcap'
        ? 'teacher.digest.weeklyOverCapCta'
        : ctaKind === 'day7'
          ? 'teacher.digest.weeklyDay7Cta'
          : 'teacher.digest.weeklyTrialCta';

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
              value={week.assignmentCompleted}
              label={t('teacher.digest.weeklyAssignmentsCompleted')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={metrics?.averageScorePct != null ? `${metrics.averageScorePct}%` : '—'}
              label={t('teacher.digest.weeklyAverageScore')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={metrics?.inactiveCount ?? inactive.length}
              label={t('teacher.digest.weeklyInactive')}
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
            {t('teacher.digest.weeklyWow')} {formatWowDelta(wow.studentsActive)} / {formatWowDelta(wow.gamesCompleted)}
          </p>
          <div data-testid="weekly-progress-digest-movement" className="space-y-1">
            <p className="text-sm font-bold text-neo-white">{t('teacher.digest.weeklyMovement')}</p>
            <ul className="space-y-1 text-sm font-semibold text-neo-cream/85">
              {movers.map((s) => (
                <li key={s.studentId}>
                  {s.name}
                  {s.accuracyDelta == null ? '' : ` (${formatWowDelta(s.accuracyDelta)})`}
                </li>
              ))}
            </ul>
          </div>
          <p data-testid="weekly-progress-digest-inactive" className="text-sm font-semibold text-neo-cream/80">
            {t('teacher.digest.weeklyInactiveCount', { count: inactive.length })}
            {inactive.length > 0 ? `: ${inactive.map((s) => s.name).join(', ')}` : ''}
          </p>
        </>
      )}

      {!proLoading && showCta && (
        <div
          data-testid={`weekly-progress-digest-${ctaKind}-cta`}
          className="rounded-neo border-neo border-neo-lime bg-neo-navy-light p-5 text-center shadow-hard"
        >
          <p className="mb-3 text-sm font-bold text-neo-white/85">{t(ctaHintKey)}</p>
          <Link
            href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
            data-testid="weekly-progress-digest-pro-link"
            onClick={() =>
              trackTeacherDigestUpgradeCtaClicked({
                hasPro,
                trialDay7,
                trialExpired,
                overCap,
              })
            }
            className="inline-flex min-h-11 items-center rounded-neo border-neo bg-neo-cyan px-6 py-3 font-black text-neo-navy shadow-hard transition-shadow hover:shadow-hard-lg"
          >
            {t(ctaLabelKey, { price: `$${TEACHER_PRO_PRICE_USD}` })}
          </Link>
        </div>
      )}
    </section>
  );
}

export default WeeklyProgressDigestCard;
