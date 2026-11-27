'use client';

/**
 * Pre-cancel retention interstitial — the one screen between a Teacher Pro
 * teacher (active or trialing) tapping "Manage or cancel" and the raw Polar
 * portal cancel. UR 2026-11-26: the first real Teacher Pro trial cancelled 80
 * seconds after opening that path; this dialog is the retention ask the
 * portfolio's shortest revenue path never had.
 *
 * Two one-click offers, each applied to the EXISTING Polar subscription
 * (POST /api/subscription/retention-offer — never a new checkout):
 *   pause    — trialing only. The server moves trial_end out one month via
 *              Polar. An active plan has no live pause call, so the button
 *              is not shown (a recorded "pause" must not claim the charge moved).
 *   discount — a request only. Polar discount_id is not wired; the copy must
 *              not say the price already changed.
 * Dismissal ("continue to cancellation", or the backdrop) lands on the
 * original manage href — the Polar portal or the in-app plan page.
 *
 * Analytics (through proFunnelTelemetry, never blocking):
 *   trial_cancel_offer_viewed on open,
 *   trial_cancel_offer_accepted { offer } on a taken offer,
 *   trial_cancel_offer_dismissed when the teacher continues to cancel.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { BadgePercent, CalendarClock, Check, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  trackTrialCancelOfferAccepted,
  trackTrialCancelOfferDismissed,
  trackTrialCancelOfferViewed,
} from '@/lib/education/proFunnelTelemetry';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { planEndDate } from './TeacherProTrialCanceledBanner';
import { cn } from '@/lib/utils';
import {
  NB_DIALOG_BODY,
  NB_DIALOG_FOOTER,
  NB_DIALOG_TITLE,
  NB_OVERLAY_LAYER,
  NB_OVERLAY_PANEL,
  nbDialogHeaderClass,
} from '@/components/teacher/nb/nbDialogStyles';
import { NB_BLOCK, NB_LINK, NB_SMALL } from '@/components/teacher/nb/nbStyles';

export interface TeacherCancelOfferDialogProps {
  /** Provider status of the live plan: 'trialing' | 'active'. Event prop + copy. */
  status: string;
  /** Where dismissal continues: the Polar portal (external) or the in-app plan page. */
  manageHref: string;
  external: boolean;
  onClose: (reason: 'applied' | 'dismissed') => void;
}

type OfferKind = 'pause' | 'discount';

