'use client';

import React from 'react';
import { cn } from '../../lib/utils';

interface GamePageWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** Whether to include safe area padding */
  useSafeArea?: boolean;
}

/**
 * Base layout wrapper for all game views.
 * Provides consistent Neo-Brutalist background and padding.
 */
export function GamePageWrapper({
  children,
  className,
  useSafeArea = true,
}: GamePageWrapperProps) {
  return (
    <div
      className={cn(
        'bg-neo-page flex flex-col',
        useSafeArea && 'safe-area-inset',
        className
      )}
    >
      {children}
    </div>
  );
}

export default GamePageWrapper;
