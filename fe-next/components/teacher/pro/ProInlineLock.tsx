'use client';

import { useId, useState } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useTeacherProCheckout } from '@/hooks/useTeacherProCheckout';
import { useCheckoutBlockedInApp } from '@/hooks/useCheckoutBlockedInApp';
import { TEACHER_PRO_PRICE_USD } from '@/lib/education/freeTierLimits';
import { rememberCheckoutOrigin } from '@/lib/education/checkoutReturn';
import { trackProUpgradeClicked, type ProUpgradeSource } from '@/lib/education/proFunnelTelemetry';
import type { ProFeature } from '@/components/teacher/ProGate';
import { ProFeaturePreview } from './ProFeaturePreview';

const PRESS =
  'transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

/** A locked Pro action inside a page a free teacher can use: tap to see a sample, then one upgrade. */
export function ProInlineLock({ feature, label, className }: { feature: ProFeature; label: string; className?: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const checkout = useTeacherProCheckout(`pro_gate_${feature}` as ProUpgradeSource);
  const blockedInApp = useCheckoutBlockedInApp();

  const upgrade = () => {
    trackProUpgradeClicked({ feature });
    rememberCheckoutOrigin(window.sessionStorage, `${window.location.pathname}${window.location.search}`);
    void checkout.start();
  };

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <button
        type="button"
        data-testid={`pro-inline-lock-${feature}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-lime bg-neo-navy px-4 py-2 font-neo-display text-sm font-black text-neo-lime shadow-hard-sm',
          PRESS,
        )}
      >
        <Lock className="size-4" aria-hidden="true" />
        {label}
        <span className="rounded-neo border-2 border-black bg-neo-lime px-1.5 text-[11px] text-neo-black">{t('eduShell.nav.pro')}</span>
      </button>
      {open && (
        <div
          id={panelId}
          data-testid={`pro-inline-peek-${feature}`}
          className="w-full max-w-md rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1"
        >
          <div aria-hidden="true" className="pointer-events-none select-none">
            <ProFeaturePreview feature={feature} />
          </div>
          <p className="mt-2 text-sm font-bold leading-snug text-neo-white/85">{t(`teacher.proGate.${feature}.body`)}</p>
          {blockedInApp ? (
            <p className="mt-2 text-sm font-bold text-neo-white/80">{t('teacher.subscription.notInApp')}</p>
          ) : (
            <button
              type="button"
              data-testid={`pro-inline-upgrade-${feature}`}
              disabled={checkout.pending}
              aria-busy={checkout.pending || undefined}
              onClick={upgrade}
              className={cn('mt-3 rounded-neo border-neo bg-neo-lime px-4 py-2 font-black text-neo-black shadow-hard-sm disabled:opacity-60', PRESS)}
            >
              {t('teacher.proGate.cta', { price: `$${TEACHER_PRO_PRICE_USD}` })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
