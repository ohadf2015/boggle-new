/**
 * SkipLinks - Container for multiple skip navigation links
 *
 * Provides a set of skip links for keyboard users to bypass navigation
 * and jump directly to different sections of the page.
 *
 * Meets WCAG 2.0 AA / Israeli Standard 5568 requirements.
 *
 * @example
 * ```tsx
 * // In layout.tsx - must be first in body
 * <SkipLinks />
 * <header>...</header>
 * <main id="main-content">...</main>
 * ```
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SkipLink } from './SkipLink';

export interface SkipLinksProps {
  /** Whether to show navigation skip link (default: true) */
  showNavLink?: boolean;
  /** Whether to show search skip link (default: false) */
  showSearchLink?: boolean;
  /** Custom main content target ID (default: 'main-content') */
  mainContentId?: string;
  /** Custom navigation target ID (default: 'main-nav') */
  navId?: string;
  /** Custom search target ID (default: 'search-input') */
  searchId?: string;
}

/**
 * SkipLinks container component
 *
 * Renders a group of skip links for keyboard accessibility.
 * Must be placed as the first focusable element in the DOM.
 */
export function SkipLinks({
  showNavLink = true,
  showSearchLink = false,
  mainContentId = 'main-content',
  navId = 'main-nav',
  searchId = 'search-input',
}: SkipLinksProps) {
  const { t } = useLanguage();

  return (
    <div className="skip-links" role="navigation" aria-label={t('accessibility.skipLinks.skipToMain')}>
      {/* Main content skip link - always shown */}
      <SkipLink targetId={mainContentId} t={t}>
        {t('accessibility.skipLinks.skipToMain')}
      </SkipLink>

      {/* Navigation skip link - optional */}
      {showNavLink && (
        <SkipLink targetId={navId} t={t}>
          {t('accessibility.skipLinks.skipToNav')}
        </SkipLink>
      )}

      {/* Search skip link - optional */}
      {showSearchLink && (
        <SkipLink targetId={searchId} t={t}>
          {t('accessibility.skipLinks.skipToSearch')}
        </SkipLink>
      )}
    </div>
  );
}

export default SkipLinks;
