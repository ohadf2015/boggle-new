/**
 * "Export class report (PDF)" on the classroom round-results wall (host tree only).
 *
 * Pro teacher  -> builds this round's class report as a PDF in the browser and downloads it
 *                 (the existing class-report PDF, components/teacher/reports/downloadReportPdf).
 * Free teacher -> the same button, locked (lock icon + Pro pill). A tap goes straight to the
 *                 Teacher Pro Polar checkout; the ask follows resolveProOffer's single-trial rules:
 *                   inside the free access trial -> "Keep Teacher Pro after your free trial" (the charge
 *                                                   starts at the trial's end, server-capped)
 *                   access trial ended           -> straight $9/mo, no new trial
 *                   never trialed                -> the 14-day trial
 *                 Checkout opens in a new tab so the projector keeps the live room.
 *
 * Analytics (cookie-free server twins, placement `results_report_pdf`, format `report_button`):
 * the locked button rendering -> rendered (once per session, proOfferSession.ts), a locked tap ->
 * edu_pro_offer_clicked. Compare against the `dashboard` placement.
 *
 * A free teacher with 3+ classes also gets "Get a school quote" under it (ResultsSchoolQuoteLink).
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { resultsTrialCopy, trialCopyBase, TRIAL_COPY_RTL } from '@/lib/education/pro/trialCtaCopy';
import { reportPdfButtonCopy } from '@/lib/education/pro/reportPdfButtonCopy';
import { reportProOfferClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { trackTeacherProUpgradeClick } from '@/lib/education/proFunnelTelemetry';
import { checkoutFailureKey, goToPolarCheckout, postTeacherProCheckout } from '@/lib/education/postTeacherProCheckout';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import { buildRoundReportPdfData } from './roundReportPdfData';
import { ProPill } from './ProPill';
import { ResultsSchoolQuoteLink } from './ResultsSchoolQuoteLink';

export const REPORT_PDF_PLACEMENT = 'results_report_pdf' as const;

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface ReportPdfExportButtonProps {
  language: string;
  summary: Pick<ClassroomSummary, 'teacherName' | 'lessonNames' | 'totalWords' | 'classFoundCount' | 'masteryByPlayer'>;
  players?: PlayerResult[];
  proLabel?: string;
  className?: string;
  /** Drop the trial line when another card on the screen already makes the offer. */
  hideOffer?: boolean;
}

const BUTTON =
  'inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-neo-lg border-[3px] px-3 text-center font-neo-display text-sm font-black normal-case shadow-hard-lg transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:opacity-60 @5xl/results:text-base @[96rem]/results:min-h-14 @[96rem]/results:text-xl';

/** A blank tab opened inside the tap (so no popup blocker), pointed at checkout once the URL is back. */
function openBlankTab(): Window | null {
  try {
    const w = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
    if (w) w.opener = null;
    return w;
  } catch {
    return null;
  }
}

export function ReportPdfExportButton({ language, summary, players, proLabel = 'Pro', className, hideOffer = false }: ReportPdfExportButtonProps) {
  const { hasPro, loading, known, trialUsed, accessTrialExpires, accessTrialEnded } = useTeacherPro();
  const { user } = useAuth();
  const lang = useLanguage();
  const t = lang.t as unknown as Translate;
  const userId = user?.id ?? null;
  const copy = reportPdfButtonCopy(language);
  const proOffer = resolveProOffer(language, { known, trialUsed, accessTrialExpires, accessTrialEnded }, resultsTrialCopy(language));
  const dir = TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : 'ltr';
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const locked = !loading && !hasPro;
  const base = { placement: REPORT_PDF_PLACEMENT, locale: language, cta: proOffer.cta, offer: proOffer.offer, format: 'report_button' as const };
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    if (!locked) return;
    reportProOfferImpression({ ...baseRef.current, stage: 'rendered' }, { userId });
  }, [locked, userId]);

  if (loading) return null;

  const busy = state === 'busy';

  const exportPdf = async () => {
    if (busy) return;
    setState('busy');
    try {
      const { downloadReportPdf } = await import('@/components/teacher/reports/downloadReportPdf');
      const data = buildRoundReportPdfData(summary, players, { fallbackName: copy.fallbackName });
      await downloadReportPdf({
        data,
        t,
        language,
        dir,
        fileName: t('teacher.reports.export.fileClass', { name: data.classroomName }),
      });
      setState('idle');
    } catch {
      setState('failed');
    }
  };

  const startCheckout = async () => {
    if (busy) return;
    try {
      trackTeacherProUpgradeClick({
        page: typeof window !== 'undefined' ? window.location.pathname : `/${language}/education/live`,
        locale: language,
        placement: REPORT_PDF_PLACEMENT,
      });
      reportProOfferClick(baseRef.current);
    } catch {
      /* analytics must never block the till */
    }
    const tab = openBlankTab();
    setState('busy');
    try {
      const result = await postTeacherProCheckout(fetch, { trial: proOffer.checkoutTrial, locale: language, placement: REPORT_PDF_PLACEMENT });
      if (!result.ok) {
        tab?.close();
        toast.error(t(checkoutFailureKey(result)));
        return;
      }
      if (tab) tab.location.href = result.url;
      else goToPolarCheckout(result.url);
    } catch {
      tab?.close();
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setState('idle');
    }
  };

  if (!locked) {
    return (
      <div className={cn('flex shrink-0 flex-col gap-1', className)} dir={dir === 'rtl' ? 'rtl' : undefined}>
        <button
          type="button"
          data-testid="report-pdf-export"
          data-locked="false"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void exportPdf()}
          className={cn(BUTTON, 'border-neo-cream/50 bg-neo-navy-light text-neo-cream')}
        >
          {busy ? <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4 shrink-0" aria-hidden="true" />}
          {busy ? copy.preparing : copy.button}
        </button>
        {state === 'failed' && (
          <p role="alert" data-testid="report-pdf-export-failed" className="text-center text-xs font-semibold text-neo-pink-light">
            {copy.failed}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex shrink-0 flex-col gap-1', className)} dir={dir === 'rtl' ? 'rtl' : undefined} data-offer={proOffer.offer} data-testid="report-pdf-locked">
      <button
        type="button"
        data-testid="report-pdf-export"
        data-locked="true"
        disabled={busy}
        aria-busy={busy}
        aria-label={copy.lockedLabel}
        onClick={() => void startCheckout()}
        className={cn(BUTTON, 'border-dashed border-neo-cream/50 bg-neo-navy-light text-neo-cream')}
      >
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Lock className="size-4 shrink-0" aria-hidden="true" />}
        <span className="min-w-0">{copy.button}</span>
        <ProPill label={proLabel} />
      </button>
      {!hideOffer && (
        <p data-testid="report-pdf-offer" className="text-center text-xs font-semibold text-neo-cream/80 @[96rem]/results:text-sm">
          <span className="font-bold text-neo-cream">{proOffer.label}</span>
          {' · '}
          {proOffer.note}
        </p>
      )}
      {/* Teachers with 3+ classes: the Schools plan beside the $9/mo ask (placement results_school_quote). */}
      <ResultsSchoolQuoteLink language={language} />
    </div>
  );
}

export default ReportPdfExportButton;
