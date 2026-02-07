/**
 * GameLayout Component
 *
 * Full-height responsive layout for the adventure game.
 * Ensures game takes full viewport without empty space.
 */

'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';

// ==============================================
// TYPES
// ==============================================

interface GameLayoutProps {
  header: React.ReactNode;
  gridArea: React.ReactNode;
  sidebar: React.ReactNode;
  overlays?: React.ReactNode;
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const GameLayout = memo(function GameLayout({
  header,
  gridArea,
  sidebar,
  overlays,
  className,
}: GameLayoutProps) {
  return (
    <div
      className={cn(
        // Full viewport height with safe area insets for notched devices
        'h-dvh w-full',
        'flex flex-col',
        'overflow-hidden',
        'relative',
        // Safe area padding for header (notch) and bottom (home indicator)
        'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      {/* Header - Fixed height, flex-shrink-0 */}
      <div className="flex-shrink-0 z-20">
        {header}
      </div>

      {/* Main Content Area - Takes remaining height, no scroll */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative">
        {/* Grid Area - Main gameplay space, takes priority */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {gridArea}
        </div>

        {/* Sidebar - Bottom on mobile (compact), right on desktop */}
        <div
          className={cn(
            'flex-shrink-0',
            // Mobile: compact height to maximize grid space, no scroll
            'max-h-[20vh] lg:max-h-none',
            'lg:h-full lg:w-64 xl:w-72',
            'overflow-hidden lg:overflow-y-auto',
            'z-10'
          )}
        >
          {sidebar}
        </div>
      </div>

      {/* Overlays (Pause, Boss, etc.) */}
      {overlays}
    </div>
  );
});

GameLayout.displayName = 'GameLayout';

export default GameLayout;
