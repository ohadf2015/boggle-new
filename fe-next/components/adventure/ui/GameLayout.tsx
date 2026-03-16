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
        {/*
          Sidebar — on portrait mobile/tablet it sits ABOVE the grid so
          objectives are always visible (not clipped below).
          On landscape/desktop it stays as a right column.
        */}
        <div
          className={cn(
            'flex-shrink-0',
            // Portrait: compact bar above grid (visible objectives)
            'h-16 md:h-20',
            // Landscape / desktop: full-height column to the right (order-last)
            'landscape:h-full landscape:w-64 landscape:order-last',
            'lg:h-full lg:w-80 xl:w-96 lg:order-last',
            'overflow-x-auto overflow-y-hidden landscape:overflow-y-auto landscape:overflow-x-hidden',
            'lg:overflow-y-auto lg:overflow-x-hidden',
            'bg-neo-black/20 landscape:bg-neo-black/30 lg:bg-neo-black/30',
            'z-10'
          )}
        >
          {sidebar}
        </div>

        {/*
          Gradient divider — portrait: horizontal rule below sidebar chip bar;
          landscape/desktop: vertical rule between grid and sidebar column.
        */}
        <div
          className={cn(
            'flex-shrink-0 pointer-events-none',
            'h-px w-full',
            'bg-gradient-to-r from-transparent via-neo-white/20 to-transparent',
            'landscape:h-full landscape:w-px landscape:bg-gradient-to-b',
            'lg:h-full lg:w-px lg:bg-gradient-to-b'
          )}
          aria-hidden="true"
        />

        {/* Grid Area - Main gameplay space, takes remaining height */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {gridArea}
        </div>
      </div>

      {/* Overlays (Pause, Boss, etc.) */}
      {overlays}
    </div>
  );
});

GameLayout.displayName = 'GameLayout';

export default GameLayout;
