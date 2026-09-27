/**
 * SkipLink - Accessible skip navigation link
 *
 * Allows keyboard users to bypass navigation and jump directly to main content.
 * Meets WCAG 2.0 AA / Israeli Standard 5568 requirements.
 *
 * Features:
 * - Visually hidden by default (sr-only)
 * - Becomes visible when focused
 * - Properly manages focus on target element
 * - Neo-brutalist styling when visible
 *
 * @example
 * ```tsx
 * <SkipLink targetId="main-content" t={t}>
 *   {t('accessibility.skipToMain')}
 * </SkipLink>
 * <main id="main-content">...</main>
 * ```
 */

import React, { useCallback } from 'react';

export interface SkipLinkProps {
  /** ID of the target element to skip to */
  targetId: string;
  /** Translation function */
  t: (key: string) => string;
  /** Link text content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SkipLink component for keyboard accessibility
 *
 * @param targetId - ID of the element to skip to (without #)
 * @param t - Translation function (for future extensibility)
 * @param children - Link text content
 * @param className - Additional CSS classes
 */
export function SkipLink({
  targetId,
  t,
  children,
  className = '',
}: SkipLinkProps) {
  /**
   * Handle click/Enter to move focus to target element
   * Sets temporary tabindex on target to make it focusable
   */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement> | React.KeyboardEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      const target = document.getElementById(targetId);
      if (!target) {
        // Target doesn't exist - fail silently
        return;
      }

      // Make the target focusable if it isn't already
      // Use tabindex="-1" so it's focusable but not in tab order
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }

      // Move focus to target
      target.focus();

      // Scroll target into view (if supported - JSDOM doesn't implement this)
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [targetId]
  );

  /**
   * Handle keyboard activation (Enter/Space)
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleClick(e);
      }
    },
    [handleClick]
  );

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        sr-only
        focus:not-sr-only
        focus:absolute
        focus:top-4
        focus:left-4
        focus:z-50
        focus:bg-neo-yellow
        focus:text-black
        focus:p-3
        focus:px-4
        focus:rounded-neo
        focus:border-neo
        focus:border-black
        focus:shadow-hard
        focus:font-neo-body
        focus:font-bold
        focus:text-sm
        focus:outline-hidden
        focus:ring-2
        focus:ring-neo-cyan
        focus:ring-offset-2
        focus:ring-offset-neo-navy
        transition-none
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </a>
  );
}

export default SkipLink;
