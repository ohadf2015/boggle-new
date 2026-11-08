'use client';

import type { ReactNode } from 'react';
import { useTeacherProCheckout } from '@/hooks/useTeacherProCheckout';
import { useCheckoutBlockedInApp } from '@/hooks/useCheckoutBlockedInApp';
import type { ProUpgradeSource } from '@/lib/education/proFunnelTelemetry';
import { PRO_BANNER_CTA, ProShine } from './pro/ProBanner';

export function TeacherProCheckoutButton({
  source,
  testId,
  children,
}: {
  source: ProUpgradeSource;
  testId: string;
  children: ReactNode;
}) {
  const { pending, start } = useTeacherProCheckout(source);
  const blockedInApp = useCheckoutBlockedInApp();
  if (blockedInApp) return null;
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        void start();
      }}
      className={PRO_BANNER_CTA}
    >
      <ProShine />
      {children}
    </button>
  );
}
