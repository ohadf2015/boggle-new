'use client';

import { PRO_BANNER_CTA, ProBanner, ProShine } from './pro/ProBanner';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { isCheckoutBlockedInApp } from '@/lib/education/postTeacherProCheckout';

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
    if (isCheckoutBlockedInApp()) {
      toast(t('teacher.subscription.notInApp'));
      return;
    }
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
  }, [pending, language, t]);

  return (
    <ProBanner
      testId="pending-checkout-banner"
      proLabel={t('eduShell.nav.pro')}
      title={t('teacher.subscription.pendingCheckoutTitle')}
      body={t('teacher.subscription.pendingCheckoutBody')}
      action={
        <button
          type="button"
          data-testid="pending-checkout-cta"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            void handleResume();
          }}
          className={PRO_BANNER_CTA}
        >
          <ProShine />
          {t('teacher.subscription.pendingCheckoutCta')}
        </button>
      }
    />
  );
}

export default PendingCheckoutBanner;
