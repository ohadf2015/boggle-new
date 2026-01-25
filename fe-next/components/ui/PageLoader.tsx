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
   * When true, uses min-h-0 for nested flex contexts.
   * Both nested=true and nested=false now use flex-1 to fill parent space.
   * The screen-fit class was removed as it caused centering issues when
   * PageLoader is inside the layout's flex container.
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
  mascotVariant = 'happy',
  nested = false,
}: PageLoaderProps) {
  // Both modes use flex-1 to fill the parent layout's flex container.
  // nested=true adds min-h-0 for deeply nested flex contexts.
  // screen-fit was removed as it caused centering issues (100dvh min-height
  // conflicted with the layout's flex-based sizing).
  const containerClass = nested
    ? 'flex-1 min-h-0 flex items-center justify-center bg-neo-navy'
    : 'flex-1 flex items-center justify-center bg-neo-navy';

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
