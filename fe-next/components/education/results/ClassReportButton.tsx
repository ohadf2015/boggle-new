/**
 * "See this class's report" on the classroom round-results screen (host tree only).
 *
 * For a free teacher the class report (who struggled, word mastery, CSV export) is
 * Teacher Pro, so the button opens a teaser: this round's anonymous mastery bars,
 * blurred, plus how many students found under half the words (a count, never a
 * name: the projector is read by the whole class), and the Teacher Pro ask.
 * The ask comes from resolveProOffer, so it follows the single-trial rules:
 *   inside the free access trial -> the report is open now (ProGate honours the access
 *                                   trial), so the teaser links to it and asks to
 *                                   "Keep Teacher Pro after your free trial"
 *   access trial ended           -> straight $9/mo, no new trial
 *   never trialed                -> the 14-day trial
 *
 * Analytics (cookie-free server twins, source `class_report_button`, copy A/B bucket
 * added server-side): rendered once per session (format report_button), every tap on
 * the button -> edu_pro_offer_clicked (format report_button), the teaser opening ->
 * rendered (format report_teaser), a tap on its checkout link -> edu_pro_offer_clicked
 * (format report_teaser).
 *
 * Pro teachers never see this button: StrugglePreview links them to the real report.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Lock, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useAuth } from '@/contexts/AuthContext';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy, trialCopyBase, TRIAL_COPY_RTL } from '@/lib/education/pro/trialCtaCopy';
import { classReportTeaserBody, classReportTeaserCopy } from '@/lib/education/pro/classReportTeaserCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackTeacherProUpgradeClick } from '@/lib/education/proFunnelTelemetry';

export const CLASS_REPORT_PLACEMENT = 'class_report_button' as const;

export interface ClassReportButtonProps {
  language: string;
  /** Students who found under half the words this round (studentsUnderHalf). */
  underHalf: number;
  /** This round's per-student found % (no names), lowest first; drawn blurred in the teaser. */
  bars: number[];
  className?: string;
}

