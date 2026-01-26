/**
 * GameplayBackground Component
 *
 * Single-layer static background for active gameplay.
 * Performance optimized: No parallax, no animations, minimal DOM elements.
 * All gradients combined into a single CSS background for best performance.
 */

'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useAdventureTheme } from '@/contexts/AdventureThemeContext';

// ==============================================
// TYPES
// ==============================================

interface GameplayBackgroundProps {
  /** Additional CSS classes */
  className?: string;
  /** Children to render on top of background */
  children?: React.ReactNode;
}

// ==============================================
// WORLD-SPECIFIC AMBIENT COLORS
// ==============================================

/**
 * Get ambient glow color based on world ID
 * Single color for simplified single-layer background
 */
function getAmbientColor(worldId: number): string {
  const colorMap: Record<number, string> = {
    1: 'rgba(144, 238, 144, 0.06)',  // Meadows - soft green
    2: 'rgba(100, 200, 255, 0.06)',  // Springs - soft cyan
    3: 'rgba(180, 100, 255, 0.06)',  // Caverns - soft purple
    4: 'rgba(255, 180, 100, 0.06)',  // Desert - soft orange
    5: 'rgba(100, 200, 150, 0.06)',  // Forest - soft teal
    6: 'rgba(200, 200, 220, 0.06)',  // Mountains - soft gray
    7: 'rgba(255, 150, 180, 0.06)',  // Palace - soft pink
    8: 'rgba(100, 150, 255, 0.06)',  // Nebula - soft blue
    9: 'rgba(200, 220, 255, 0.06)',  // Peaks - soft ice blue
    10: 'rgba(255, 200, 100, 0.06)', // Throne - soft gold
  };
  return colorMap[worldId] || colorMap[1];
}

// ==============================================
// MAIN COMPONENT
// ==============================================

const GameplayBackground = memo<GameplayBackgroundProps>(({ className, children }) => {
  const { theme } = useAdventureTheme();
  const worldId = theme?.id || 1;
  const ambientColor = getAmbientColor(worldId);

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden',
        className
      )}
    >
      {/* Single unified background layer - combines gradient, ambient glow, and vignette
          Performance: Single DOM element with combined CSS background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.25) 100%),
            radial-gradient(ellipse at 50% 40%, ${ambientColor} 0%, transparent 50%),
            linear-gradient(to bottom, #1a1a2e 0%, #0f172a 50%, #020617 100%)
          `,
        }}
      />

      {/* Content layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
});

GameplayBackground.displayName = 'GameplayBackground';

export default GameplayBackground;
