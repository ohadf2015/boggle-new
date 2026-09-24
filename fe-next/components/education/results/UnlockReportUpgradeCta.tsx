/**
 * Quiet Teacher Pro ask on a teacher surface only: the results card, or the
 * projector recap a classroom host is kept on (`projectorRecapShowsTeacherFollowUp`).
 * Never a student phone.
 *
 * A free teacher who just ran a live class generated the report they cannot
 * open. The dashboard milestone strip (PR #1079) only fires on the next
 * /teacher visit; this is the same Polar checkout, at the moment of use.
 * Rematch stays the one loud button. Do not POST /api/subscription/checkout
 * from here — /teacher/upgrade owns that POST.
 *
 * Mount only behind a teacher gate (the card's `isTeacher`, or the projector
 * predicate). Thirty student phones must not hit /api/subscription/status.
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackResultsAction, type ResultsSurface } from './trackResultsAction';

/**
 * Two whole class strings (one per tone), held apart so neither can inherit the
 * other's fill: quiet = unfilled cream edge on the dark wall; loud = the
 * original cyan chip with a black edge.
 */
const QUIET_LINK =
  'self-center flex items-center justify-center gap-1.5 px-2.5 py-1 font-neo-body font-bold text-xs text-neo-cream/85 rounded-neo border-[2px] border-neo-cream/50 hover:text-neo-cream hover:border-neo-cream transition-colors';
const LOUD_LINK =
  'self-center flex items-center justify-center gap-2 px-3 py-2 font-neo-body font-bold text-sm bg-neo-cyan text-neo-black border-[2px] border-neo-black rounded-neo shadow-hard-sm hover:shadow-hard transition-all';

export function shouldShowUnlockReportUpgradeCta(hasPro: boolean, loading: boolean): boolean {
  return !loading && !hasPro;
}

export interface UnlockReportUpgradeCtaProps {
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  surface?: ResultsSurface;
  /**
   * Presentation only. `quiet` is the projector's small, unfilled link that
   * sits under the celebration instead of beside Play again. Same href, same
   * tracking, same entitlement gate.
   */
  tone?: 'default' | 'quiet';
}

export function UnlockReportUpgradeCta({
  language,
  t,
  surface = 'teacher_card',
  tone = 'default',
}: UnlockReportUpgradeCtaProps) {
  const { hasPro, loading } = useTeacherPro();
  const show = shouldShowUnlockReportUpgradeCta(hasPro, loading);

  useEffect(() => {
    if (!show) return;
    trackGrowthEvent('iap_viewed', {
      product: 'teacher_pro',
      source: `results_${surface}`,
    });
  }, [show, surface]);

  if (!show) return null;

  return (
    <Link
      href={`/${language}/teacher/upgrade`}
      data-testid="unlock-report-upgrade-cta"
      onClick={() => {
        trackResultsAction('unlock_report', surface);
        trackGrowthEvent('landing_cta_clicked', {
          cta: 'teacher_pro',
          source: `results_${surface}`,
        });
      }}
      className={cn(
        tone === 'quiet'
          ? QUIET_LINK
          : LOUD_LINK,
      )}
    >
      <BarChart3 className={tone === 'quiet' ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} aria-hidden />
      {t('education.results.unlockReport', { price: `$${TEACHER_PRO_PRICE_USD}` })}
    </Link>
  );
}

export default UnlockReportUpgradeCta;
