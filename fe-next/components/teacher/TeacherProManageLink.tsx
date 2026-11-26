'use client';

import { useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRO_BANNER_CTA, ProShine } from './pro/ProBanner';
import { TeacherProCancelIntercept } from './TeacherProCancelIntercept';
import type { CancelInterceptSurface } from '@/lib/education/cancelRetentionTelemetry';

/**
 * A live card trial already turns into $9/mo on its own, so its banners never start
 * another checkout (that would be a second subscription). The billing action is the
 * Polar portal, but a click opens the keep-offer first. Cancel is still one extra
 * tap, and with no portal link the plan page carries the same controls.
 */
export function TeacherProManageLink({
  portalUrl,
  testId,
  children,
  className,
  surface = 'manage_link',
  phase = 'trial',
}: {
  portalUrl: string | null | undefined;
  testId: string;
  children: ReactNode;
  /** Override the chunky CTA look, e.g. a quiet secondary link next to an upgrade button. */
  className?: string;
  surface?: CancelInterceptSurface;
  phase?: 'trial' | 'paid';
}) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const external = typeof portalUrl === 'string' && portalUrl.startsWith('https://');
  const href = external ? portalUrl : `/${language}/teacher/upgrade`;
  const primary = !className;
  return (
    <>
      <a
        data-testid={testId}
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={className ?? PRO_BANNER_CTA}
        onClick={
          external
            ? (event) => {
                event.preventDefault();
                setOpen(true);
              }
            : undefined
        }
      >
        {primary ? <ProShine /> : null}
        {children}
      </a>
      {external && open ? (
        <TeacherProCancelIntercept href={href} phase={phase} surface={surface} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

