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
}: PageLoaderProps) {
  return (
    <div className="screen-fit flex items-center justify-center bg-neo-navy">
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
