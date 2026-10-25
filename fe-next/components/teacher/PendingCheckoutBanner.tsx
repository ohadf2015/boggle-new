'use client';

import { useCallback, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const CTA_CLASS =
  'inline-flex shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-black px-4 py-2 font-neo-display text-sm font-black text-white shadow-hard hover:-translate-y-0.5 disabled:opacity-60';

/**
 * Persistent resume banner for a teacher who started Polar checkout in the last
 * 14 days and has not completed it.
 *
 * Non-dismissible: resolves automatically once checkout completes or ages out.
 * CTA POSTs /api/subscription/checkout with `{ locale }` to create a fresh
 * Polar checkout session reusing the teacher's customer record.
 *
 * The `iap_viewed` impression is fired by the banner effect in
 * app/[locale]/teacher/PageClient.tsx (source: 'dashboard_pending_checkout'),
 * same as every other dashboard banner — never here, or it double-counts.
 */
export function PendingCheckoutBanner() {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState(false);

  const handleResume = useCallback(async () => {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: language }),
      });
      if (!response.ok) return;
      const body = (await response.json()) as { url?: unknown } | null;
      if (body && typeof body.url === 'string' && body.url) {
        window.location.assign(body.url);
      }
    } catch {
      /* keep the banner usable on error */
    } finally {
      setPending(false);
    }
  }, [pending, language]);

  return (
    <aside
      data-testid="pending-checkout-banner"
      className="border-b-3 border-black bg-neo-lime px-4 py-3"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-neo-display text-sm font-black leading-tight text-black">
            {t('teacher.subscription.pendingCheckoutTitle')}
          </p>
          <p className="mt-0.5 font-neo-body text-xs font-bold text-black/80">
            {t('teacher.subscription.pendingCheckoutBody')}
          </p>
        </div>
        <button
          type="button"
          data-testid="pending-checkout-cta"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            void handleResume();
          }}
          className={CTA_CLASS}
        >
          {t('teacher.subscription.pendingCheckoutCta')}
        </button>
      </div>
    </aside>
  );
}

export default PendingCheckoutBanner;
