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
  4: 'board-frame-archipelago',
  5: 'board-frame-canyon',
  6: 'board-frame-labyrinth',
  7: 'board-frame-palace',
  8: 'board-frame-nebula',
  9: 'board-frame-peaks',
  10: 'board-frame-throne',
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

      case 4: // Archipelago - Palm frond
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 28 Q 8 20, 16 16 Q 10 18, 6 24" stroke="rgba(255, 160, 80, 0.4)" strokeWidth="1.5" fill="rgba(255, 160, 80, 0.1)" />
            <path d="M4 28 Q 12 14, 24 8 Q 14 16, 8 24" stroke="rgba(255, 180, 100, 0.35)" strokeWidth="1" fill="none" />
            <circle cx="24" cy="8" r="2.5" fill="rgba(255, 200, 50, 0.25)" />
          </svg>
        );

      case 5: // Canyon - Rock layers
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M2 28 L8 20 L14 24 L20 18 L28 22 L28 28 Z" fill="rgba(200, 80, 40, 0.15)" stroke="rgba(200, 80, 40, 0.3)" strokeWidth="1" />
            <path d="M4 24 L10 18 L16 22 L22 16 L26 20" stroke="rgba(255, 120, 60, 0.25)" strokeWidth="1" fill="none" />
          </svg>
        );

      case 6: // Labyrinth - Maze pattern
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 4 L16 4 L16 12 L8 12 L8 20 L16 20" stroke="rgba(255, 100, 180, 0.35)" strokeWidth="1.5" fill="none" />
            <path d="M28 28 L16 28 L16 20 L24 20 L24 12 L16 12" stroke="rgba(200, 100, 255, 0.25)" strokeWidth="1" fill="none" />
          </svg>
        );

      case 7: // Palace - Mirror shard
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <polygon points="4,16 16,4 20,12 8,20" fill="rgba(140, 200, 255, 0.12)" stroke="rgba(140, 200, 255, 0.35)" strokeWidth="1" />
            <polygon points="12,16 20,8 24,16 16,24" fill="rgba(200, 230, 255, 0.08)" stroke="rgba(200, 230, 255, 0.25)" strokeWidth="0.5" />
            <line x1="10" y1="8" x2="18" y2="16" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          </svg>
        );

      case 8: // Nebula - Star cluster
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="8" cy="8" r="1.5" fill="rgba(160, 120, 255, 0.5)" />
            <circle cx="20" cy="6" r="1" fill="rgba(200, 160, 255, 0.4)" />
            <circle cx="14" cy="16" r="2" fill="rgba(100, 80, 255, 0.3)" />
            <circle cx="24" cy="20" r="1.5" fill="rgba(180, 100, 255, 0.35)" />
            <circle cx="6" cy="22" r="0.8" fill="rgba(255, 200, 255, 0.3)" />
            <circle cx="14" cy="16" r="6" fill="rgba(100, 80, 255, 0.06)" />
          </svg>
        );

      case 9: // Peaks - Mountain silhouette
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M2 28 L10 12 L14 18 L20 8 L28 28 Z" fill="rgba(50, 200, 180, 0.1)" stroke="rgba(50, 200, 180, 0.3)" strokeWidth="1" />
            <path d="M16 8 L18 12 L20 8" fill="rgba(200, 255, 230, 0.15)" />
          </svg>
        );

      case 10: // Throne - Crown ornament
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 24 L4 12 L10 18 L16 8 L22 18 L28 12 L28 24 Z" fill="rgba(255, 200, 50, 0.15)" stroke="rgba(255, 200, 50, 0.4)" strokeWidth="1" />
            <circle cx="16" cy="10" r="2" fill="rgba(255, 200, 50, 0.3)" />
            <circle cx="8" cy="14" r="1.5" fill="rgba(255, 180, 30, 0.25)" />
            <circle cx="24" cy="14" r="1.5" fill="rgba(255, 180, 30, 0.25)" />
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
        'w-10 h-10',
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
  // Always call useContext unconditionally (Rules of Hooks), then check if value is null
  const adventureTheme = React.useContext(AdventureThemeContext);
  const worldId = adventureTheme?.worldId || 1;

  const frameClass = WORLD_FRAME_CLASSES[worldId] || WORLD_FRAME_CLASSES[1];

  // World-specific border shadow glow — subtle colored shadow behind the hard shadow
  const WORLD_GLOW: Record<number, string> = {
    1: '0 0 20px rgba(144, 238, 144, 0.15)',
    2: '0 0 20px rgba(0, 220, 255, 0.15)',
    3: '0 0 20px rgba(160, 80, 255, 0.18)',
    4: '0 0 20px rgba(255, 160, 80, 0.15)',
    5: '0 0 20px rgba(255, 100, 60, 0.15)',
    6: '0 0 20px rgba(255, 100, 180, 0.15)',
    7: '0 0 20px rgba(140, 200, 255, 0.18)',
    8: '0 0 20px rgba(100, 80, 255, 0.20)',
    9: '0 0 20px rgba(50, 200, 180, 0.15)',
    10: '0 0 20px rgba(255, 200, 50, 0.18)',
  };

  return (
    <div
      className={cn(
        'board-frame',
        frameClass,
        'relative',
        'bg-neo-cream border-4 border-neo-black shadow-hard-lg rounded-neo-lg p-2',
        className
      )}
      style={{ boxShadow: `4px 4px 0px black, ${WORLD_GLOW[worldId] || WORLD_GLOW[1]}` }}
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
