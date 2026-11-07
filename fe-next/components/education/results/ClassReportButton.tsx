/**
 * The one Teacher Pro slot on the classroom round-results wall (host tree only), for a free teacher.
 *
 * The free insight (the words the class missed, how many found under half) is already on the wall. This
 * is a labelled preview of what the full report adds: this round's anonymous mastery bars, drawn plainly
 * (no blur), how many students found under half (a count, never a name: the projector is read by the
 * whole class), and one action. The ask comes from resolveProOffer, so it follows the single-trial rules:
 *   inside the free access trial -> the report is open now, so the one action opens it
 *   access trial ended           -> straight $9/mo, no new trial
 *   never trialed                -> the 14-day trial
 * Links open a new tab: leaving the projector tab would drop the live room.
 *
 * Analytics (cookie-free server twins, source `class_report_button`): the preview rendering ->
 * rendered (format report_teaser), a tap on its checkout link -> edu_pro_offer_clicked (format report_teaser).
 *
 * Pro teachers never see this: StrugglePreview links them to the real report.
 */
'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useAuth } from '@/contexts/AuthContext';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy, trialCopyBase, TRIAL_COPY_RTL } from '@/lib/education/pro/trialCtaCopy';
import { classReportTeaserBody, classReportTeaserCopy } from '@/lib/education/pro/classReportTeaserCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { trackTeacherProUpgradeClick } from '@/lib/education/proFunnelTelemetry';
import { ProPill } from './ProPill';

export const CLASS_REPORT_PLACEMENT = 'class_report_button' as const;

export interface ClassReportButtonProps {
  language: string;
  /** Students who found under half the words this round (studentsUnderHalf). */
  underHalf: number;
  /** This round's per-student found % (no names), lowest first. */
  bars: number[];
  /** The localized "Pro" pill label. */
  proLabel?: string;
  className?: string;
}

const LINK =
  'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-neo-lg border-[3px] px-3 text-center font-neo-display text-sm font-black shadow-hard-lg transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan @5xl/results:text-base @[96rem]/results:min-h-14 @[96rem]/results:text-xl';

export function ClassReportButton({ language, underHalf, bars, proLabel = 'Pro', className }: ClassReportButtonProps) {
  const { hasPro, loading, known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const show = !loading && !hasPro;
  const copy = classReportTeaserCopy(language);
  const proOffer = resolveProOffer(language, { known, trialUsed, accessTrialExpires, accessTrialEnded }, resultsTrialCopy(language));
  const dir = TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : undefined;
  const base = { placement: CLASS_REPORT_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer };
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    if (!show) return;
    reportProOfferImpression({ ...baseRef.current, format: 'report_teaser', stage: 'rendered' }, { userId });
  }, [show, userId]);

  if (!show) return null;

  const shownBars = (bars.length > 0 ? bars : [22, 38, 55, 71, 86]).slice(0, 5);
  const trialOpen = proOffer.offer === 'keep_after_trial';

  return (
    <div className={cn('flex shrink-0 flex-col', className)} dir={dir}>
      <section
        id="class-report-teaser"
        data-testid="class-report-teaser"
        data-offer={proOffer.offer}
        aria-labelledby="class-report-teaser-title"
        className="flex flex-col gap-2 rounded-neo-xl border-[3px] border-dashed border-neo-cream/50 bg-neo-navy-light px-3 py-3 text-neo-cream shadow-hard-xl @5xl/results:px-4"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="class-report-teaser-title" className="flex min-w-0 items-center gap-2 font-neo-display text-sm font-black leading-tight text-neo-cream @5xl/results:text-base @[96rem]/results:text-xl">
            <BarChart3 className="size-[1.1em] shrink-0" aria-hidden="true" />
            {trialOpen ? copy.trialOpenTitle : copy.title}
          </h2>
          <ProPill label={proLabel} />
        </div>
        <div className="flex items-center gap-3">
          <ul aria-hidden="true" data-testid="class-report-teaser-bars" className="pointer-events-none flex w-24 shrink-0 select-none flex-col gap-1 @[96rem]/results:w-36">
            {shownBars.map((pct, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="h-2 w-6 shrink-0 rounded-sm bg-neo-cream/50" />
                <span className="h-2 flex-1 overflow-hidden rounded-sm bg-neo-navy">
                  <span className="block h-full origin-left bg-neo-cream rtl:origin-right" style={{ transform: `scaleX(${Math.max(0.06, pct / 100)})` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className="min-w-0 flex-1">
            <p data-testid="class-report-teaser-body" className="text-sm leading-snug text-neo-cream @[96rem]/results:text-lg">
              {classReportTeaserBody(copy, underHalf)}
            </p>
            <p className="mt-1 text-xs font-semibold text-neo-cream/80 @[96rem]/results:text-base">{copy.includes}</p>
          </div>
        </div>
        {proOffer.title ? (
          <p data-testid="class-report-teaser-offer-title" className="text-sm font-bold text-neo-cream @[96rem]/results:text-lg">
            {proOffer.title}
          </p>
        ) : null}
        {trialOpen ? (
          <Link
            href={`/${language}/teacher/reports`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="class-report-teaser-open"
            onClick={() => {
              try {
                trackGrowthEvent('landing_cta_clicked', { cta: 'class_report_open', source: CLASS_REPORT_PLACEMENT });
              } catch {
                /* analytics must never block */
              }
            }}
            className={cn(LINK, 'border-neo-cream/50 bg-neo-navy text-neo-cream')}
          >
            <BarChart3 className="size-4 shrink-0" aria-hidden="true" />
            {copy.openReport}
          </Link>
        ) : (
          <>
            <Link
              href={`/${language}/teacher/upgrade?source=${CLASS_REPORT_PLACEMENT}`}
              target="_blank"
              rel="noopener noreferrer"
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
              className={cn(LINK, 'border-neo-black bg-neo-pink text-neo-white')}
            >
              <Sparkles className="size-4 shrink-0" aria-hidden="true" />
              {proOffer.label}
            </Link>
            <p data-testid="class-report-teaser-note" className="text-center text-xs font-semibold text-neo-cream/80 @[96rem]/results:text-sm">
              {proOffer.note}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

export default ClassReportButton;
