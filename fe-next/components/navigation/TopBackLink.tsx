'use client';

/**
 * TopBackLink — a drop-in "back one level" affordance for pages that lack one,
 * including server components (this is a client island). Wraps the design-system
 * BackButton and wires it to useBackOneLevel so back always goes one level up
 * the URL hierarchy.
 *
 * Usage in a server page:
 *   <TopBackLink />                       // parent inferred from the URL
 *   <TopBackLink parent={`/${locale}/education`} />  // explicit parent
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import { BackButton, type BackButtonProps } from '@/components/ui/BackButton';

interface TopBackLinkProps {
  /** Explicit parent path; omit to infer one level up from the current URL. */
  parent?: string;
  /** Override the label; defaults to t('common.back'). */
  label?: string;
  className?: string;
  variant?: BackButtonProps['variant'];
  size?: BackButtonProps['size'];
}

export function TopBackLink({ parent, label, className, variant, size }: TopBackLinkProps) {
  const { t } = useLanguage();
  const goBack = useBackOneLevel(parent);

  return (
    <BackButton
      onClick={goBack}
      label={label ?? t('common.back')}
      className={className}
      variant={variant}
      size={size}
    />
  );
}

export default TopBackLink;
