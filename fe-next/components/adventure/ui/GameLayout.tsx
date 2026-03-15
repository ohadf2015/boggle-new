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

      {/*
        Main Content Area — takes remaining height, no scroll.
        Layout stack:
          - portrait mobile/tablet: column (grid on top, sidebar strip below)
          - landscape mobile:       row (grid left, sidebar right — same as desktop)
          - desktop (lg+):          row (grid left, sidebar right)
        Landscape detection uses the `landscape` Tailwind variant which maps to
        the @media (orientation: landscape) query.
      */}
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row lg:flex-row relative">
        {/* Grid Area - Main gameplay space, takes priority */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {gridArea}
        </div>

        {/* Sidebar
            - Portrait mobile:  h-16 (64px) compact chip bar
            - Portrait tablet:  h-20 (80px) slightly taller
            - Landscape mobile: full height, w-56 column (mirrors desktop)
            - Desktop (lg+):    full height, w-64 / xl:w-72
        */}
        <div
          className={cn(
            'flex-shrink-0',
            'h-16 md:h-20',
            'landscape:h-full landscape:w-64',
            'lg:h-full lg:w-80 xl:w-96',
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
