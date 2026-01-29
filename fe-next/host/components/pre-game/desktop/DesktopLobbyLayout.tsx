'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';

// ==================== Types ====================

export interface DesktopLobbyLayoutProps {
  /** Content for the left column (settings, controls) */
  leftContent: React.ReactNode;
  /** Content for the center column (hero, invite, start) */
  centerContent: React.ReactNode;
  /** Content for the right column (players, chat) */
  rightContent: React.ReactNode;
  /** Additional className for the layout container */
  className?: string;
}

// ==================== Component ====================

/**
 * Three-column desktop layout for the pre-game lobby
 *
 * Layout structure:
 * - Left (300px): Settings panel, bot controls
 * - Center (flexible): Game preview, invite card, start button
 * - Right (320px): Player list, chat
 *
 * Only rendered at lg: breakpoint (1024px+)
 */
export function DesktopLobbyLayout({
  leftContent,
  centerContent,
  rightContent,
  className,
}: DesktopLobbyLayoutProps): React.ReactElement {
  return (
    <motion.div
      data-testid="desktop-lobby-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        // Base grid layout with responsive columns
        'grid h-full p-6 bg-neo-navy',
        // Responsive grid columns: slightly wider sidebars on larger screens
        'grid-cols-[300px_1fr_320px]',
        'xl:grid-cols-[320px_1fr_360px]',
        '2xl:grid-cols-[360px_1fr_400px]',
        // Responsive gap: scales with viewport
        'gap-4 lg:gap-5 xl:gap-6',
        className
      )}
    >
      {/* Left Column - Settings & Controls */}
      <aside
        data-testid="desktop-left-column"
        className="flex flex-col gap-4 overflow-y-auto overscroll-contain scrollable-area min-h-0"
      >
        {leftContent}
      </aside>

      {/* Center Column - Hero/Preview Area */}
      <main
        data-testid="desktop-center-column"
        className="flex flex-col items-center justify-start gap-6 overflow-y-auto overscroll-contain scrollable-area min-h-0"
      >
        {/* Constrained content wrapper - prevents stretching on ultra-wide screens */}
        <div className="w-full max-w-3xl mx-auto px-2">
          {centerContent}
        </div>
      </main>

      {/* Right Column - Players & Chat */}
      <aside
        data-testid="desktop-right-column"
        className="flex flex-col gap-4 overflow-hidden min-h-0"
      >
        {rightContent}
      </aside>
    </motion.div>
  );
}

export default DesktopLobbyLayout;
