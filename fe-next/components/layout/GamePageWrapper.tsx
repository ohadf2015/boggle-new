'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface GamePageWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Whether to include safe area padding (for notched devices) */
  useSafeArea?: boolean;
}

/**
 * Base layout wrapper for all game views.
 * Provides consistent Neo-Brutalist background and padding.
 *
 * Uses CSS custom properties set by NativeAppProvider:
 * - --cap-safe-area-top (e.g., 47px on iPhone notch)
 * - --cap-safe-area-bottom (e.g., 34px on iPhone home indicator)
 * - --cap-safe-area-left (0 in portrait)
 * - --cap-safe-area-right (0 in portrait)
 */
export function GamePageWrapper({
  children,
  className,
  useSafeArea = true,
}: GamePageWrapperProps) {
  return (
    <div
      className={cn('bg-neo-page flex flex-col', className)}
      style={useSafeArea ? {
        paddingTop: 'var(--cap-safe-area-top, 0px)',
        paddingBottom: 'var(--cap-safe-area-bottom, 0px)',
        paddingLeft: 'var(--cap-safe-area-left, 0px)',
        paddingRight: 'var(--cap-safe-area-right, 0px)',
      } : undefined}
    >
      {children}
    </div>
  );
}

export default GamePageWrapper;
