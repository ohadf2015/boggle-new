/**
 * BoardFrame Component
 *
 * Wraps the adventure game grid with world-themed decorations.
 * Adds corner decorations specific to each world (vines, water splashes, crystals).
 */

'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { AdventureThemeContext } from '@/contexts/AdventureThemeContext';

// ==============================================
// TYPES
// ==============================================

interface BoardFrameProps {
  /** Child content (typically AdventureGrid) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const WORLD_FRAME_CLASSES: Record<number, string> = {
  1: 'board-frame-meadows',
  2: 'board-frame-springs',
  3: 'board-frame-caverns',
};

// ==============================================
// CORNER DECORATION COMPONENT
// ==============================================

interface CornerDecorProps {
  worldId: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const CornerDecor = memo<CornerDecorProps>(({ worldId, position }) => {
  // Calculate rotation based on position
  const rotation = {
    'top-left': 0,
    'top-right': 90,
    'bottom-right': 180,
    'bottom-left': 270,
  }[position];

  // Position classes
  const positionClasses = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
  }[position];

  // Render world-specific decoration
  const renderDecoration = () => {
    switch (worldId) {
      case 1: // Meadows - Vine curl
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M2 2 Q 10 2, 16 8 T 30 30"
              stroke="rgba(190, 255, 0, 0.4)"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="16" cy="8" r="2" fill="rgba(190, 255, 0, 0.3)" />
            <circle cx="24" cy="16" r="2" fill="rgba(190, 255, 0, 0.3)" />
          </svg>
        );

      case 2: // Springs - Water splash
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="8" fill="rgba(0, 255, 255, 0.15)" />
            <circle cx="16" cy="16" r="12" fill="rgba(0, 255, 255, 0.08)" />
            <circle cx="8" cy="8" r="4" fill="rgba(0, 255, 255, 0.12)" />
            <circle cx="24" cy="24" r="4" fill="rgba(0, 255, 255, 0.12)" />
          </svg>
        );

      case 3: // Caverns - Crystal cluster
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <polygon
              points="16,2 20,12 28,16 20,20 16,30 12,20 4,16 12,12"
              fill="rgba(139, 92, 246, 0.2)"
              stroke="rgba(139, 92, 246, 0.4)"
              strokeWidth="1"
            />
            <polygon
              points="8,4 12,10 18,12 12,14 8,20 4,14 2,10 4,8"
              fill="rgba(139, 92, 246, 0.15)"
            />
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'absolute pointer-events-none',
        'w-8 h-8',
        positionClasses
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      {renderDecoration()}
    </div>
  );
});

CornerDecor.displayName = 'CornerDecor';

// ==============================================
// BOARD FRAME COMPONENT
// ==============================================

const BoardFrame = memo<BoardFrameProps>(({ children, className }) => {
  // Use context directly to allow usage both inside and outside AdventureThemeProvider
  const adventureTheme = AdventureThemeContext ? React.useContext(AdventureThemeContext) : null;
  const worldId = adventureTheme?.worldId || 1;

  const frameClass = WORLD_FRAME_CLASSES[worldId] || WORLD_FRAME_CLASSES[1];

  return (
    <div
      className={cn(
        'board-frame',
        frameClass,
        'relative',
        className
      )}
      data-world={worldId}
    >
      {/* Corner decorations */}
      <CornerDecor worldId={worldId} position="top-left" />
      <CornerDecor worldId={worldId} position="top-right" />
      <CornerDecor worldId={worldId} position="bottom-left" />
      <CornerDecor worldId={worldId} position="bottom-right" />

      {/* Grid content */}
      {children}
    </div>
  );
});

BoardFrame.displayName = 'BoardFrame';

export default BoardFrame;
