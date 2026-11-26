'use client';

import { useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRO_BANNER_CTA, ProShine } from './pro/ProBanner';
import { TeacherCancelOfferDialog } from './TeacherCancelOfferDialog';

/**
 * A live card trial already turns into $9/mo on its own, so its banners never start
 * another checkout (that would be a second subscription). Their one action is the
 * Polar customer portal, where the teacher keeps, changes or cancels the plan. With
 * no portal link yet, the plan page carries the same controls.
 *
 * The click no longer navigates straight to the raw cancel: an active or trialing
 * Teacher Pro teacher first gets the retention interstitial (pause 1 month / 50%
 * off 3 months, one click each, on the existing Polar subscription). Continuing to
 * cancellation from there lands on this same href — the portal, or the plan page.
 */
export function TeacherProManageLink({
  portalUrl,
  testId,
  children,
  className,
  status = 'trialing',
  onApplied,
}: {
  portalUrl: string | null | undefined;
  testId: string;
  children: ReactNode;
  /** Override the chunky CTA look, e.g. a quiet secondary link next to an upgrade button. */
  className?: string;
  /** Provider status of the live plan, for the offer events. Trial banners are 'trialing'. */
  status?: string;
  /** Called when a retention offer was applied — e.g. re-read the plan (the trial end moved). */
  onApplied?: () => void;
}) {
  const { language } = useLanguage();
  const [offerOpen, setOfferOpen] = useState(false);
  const external = typeof portalUrl === 'string' && portalUrl.startsWith('https://');
  const href = external ? portalUrl : `/${language}/teacher/upgrade`;
  const primary = !className;
  return (
    <>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOfferOpen(true)}
        className={className ?? PRO_BANNER_CTA}
      >
        {primary ? <ProShine /> : null}
        {children}
      </button>
      {offerOpen ? (
        <TeacherCancelOfferDialog
          status={status}
          manageHref={href}
          external={external}
          onClose={(reason) => {
            setOfferOpen(false);
            if (reason === 'applied') onApplied?.();
          }}
        />
      ) : null}
    </>
  );
}
