'use client';

import Link from 'next/link';
import { trackTeacherProUpgradeClick, type TeacherProUpgradePlacement } from '@/lib/education/proFunnelTelemetry';

/** Client Link that fires teacher_pro_upgrade_click before navigating. */
export function TeacherProUpgradeLink({
  href,
  locale,
  placement,
  className,
  children,
  testId,
}: {
  href: string;
  locale: string;
  placement: TeacherProUpgradePlacement;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={className}
      onClick={() => {
        try {
          trackTeacherProUpgradeClick({
            page: typeof window !== 'undefined' ? window.location.pathname : href,
            locale,
            placement,
          });
        } catch {
          /* analytics must never block */
        }
      }}
    >
      {children}
    </Link>
  );
}