export function TeacherCancelOfferDialog({ status, manageHref, external, onClose }: TeacherCancelOfferDialogProps) {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState<OfferKind | null>(null);
  const [applied, setApplied] = useState<{ offer: OfferKind; live: boolean; trialEnd: string | null } | null>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    try {
      trackTrialCancelOfferViewed({ status });
    } catch {
      /* analytics must never block the offer */
    }
  }, [status]);

  const accept = async (offer: OfferKind) => {
    if (pending) return;
    setPending(offer);
    try {
      const res = await fetch('/api/subscription/retention-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ offer }),
      });
      if (!res.ok) throw new Error(`retention-offer ${res.status}`);
      const body = (await res.json()) as { applied?: string; trial_end?: string };
      try {
        trackTrialCancelOfferAccepted({ offer, status });
      } catch {
        /* analytics must never block the offer */
      }
      setApplied({ offer, live: body.applied === 'pause', trialEnd: body.trial_end ?? null });
    } catch {
      toast.error(t('teacher.subscription.cancelOfferError'));
    } finally {
      setPending(null);
    }
  };

  const continueToCancel = () => {
    try {
      trackTrialCancelOfferDismissed({ status });
    } catch {
      /* analytics must never block the exit */
    }
    if (external) {
      window.open(manageHref, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(manageHref);
    }
    onClose('dismissed');
  };

  if (applied) {
    return (
      <div role="dialog" aria-modal="true" data-testid="cancel-offer-applied" className={cn(NB_OVERLAY_LAYER, 'sm:p-4')}>
        <div className={cn(NB_OVERLAY_PANEL, 'max-w-md sm:rounded-neo-xl sm:border-b-[3px] sm:shadow-hard-xl')}>
          <div className={nbDialogHeaderClass('lime')}>
            <div className="flex items-center gap-3">
              <Check className="size-7 shrink-0" strokeWidth={3} aria-hidden="true" />
              <h2 className={NB_DIALOG_TITLE}>
                {t(applied.live ? 'teacher.subscription.cancelOfferAppliedTitle' : 'teacher.subscription.cancelOfferRequestTitle')}
              </h2>
            </div>
          </div>
          <div className={NB_DIALOG_BODY}>
            <p className="font-neo-body text-sm font-bold text-edu-ink">
              {applied.live && applied.trialEnd
                ? t('teacher.subscription.cancelOfferAppliedPause', { date: planEndDate(applied.trialEnd, language) })
                : t('teacher.subscription.cancelOfferRecorded')}
            </p>
          </div>
          <div className={NB_DIALOG_FOOTER}>
            <button type="button" data-testid="cancel-offer-applied-done" onClick={() => onClose('applied')} className={cn(NB_SMALL, NB_BLOCK.lime, 'w-full')}>
              {t('teacher.subscription.cancelOfferDone')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const price = `$${TEACHER_PRO_PRICE_USD}`;
  const offerButton = (offer: OfferKind, icon: ReactNode, title: string, body: string, tone: string) => (
    <button
      type="button"
      key={offer}
      data-testid={`cancel-offer-${offer}`}
      disabled={pending !== null}
      aria-busy={pending === offer || undefined}
      onClick={() => void accept(offer)}
      className={cn(NB_SMALL, 'w-full min-h-14 px-4 py-2 text-start', tone, 'disabled:cursor-wait')}
    >
      <span className="flex w-full items-center gap-3">
        <span className="shrink-0">{pending === offer ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base">{title}</span>
          <span className="block font-neo-body text-xs font-bold opacity-85">{body}</span>
        </span>
      </span>
    </button>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('teacher.subscription.cancelOfferTitle')}
      data-testid="cancel-offer-dialog"
      className={cn(NB_OVERLAY_LAYER, 'sm:p-4')}
      onClick={pending ? undefined : continueToCancel}
    >
      <div
        className={cn(NB_OVERLAY_PANEL, 'max-w-md sm:rounded-neo-xl sm:border-b-[3px] sm:shadow-hard-xl')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={nbDialogHeaderClass('yellow')}>
          <h2 className={NB_DIALOG_TITLE}>{t('teacher.subscription.cancelOfferTitle')}</h2>
        </div>
        <div className={NB_DIALOG_BODY}>
          <p className="font-neo-body text-sm font-bold text-edu-ink">{t('teacher.subscription.cancelOfferBody')}</p>
          <div className="mt-4 flex flex-col gap-2">
            {status === 'trialing'
              ? offerButton(
                  'pause',
                  <CalendarClock className="size-5" strokeWidth={2.5} aria-hidden="true" />,
                  t('teacher.subscription.cancelOfferPauseTitle'),
                  t('teacher.subscription.cancelOfferPauseBody', { price }),
                  NB_BLOCK.lime,
                )
              : null}
            {offerButton(
              'discount',
              <BadgePercent className="size-5" strokeWidth={2.5} aria-hidden="true" />,
              t('teacher.subscription.cancelOfferDiscountTitle'),
              t('teacher.subscription.cancelOfferDiscountBody', { price, halfPrice: `$${(TEACHER_PRO_PRICE_USD / 2).toFixed(2)}` }),
              NB_BLOCK.orange,
            )}
          </div>
        </div>
        <div className={NB_DIALOG_FOOTER}>
          <button type="button" data-testid="cancel-offer-continue" onClick={continueToCancel} disabled={pending !== null} className={NB_LINK}>
            {t('teacher.subscription.cancelOfferStillCancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TeacherCancelOfferDialog;
