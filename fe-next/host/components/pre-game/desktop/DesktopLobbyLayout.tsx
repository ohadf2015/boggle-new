'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '../../../../lib/utils';

// ==================== Types ====================

export interface DesktopLobbyLayoutProps {
  /** Content for the left column (start button, players, settings) */
  leftContent: React.ReactNode;
  /** Content for the right column (QR, share, chat) */
  rightContent: React.ReactNode;
  /** Additional className for the layout container */
  className?: string;
}

// ==================== Component ====================

/**
 * Two-column desktop layout for the pre-game lobby
 *
 * Layout structure:
 * - Left (7/12): Start button hero, player roster, battle mode settings
 * - Right (5/12): QR code, share pills, battle feed/chat
 *
 * Only rendered at lg: breakpoint (1024px+)
 */
export function DesktopLobbyLayout({
  leftContent,
  rightContent,
  className,
}: DesktopLobbyLayoutProps): React.ReactElement {
  return (
    <m.div
      data-testid="desktop-lobby-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={cn(
        'grid flex-1 min-h-0 p-4 desktop-tall:p-6 xl:desktop-tall:p-8 bg-neo-navy',
        'grid-cols-12',
        'gap-4 desktop-tall:gap-5 xl:desktop-tall:gap-8',
        className
      )}
    >
      {/* Left Column - Hero Start + Players + Settings */}
      <div
        data-testid="desktop-left-column"
        className="col-span-7 xl:col-span-8 flex flex-col gap-5 xl:gap-6 overflow-y-auto overscroll-contain scrollable-area min-h-0"
      >
        {leftContent}
      </div>

      {/* Right Column - QR + Share + Chat */}
      <div
        data-testid="desktop-right-column"
        className="col-span-5 xl:col-span-4 flex flex-col gap-4 overflow-y-auto overscroll-contain scrollable-area min-h-0"
      >
        {rightContent}
      </div>
    </m.div>
  );
}

export default DesktopLobbyLayout;
