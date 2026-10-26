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
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/80 p-4"
      onClick={pending ? undefined : onBack}
    >
      <div
        className="w-full max-w-md rounded-neo border-3 border-neo-black bg-neo-white p-5 shadow-hard-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-neo-display text-xl font-black text-neo-black">
          {t('eg2Pro.preCheckout.title')}
        </h2>

        <p data-testid="pre-checkout-price-line" className="mt-2 text-sm font-bold text-neo-black/80">
          {mode === 'trial'
            ? t('eg2Pro.plans.trialNote', { days: TEACHER_PRO_TRIAL_DAYS, price })
            : t('eg2Pro.preCheckout.paidLine', { price })}
        </p>

        <p className="mt-4 text-[11px] font-black uppercase tracking-widest text-neo-black/60">
          {t('eg2Pro.preCheckout.includesTitle')}
        </p>
        <ul className="mt-2 space-y-1.5">
          {INCLUDED_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neo-lime-dark" strokeWidth={2.5} aria-hidden />
              <span className="text-sm font-bold leading-snug text-neo-black">{t(key)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-neo-black/70">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-neo-lime-dark" strokeWidth={2.5} aria-hidden />
            {t('teacher.subscription.trustCancel')}
          </span>
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            {t('eg2Pro.preCheckout.secure')}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
            data-testid="pre-checkout-confirm"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-lime px-4 font-neo-display text-base font-black text-neo-black shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
          >
            {pending ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
            {pending ? t('common.loading') : t('eg2Pro.preCheckout.confirm')}
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            data-testid="pre-checkout-back"
            className="min-h-11 w-full rounded-neo border-2 border-neo-black/30 px-4 text-sm font-black text-neo-black/70 transition-colors hover:border-neo-black hover:text-neo-black disabled:opacity-60"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreCheckoutExplainer;
