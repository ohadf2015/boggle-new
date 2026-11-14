'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRO_BANNER_CTA, ProShine } from './pro/ProBanner';

/**
 * A live card trial already turns into $9/mo on its own, so its banners never start
 * another checkout (that would be a second subscription). Their one action is the
 * Polar customer portal, where the teacher keeps, changes or cancels the plan. With
 * no portal link yet, the plan page carries the same controls.
 */
export function TeacherProManageLink({
  portalUrl,
  testId,
  children,
}: {
  portalUrl: string | null | undefined;
  testId: string;
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const external = typeof portalUrl === 'string' && portalUrl.startsWith('https://');
  return (
    <a
      data-testid={testId}
      href={external ? portalUrl : `/${language}/teacher/upgrade`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={PRO_BANNER_CTA}
    >
      <ProShine />
      {children}
    </a>
  );
}
