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
  /** Optional row rendered directly beneath the header — stays outside the grid/sidebar split so it can't be clipped by the portrait sidebar height cap. */
  belowHeader?: React.ReactNode;
  gridArea: React.ReactNode;
  sidebar: React.ReactNode;
  overlays?: React.ReactNode;
  /** When true, sidebar collapses to give the grid max space (boss fights) */
  isBossActive?: boolean;
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const GameLayout = memo(function GameLayout({
  header,
  belowHeader,
  gridArea,
  sidebar,
  overlays,
  isBossActive = false,
  className,
}: GameLayoutProps) {
  return (
    <div
      className={cn(
        'h-dvh w-full',
        'flex flex-col',
        'overflow-hidden',
        'relative',
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      {/* Header - Fixed height */}
      <div className="shrink-0 z-20">
        {header}
      </div>

      {/* Below-header row — mode-critical strip (e.g. hunt clue boxes) that must stay visible outside the sidebar scroll/cap */}
      {belowHeader && (
        <div className="shrink-0 z-10">
          {belowHeader}
        </div>
      )}

      {/*
        Main Content Area — portrait: column (grid top, sidebar bottom);
        landscape/desktop: row (grid left, sidebar right).
      */}
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row lg:flex-row relative">
        {/* Grid Area - Main gameplay space, takes priority */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {gridArea}
        </div>

        {/*
          Gradient divider — portrait: horizontal rule above sidebar bar;
          landscape/desktop: vertical rule between grid and sidebar column.
        */}
        <div
          className={cn(
            'shrink-0 pointer-events-none',
            'h-px w-full',
            'bg-linear-to-r from-transparent via-neo-white/20 to-transparent',
            'landscape:h-full landscape:w-px landscape:bg-linear-to-b',
            'lg:h-full lg:w-px lg:bg-linear-to-b'
          )}
          aria-hidden="true"
        />

        {/*
          Sidebar — portrait mobile: sits BELOW the grid as a bottom action bar
          filling the space under the square grid.
          Landscape/desktop: right column.
        */}
        <div
          className={cn(
            'shrink-0 transition-all duration-300',
            isBossActive
              ? 'h-0 landscape:w-0 lg:w-0 overflow-hidden opacity-0'
              : [
                  // Portrait: flexible bottom bar — fills remaining space below grid
                  'min-h-20 max-h-48 shrink-2',
                  // Landscape / desktop: full-height column to the right
                  'landscape:h-full landscape:w-64 landscape:max-h-none landscape:min-h-0',
                  'lg:h-full lg:w-80 xl:w-[26rem] 2xl:w-[28rem] lg:max-h-none lg:min-h-0',
                  'overflow-x-auto overflow-y-hidden landscape:overflow-y-auto landscape:overflow-x-hidden',
                  'lg:overflow-y-auto lg:overflow-x-hidden',
                  'opacity-100',
                ],
            'bg-neo-black/20 landscape:bg-neo-black/30 lg:bg-neo-black/30',
            'z-10'
          )}
        >
          {sidebar}
        </div>
      </div>

      {/* Overlays */}
      {overlays}
    </div>
  );
});

GameLayout.displayName = 'GameLayout';

export default GameLayout;
