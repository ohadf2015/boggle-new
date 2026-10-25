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

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { accessTrialLive, keepAfterTrialCopy } from '@/lib/education/pro/keepAfterTrialCopy';
import { classCreatedTrialCopy, resultsTrialCopy, trialCopyBase, TRIAL_COPY_RTL } from '@/lib/education/pro/trialCtaCopy';
import { reportProCtaClick } from '@/lib/education/reportProCtaClick';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackTeacherProUpgradeClick } from '@/lib/education/proFunnelTelemetry';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';

export const RESULTS_TRIAL_PLACEMENT = 'classroom_results' as const;
export const CLASS_CREATED_TRIAL_PLACEMENT = 'class_created' as const;
export type TeacherProTrialPlacement = typeof RESULTS_TRIAL_PLACEMENT | typeof CLASS_CREATED_TRIAL_PLACEMENT;

/** Dismissal is remembered per placement for this long on this device. */
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const dismissKey = (placement: string) => `lexi:proTrialCardDismissed:${placement}`;

function readDismissed(placement: string): boolean {
  try {
    const at = Number(window.localStorage.getItem(dismissKey(placement)));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

/**
 * `placement="class_created"` is the same card on the class-ready screen
 * (ClassReady, teacher setup flow), right after a teacher makes a class: its own
 * title, its own impression/click placement, and a "Not now" that hides it for
 * 14 days on this device. The results screen keeps no dismiss.
 */

export function ResultsTeacherProTrialCard({
  language,
  className,
  placement = RESULTS_TRIAL_PLACEMENT,
}: {
  language: string;
  className?: string;
  placement?: TeacherProTrialPlacement;
}) {
  const { hasPro, loading, known, trialUsed, accessTrialExpires } = useTeacherPro();
  const dismissible = placement === CLASS_CREATED_TRIAL_PLACEMENT;
  // Hidden until the stored dismissal is read, so a dismissed card never flashes.
  const [dismissed, setDismissed] = useState<boolean | null>(dismissible ? null : false);
  useEffect(() => {
    if (dismissible) setDismissed(readDismissed(placement));
  }, [dismissible, placement]);
  const show = !loading && !hasPro && dismissed === false;
  // Only a successful status read proves "never trialed"; an unknown read still
  // offers the trial — /teacher/upgrade re-checks eligibility before the POST.
  const offerTrial = !(known && trialUsed);
  const baseCopy = dismissible ? classCreatedTrialCopy(language) : { ...resultsTrialCopy(language), dismiss: '' };
  // Inside the free access trial there is one trial, not two: ask them to keep Pro
  // when it ends instead of pitching a fresh 14-day trial behind a card form.
  const keep = offerTrial && accessTrialLive(accessTrialExpires) ? keepAfterTrialCopy(language, accessTrialExpires) : null;
  const copy = keep ? { ...baseCopy, title: keep.title, trialCta: keep.cta, trialNote: keep.note } : baseCopy;
  const dir = TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : undefined;
  const cardRef = useRef<HTMLElement>(null);

  // Count an impression only once half the card is actually on screen, same as
  // the hub (useUpsellImpression). EduHostResults hides this card with CSS on a
  // short laptop/projector after a boss round (display:none), and on a phone it
  // sits below the fold; firing on mount counted both as seen. `null` until the
  // entitlement read settles, so the observer attaches once the card renders.
  useUpsellImpression(
    cardRef,
    show ? { cta: offerTrial ? 'teacher_pro_trial' : 'teacher_pro', placement: placement } : null,
    { locale: language },
  );
  useUpsellImpression(
    cardRef,
    show ? { cta: 'district_upsell', placement: placement } : null,
    { locale: language },
  );

  if (!show) return null;

  const page = () => (typeof window !== 'undefined' ? window.location.pathname : `/${language}/education/live`);

  return (
    <aside
      ref={cardRef}
      data-testid="results-teacher-pro-trial-card"
      data-placement={placement}
      dir={dir}
      className={cn(
        'shrink-0 rounded-neo border-2 border-s-4 border-neo-cream/40 border-s-neo-pink bg-neo-navy-light p-4 text-neo-white',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <p className="flex flex-1 items-center gap-2 font-neo-display text-base font-black leading-snug text-neo-pink-light">
          <Sparkles className="size-4 shrink-0" aria-hidden="true" />
          {copy.title}
        </p>
        {dismissible ? (
          <button
            type="button"
            data-testid="teacher-pro-trial-dismiss"
            aria-label={copy.dismiss}
            title={copy.dismiss}
            onClick={() => {
              try {
                window.localStorage.setItem(dismissKey(placement), String(Date.now()));
              } catch {
                /* private mode: hide for this visit only */
              }
              try {
                trackGrowthEvent('landing_cta_clicked', { cta: 'teacher_pro_trial_dismiss', source: placement });
              } catch {
                /* analytics must never block */
              }
              setDismissed(true);
            }}
            className="-me-1 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-neo text-neo-white/70 hover:text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-neo-white/80">{copy.body}</p>
      <Link
        href={`/${language}/teacher/upgrade?source=${placement}`}
        data-testid="results-teacher-pro-trial-cta"
        onClick={() => {
          try {
            trackTeacherProUpgradeClick({ page: page(), locale: language, placement: placement });
            trackGrowthEvent('landing_cta_clicked', { cta: offerTrial ? 'teacher_pro_trial' : 'teacher_pro', source: placement });
            reportProCtaClick({ placement, locale: language, cta: offerTrial ? 'teacher_pro_trial' : 'teacher_pro' });
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
          href={`/${language}/education/for-schools?source=${placement}`}
          data-testid="results-school-quote-link"
          onClick={() => {
            try {
              trackGrowthEvent('landing_cta_clicked', { cta: 'district_upsell', source: placement });
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
