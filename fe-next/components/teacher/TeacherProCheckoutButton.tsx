'use client';

import type { ReactNode } from 'react';
import { useTeacherProCheckout } from '@/hooks/useTeacherProCheckout';
import type { ProUpgradeSource } from '@/lib/education/proFunnelTelemetry';

const CTA_CLASS =
  'inline-flex shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-black px-4 py-2 font-neo-display text-sm font-black text-white shadow-hard hover:-translate-y-0.5 disabled:opacity-60';

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
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => {
        void start();
      }}
      className={CTA_CLASS}
    >
      {children}
    </button>
  );
}
