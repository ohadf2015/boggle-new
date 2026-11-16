'use client';

import { CreditCard, ExternalLink } from 'lucide-react';
import { billingPortalPath } from '@/lib/education/billingPortal';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRO_BANNER_CTA, ProBanner } from './pro/ProBanner';

export interface PaymentFailedBannerProps {
  /** Polar customer portal (update card in one step). Null when the status read could not mint one. */
  portalUrl: string | null;
  /** Still inside the past-due grace window, so Pro is on for now. */
  stillPro: boolean;
}

/**
 * A paying teacher whose renewal was declined (Polar `past_due`).
 *
 * The dunning email can land in spam or a school filter; without this the
 * teacher only finds out when Pro switches off. Non-dismissible account state,
 * like the pending-checkout banner: it clears on its own once the card is fixed
 * and Polar flips the subscription back to active.
 *
 * The CTA opens the Polar customer portal in a new tab. Without a portal URL it
 * goes to /api/subscription/portal, which mints a fresh portal session on the click.
 */
export function PaymentFailedBanner({ portalUrl, stillPro }: PaymentFailedBannerProps) {
  const { t, language } = useLanguage();
  const label = t('teacher.subscription.paymentFailedCta');
  return (
    <ProBanner
      testId="payment-failed-banner"
      tone="urgent"
      role="status"
      proLabel={t('eduShell.nav.pro')}
      title={t('teacher.subscription.paymentFailedTitle')}
      body={t(stillPro ? 'teacher.subscription.paymentFailedBody' : 'teacher.subscription.paymentFailedBodyPaused')}
      lead={<CreditCard className="size-8 shrink-0 text-neo-pink" aria-hidden="true" />}
      action={
        portalUrl ? (
          <a data-testid="payment-failed-cta" href={portalUrl} target="_blank" rel="noopener noreferrer" className={PRO_BANNER_CTA}>
            {label}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : (
          // Never the upgrade page: a new checkout would be a second subscription while Polar
          // retries this one. The stable route mints a fresh portal session on the click.
          <a data-testid="payment-failed-cta" href={billingPortalPath(language)} className={PRO_BANNER_CTA}>
            {label}
          </a>
        )
      }
    />
  );
}

export default PaymentFailedBanner;
