/**
 * GameplayBackground Component
 *
 * A simplified ambient background for active gameplay that is less distracting
 * than the full WorldBackground. Uses subtle gradients and soft glows instead
 * of parallax layers, particles, and textures.
 */

'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
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
 * Get ambient glow colors based on world ID
 * These are soft, non-distracting colors that maintain world identity
 */
function getAmbientColors(worldId: number): { primary: string; secondary: string } {
  const colorMap: Record<number, { primary: string; secondary: string }> = {
    1: { primary: 'rgba(144, 238, 144, 0.08)', secondary: 'rgba(255, 215, 0, 0.05)' }, // Meadows - soft green/gold
    2: { primary: 'rgba(100, 200, 255, 0.08)', secondary: 'rgba(0, 150, 200, 0.05)' }, // Springs - soft cyan/blue
    3: { primary: 'rgba(180, 100, 255, 0.08)', secondary: 'rgba(255, 100, 200, 0.05)' }, // Caverns - soft purple/pink
    4: { primary: 'rgba(255, 180, 100, 0.08)', secondary: 'rgba(255, 140, 50, 0.05)' }, // Desert - soft orange/amber
    5: { primary: 'rgba(100, 200, 150, 0.08)', secondary: 'rgba(50, 180, 120, 0.05)' }, // Forest - soft teal/green
    6: { primary: 'rgba(200, 200, 220, 0.08)', secondary: 'rgba(150, 150, 180, 0.05)' }, // Mountains - soft gray/blue
    7: { primary: 'rgba(255, 150, 180, 0.08)', secondary: 'rgba(255, 100, 150, 0.05)' }, // Palace - soft pink/rose
    8: { primary: 'rgba(100, 150, 255, 0.08)', secondary: 'rgba(150, 100, 255, 0.05)' }, // Nebula - soft blue/violet
    9: { primary: 'rgba(200, 220, 255, 0.08)', secondary: 'rgba(150, 200, 255, 0.05)' }, // Peaks - soft ice blue
    10: { primary: 'rgba(255, 200, 100, 0.08)', secondary: 'rgba(255, 215, 0, 0.05)' }, // Throne - soft gold
  };
  return colorMap[worldId] || colorMap[1];
}

// ==============================================
// MAIN COMPONENT
// ==============================================

const GameplayBackground = memo<GameplayBackgroundProps>(({ className, children }) => {
  const { theme } = useAdventureTheme();
  const worldId = theme?.id || 1;
  const colors = getAmbientColors(worldId);

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden',
        className
      )}
    >
      {/* Base dark gradient - smooth and non-distracting */}
      <div className="absolute inset-0 bg-gradient-to-b from-neo-navy via-slate-900 to-slate-950" />

      {/* Subtle ambient glow - center */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${colors.primary} 0%, transparent 60%)`,
        }}
      />

      {/* Secondary ambient glow - bottom corners for depth */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.3 }}
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, ${colors.secondary} 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, ${colors.secondary} 0%, transparent 50%)
          `,
        }}
      />

      {/* Very subtle vignette for focus on center content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)',
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
