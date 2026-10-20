/**
 * Teacher Pro trial card on the classroom host's round-end screen.
 *
 * A free teacher who just ran a live class has seen the value; this is the
 * moment to offer the 14-day Teacher Pro trial ($9/mo after, Polar via
 * /teacher/upgrade, which owns the checkout POST) plus a quieter school quote
 * link ($49/teacher/year, 5+ teachers, invoice) to /education/for-schools.
 *
 * Host tree only (EduHostResults) — no student phone mounts it, so thirty
 * phones never hit /api/subscription/status. Hidden for Pro teachers and while
 * the entitlement read is in flight. Play again stays the one loud button.
 *
 * Copy lives in lib/education/pro/trialCtaCopy.ts (self-contained per locale).
 */
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { resultsTrialCopy, trialCopyBase, TRIAL_COPY_RTL } from '@/lib/education/pro/trialCtaCopy';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackTeacherProUpgradeClick } from '@/lib/education/proFunnelTelemetry';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';

export const RESULTS_TRIAL_PLACEMENT = 'classroom_results' as const;

export function ResultsTeacherProTrialCard({ language, className }: { language: string; className?: string }) {
  const { hasPro, loading, known, trialUsed } = useTeacherPro();
  const show = !loading && !hasPro;
  // Only a successful status read proves "never trialed"; an unknown read still
  // offers the trial — /teacher/upgrade re-checks eligibility before the POST.
  const offerTrial = !(known && trialUsed);
  const copy = resultsTrialCopy(language);
  const dir = TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : undefined;
  const cardRef = useRef<HTMLElement>(null);

  // Count an impression only once half the card is actually on screen, same as
  // the hub (useUpsellImpression). EduHostResults hides this card with CSS on a
  // short laptop/projector after a boss round (display:none), and on a phone it
  // sits below the fold; firing on mount counted both as seen. `null` until the
  // entitlement read settles, so the observer attaches once the card renders.
  useUpsellImpression(
    cardRef,
    show ? { cta: offerTrial ? 'teacher_pro_trial' : 'teacher_pro', placement: RESULTS_TRIAL_PLACEMENT } : null,
    { locale: language },
  );
  useUpsellImpression(
    cardRef,
    show ? { cta: 'district_upsell', placement: RESULTS_TRIAL_PLACEMENT } : null,
    { locale: language },
  );

  if (!show) return null;

  const page = () => (typeof window !== 'undefined' ? window.location.pathname : `/${language}/education/live`);

  return (
    <aside
      ref={cardRef}
      data-testid="results-teacher-pro-trial-card"
      data-placement={RESULTS_TRIAL_PLACEMENT}
      dir={dir}
      className={cn(
        'shrink-0 rounded-neo border-2 border-s-4 border-neo-cream/40 border-s-neo-pink bg-neo-navy-light p-4 text-neo-white',
        className,
      )}
    >
      <p className="flex items-center gap-2 font-neo-display text-base font-black leading-snug text-neo-pink-light">
        <Sparkles className="size-4 shrink-0" aria-hidden="true" />
        {copy.title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-neo-white/80">{copy.body}</p>
      <Link
        href={`/${language}/teacher/upgrade?source=${RESULTS_TRIAL_PLACEMENT}`}
        data-testid="results-teacher-pro-trial-cta"
        onClick={() => {
          try {
            trackTeacherProUpgradeClick({ page: page(), locale: language, placement: RESULTS_TRIAL_PLACEMENT });
            trackGrowthEvent('landing_cta_clicked', { cta: offerTrial ? 'teacher_pro_trial' : 'teacher_pro', source: RESULTS_TRIAL_PLACEMENT });
          } catch {
            /* analytics must never block */
          }
        }}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-neo border-2 border-neo-black bg-neo-pink px-4 text-center font-neo-display text-sm font-black text-neo-navy shadow-hard-sm transition-transform active:translate-y-px"
      >
        {offerTrial ? copy.trialCta : copy.upgradeCta}
      </Link>
      <p className="mt-1.5 text-center text-xs font-semibold text-neo-white/65">
        {offerTrial ? copy.trialNote : copy.upgradeNote}
      </p>
      <div className="mt-3 border-t border-neo-cream/20 pt-3 text-center">
        <Link
          href={`/${language}/education/for-schools?source=${RESULTS_TRIAL_PLACEMENT}`}
          data-testid="results-school-quote-link"
          onClick={() => {
            try {
              trackGrowthEvent('landing_cta_clicked', { cta: 'district_upsell', source: RESULTS_TRIAL_PLACEMENT });
            } catch {
              /* analytics must never block */
            }
          }}
          className="text-sm font-bold text-neo-cream underline underline-offset-2 hover:text-neo-white"
        >
          {copy.quoteCta}
        </Link>
        <p className="mt-0.5 text-xs text-neo-white/60">{copy.quoteNote}</p>
      </div>
    </aside>
  );
}

export default ResultsTeacherProTrialCard;