export function ClassReportButton({ language, underHalf, bars, className }: ClassReportButtonProps) {
  const { hasPro, loading, known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [open, setOpen] = useState(false);
  const show = !loading && !hasPro;
  const copy = classReportTeaserCopy(language);
  const proOffer = resolveProOffer(language, { known, trialUsed, accessTrialExpires, accessTrialEnded }, resultsTrialCopy(language));
  const dir = TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : undefined;
  const base = { placement: CLASS_REPORT_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer };
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    if (!show) return;
    reportProOfferImpression({ ...baseRef.current, format: 'report_button', stage: 'rendered' }, { userId });
  }, [show, userId]);
  useEffect(() => {
    if (!show || !open) return;
    reportProOfferImpression({ ...baseRef.current, format: 'report_teaser', stage: 'rendered' }, { userId });
  }, [show, open, userId]);

  if (!show) return null;

  const shownBars = (bars.length > 0 ? bars : [22, 38, 55, 71, 86]).slice(0, 5);
  // Live access trial: Pro surfaces (the report included) are open until it ends.
  const trialOpen = proOffer.offer === 'keep_after_trial';

  return (
    <div className={cn('flex shrink-0 flex-col gap-2', className)} dir={dir}>
      <button
        type="button"
        data-testid="class-report-button"
        aria-expanded={open}
        aria-controls="class-report-teaser"
        onClick={() => {
          try {
            reportProOfferClick({ ...baseRef.current, format: 'report_button' });
            trackGrowthEvent('landing_cta_clicked', { cta: 'class_report_button', source: CLASS_REPORT_PLACEMENT, offer: proOffer.offer });
          } catch {
            /* analytics must never block */
          }
          setOpen((v) => !v);
        }}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-neo border-[2px] border-neo-cream/60 bg-neo-navy px-3 text-center font-neo-display text-sm font-bold text-neo-cream transition-colors hover:bg-neo-navy-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan active:translate-y-px @[96rem]/results:min-h-12 @[96rem]/results:text-base"
      >
        <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
        {copy.button}
      </button>
      {open ? (
        <section
          id="class-report-teaser"
          data-testid="class-report-teaser"
          data-offer={proOffer.offer}
          aria-label={copy.title}
          className="relative rounded-neo border-2 border-s-4 border-neo-cream/40 border-s-neo-pink bg-neo-navy-light p-3 text-neo-white"
        >
          <button
            type="button"
            data-testid="class-report-teaser-close"
            aria-label={copy.close}
            title={copy.close}
            onClick={() => setOpen(false)}
            className="absolute end-1 top-1 inline-flex size-9 items-center justify-center rounded-neo text-neo-white/70 hover:text-neo-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
          <p className="flex items-center gap-2 pe-9 font-neo-display text-sm font-black leading-tight text-neo-pink-light @[96rem]/results:text-lg">
            {trialOpen ? <BarChart3 className="size-4 shrink-0" aria-hidden="true" /> : <Lock className="size-4 shrink-0" aria-hidden="true" />}
            {trialOpen ? copy.trialOpenTitle : copy.title}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <ul aria-hidden="true" data-testid="class-report-teaser-bars" className={cn('pointer-events-none flex w-24 shrink-0 select-none flex-col gap-1', !trialOpen && 'blur-[2px]')}>
              {shownBars.map((pct, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-2 w-6 shrink-0 rounded-full bg-neo-cream/40" />
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-neo-navy">
                    <span className="block h-full origin-left rounded-full bg-neo-cream rtl:origin-right" style={{ transform: `scaleX(${Math.max(0.06, pct / 100)})` }} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="min-w-0 flex-1">
              <p data-testid="class-report-teaser-body" className="text-xs leading-snug text-neo-white/85 @[96rem]/results:text-sm">
                {classReportTeaserBody(copy, underHalf)}
              </p>
              <p className="mt-1 text-xs font-semibold text-neo-white/60">{copy.includes}</p>
            </div>
          </div>
          {trialOpen ? (
            <Link
              href={`/${language}/teacher/reports`}
              data-testid="class-report-teaser-open"
              onClick={() => {
                try {
                  trackGrowthEvent('landing_cta_clicked', { cta: 'class_report_open', source: CLASS_REPORT_PLACEMENT });
                } catch {
                  /* analytics must never block */
                }
              }}
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-neo border-[2px] border-neo-cream/60 px-3 font-neo-display text-sm font-bold text-neo-cream hover:bg-neo-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
            >
              <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
              {copy.openReport}
            </Link>
          ) : null}
          {proOffer.title ? (
            <p data-testid="class-report-teaser-offer-title" className="mt-2 text-sm font-bold text-neo-cream">
              {proOffer.title}
            </p>
          ) : null}
          <Link
            href={`/${language}/teacher/upgrade?source=${CLASS_REPORT_PLACEMENT}`}
            data-testid="class-report-teaser-cta"
            onClick={() => {
              try {
                trackTeacherProUpgradeClick({
                  page: typeof window !== 'undefined' ? window.location.pathname : `/${language}/education/live`,
                  locale: language,
                  placement: CLASS_REPORT_PLACEMENT,
                });
                reportProOfferClick({ ...baseRef.current, format: 'report_teaser' });
              } catch {
                /* analytics must never block */
              }
            }}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-neo border-2 border-neo-pink bg-transparent px-3 text-center font-neo-display text-sm font-bold text-neo-pink-light hover:bg-neo-pink/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan active:translate-y-px"
          >
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            {proOffer.label}
          </Link>
          <p data-testid="class-report-teaser-note" className="mt-1 text-center text-xs font-semibold text-neo-white/65">
            {proOffer.note}
          </p>
        </section>
      ) : null}
    </div>
  );
}

export default ClassReportButton;
