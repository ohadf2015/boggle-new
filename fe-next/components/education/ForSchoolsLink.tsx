'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * Where a "For schools" link sits. One `landing_cta_clicked {cta: 'for_schools', placement}`
 * per tap — trackGrowthEvent persists it cookie-free to analytics_events as well as to
 * (consent-gated) PostHog, so the school funnel reads per placement.
 */
export const FOR_SCHOOLS_PLACEMENTS = [
  'education_header',
  'education_school_section',
  'teacher_menu',
  'teacher_menu_mobile',
  'teacher_profile',
] as const;
export type ForSchoolsPlacement = (typeof FOR_SCHOOLS_PLACEMENTS)[number];

export function forSchoolsHref(locale: string): string {
  return `/${locale}/education/for-schools`;
}

export function trackForSchoolsClick(placement: ForSchoolsPlacement): void {
  try {
    trackGrowthEvent('landing_cta_clicked', { cta: 'for_schools', placement });
  } catch {
    /* analytics never blocks navigation */
  }
}

export interface ForSchoolsLinkProps {
  placement: ForSchoolsPlacement;
  className?: string;
  /** Defaults to an icon + "For schools & districts". */
  children?: ReactNode;
  onNavigate?: () => void;
  testId?: string;
  role?: string;
}

/** Tracked internal link to /education/for-schools in the current locale. */
export function ForSchoolsLink({ placement, className, children, onNavigate, testId, role }: ForSchoolsLinkProps) {
  const { t, language } = useLanguage();
  return (
    <Link
      href={forSchoolsHref(language)}
      data-testid={testId ?? `for-schools-link-${placement}`}
      data-placement={placement}
      role={role}
      onClick={() => {
        trackForSchoolsClick(placement);
        onNavigate?.();
      }}
      className={className}
    >
      {children ?? (
        <>
          <Building2 className="size-4 shrink-0" aria-hidden="true" />
          <span>{t('education.landing.districtCta.title')}</span>
        </>
      )}
    </Link>
  );
}

export default ForSchoolsLink;
