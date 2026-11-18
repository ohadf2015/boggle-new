'use client';

import { CreditCard, ExternalLink } from 'lucide-react';
import { billingPortalPath, polarPaymentUpdateUrl } from '@/lib/education/billingPortal';
import { trackRecoveryClicked } from '@/lib/education/proFunnelTelemetry';
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
 * The CTA opens the Polar payment-update page (/{org}/portal/settings) in a new tab
 * when a live session URL is available. Without one it goes to
 * /api/subscription/portal?intent=update-card, which mints a fresh session and
 * lands on that same card form. Never a new checkout.
 */
export function PaymentFailedBanner({ portalUrl, stillPro }: PaymentFailedBannerProps) {
  const { t, language } = useLanguage();
  const label = t('teacher.subscription.paymentFailedCta');
  const deepLink = portalUrl ? polarPaymentUpdateUrl(portalUrl) : null;
  const href = deepLink || portalUrl || `${billingPortalPath(language)}&intent=update-card`;
  const external = Boolean(deepLink || portalUrl);
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
        <a
          data-testid="payment-failed-cta"
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={PRO_BANNER_CTA}
          onClick={() => trackRecoveryClicked({ surface: 'payment_failed_banner' })}
        >
          {label}
          {external ? <ExternalLink className="size-4" aria-hidden="true" /> : null}
        </a>
      }
    />
  );
}

export default PaymentFailedBanner;
