'use client';

/**
 * Pre-checkout explainer — the one screen between "Start free trial" / "Buy"
 * and the Polar redirect. Gate A (2026-10-25) showed checkout_started rows but
 * zero trial_success: teachers were bouncing off a bare hosted checkout. This
 * step answers the three questions a teacher has *before* the card ask: what
 * the trial includes, what it costs afterwards, and that they can cancel.
 *
 * Pure presentation: the hook (useUpgradeCheckout) owns when it opens and what
 * confirm does. Analytics never fires from here.
 */

import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { cn } from '@/lib/utils';
import { NB_DIALOG_BODY, NB_DIALOG_FOOTER, NB_DIALOG_TITLE, NB_OVERLAY_LAYER, NB_OVERLAY_PANEL, nbDialogHeaderClass } from '@/components/teacher/nb/nbDialogStyles';
import { NB_PRIMARY, NB_SECONDARY } from '@/components/teacher/nb/nbStyles';

export interface PreCheckoutExplainerProps {
  /** Which checkout the teacher is about to start. */
  mode: 'trial' | 'paid';
  /** True while the checkout POST is in flight (confirm stays disabled). */
  pending: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

const INCLUDED_KEYS = [
  'teacher.subscription.unlimitedClasses',
  'teacher.subscription.unlimitedStudents',
  'education.landing.pro.noAds',
] as const;

export function PreCheckoutExplainer({ mode, pending, onConfirm, onBack }: PreCheckoutExplainerProps) {
  const { t } = useLanguage();
  const price = `$${TEACHER_PRO_PRICE_USD}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('eg2Pro.preCheckout.title')}
      data-testid="pre-checkout-explainer"
      className={cn(NB_OVERLAY_LAYER, 'z-50')}
      onClick={pending ? undefined : onBack}
    >
      <div className={cn(NB_OVERLAY_PANEL, 'sm:max-w-md')} onClick={(e) => e.stopPropagation()}>
        <div className={nbDialogHeaderClass('yellow')}>
          <div className="min-w-0 flex-1">
            <h2 className={NB_DIALOG_TITLE}>{t('eg2Pro.preCheckout.title')}</h2>
            <p data-testid="pre-checkout-price-line" className="mt-1 font-neo-body text-sm font-bold">
              {mode === 'trial'
                ? t('eg2Pro.plans.trialNote', { days: TEACHER_PRO_TRIAL_DAYS, price })
                : t('eg2Pro.preCheckout.paidLine', { price })}
            </p>
          </div>
        </div>

        <div className={NB_DIALOG_BODY}>
          <p className="font-neo-display text-base font-black text-neo-cream">{t('eg2Pro.preCheckout.includesTitle')}</p>
          <ul className="mt-2 space-y-2">
            {INCLUDED_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-neo-lime" strokeWidth={2.5} aria-hidden />
                <span className="font-neo-body text-sm font-bold leading-snug text-neo-cream">{t(key)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-neo-body text-xs font-bold text-neo-cream/75">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-neo-lime" strokeWidth={2.5} aria-hidden />
              {t('teacher.subscription.trustCancel')}
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3.5" strokeWidth={2.5} aria-hidden />
              {t('eg2Pro.preCheckout.secure')}
            </span>
          </div>
        </div>

        <div className={NB_DIALOG_FOOTER}>
          <button type="button" onClick={onBack} disabled={pending} data-testid="pre-checkout-back" className={NB_SECONDARY}>
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
            data-testid="pre-checkout-confirm"
            className={cn(NB_PRIMARY, 'disabled:cursor-wait')}
          >
            {pending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
            {pending ? t('common.loading') : t('eg2Pro.preCheckout.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreCheckoutExplainer;
