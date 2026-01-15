'use client';

import { memo } from 'react';
import { NeoLoader } from './NeoLoader';
import type { MascotVariant } from './Mascot';

interface PageLoaderProps {
  /** Loading variant - mascot-letters shows mascot with bouncing LEXICLASH tiles */
  variant?: 'letters' | 'mascot' | 'dots' | 'mascot-letters';
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Optional text to display below the loader */
  text?: string;
  /** Mascot variant when using mascot or mascot-letters mode */
  mascotVariant?: MascotVariant;
  /**
   * When true, uses flex-1 instead of screen-fit (100dvh).
   * Use nested=true for Suspense fallbacks inside page content.
   * Use nested=false (default) for loading.tsx files.
   */
  nested?: boolean;
}

/**
 * Full-page loader component for page transitions and loading states.
 * Uses the Neo-Brutalist design system with LEXICLASH letter tiles.
 *
 * @example
 * // In a loading.tsx file:
 * export default function Loading() {
 *   return <PageLoader />;
 * }
 *
 * @example
 * // With custom text:
 * <PageLoader text="Loading profile..." variant="mascot" />
 */
export const PageLoader = memo(function PageLoader({
  variant = 'mascot-letters',
  size = 'lg',
  text,
  mascotVariant = 'thinking',
  nested = false,
}: PageLoaderProps) {
  // Use flex-1 for nested Suspense fallbacks, screen-fit for full-page loading.tsx
  const containerClass = nested
    ? 'flex-1 min-h-0 flex items-center justify-center bg-neo-navy'
    : 'screen-fit flex items-center justify-center bg-neo-navy';

  return (
    <div className={containerClass} data-testid="page-loader">
      <NeoLoader
        variant={variant}
        size={size}
        text={text}
        mascotVariant={mascotVariant}
      />
    </div>
  );
});

export default PageLoader;
