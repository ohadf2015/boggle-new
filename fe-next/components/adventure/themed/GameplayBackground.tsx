/**
 * GameplayBackground Component
 *
 * World-themed background for active gameplay.
 * Uses world-specific gradients, ambient glows, and tinted vignettes
 * to create unique atmosphere per world while keeping the grid as focal point.
 *
 * Performance: CSS-only — no JS animations, no parallax, minimal DOM.
 */

'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useAdventureTheme } from '@/contexts/AdventureThemeContext';
import MarginParticles from './MarginParticles';

// ==============================================
// TYPES
// ==============================================

interface GameplayBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

// ==============================================
// WORLD-SPECIFIC ATMOSPHERE CONFIG
// ==============================================

interface WorldAtmosphere {
  /** 3-stop gradient: top, mid, bottom */
  gradient: [string, string, string];
  /** Ambient glow color (radial, center-ish) */
  ambientGlow: string;
  /** Vignette edge tint color */
  vignetteColor: string;
  /** Secondary ambient glow (offset position) for depth */
  secondaryGlow?: string;
}

const WORLD_ATMOSPHERES: Record<number, WorldAtmosphere> = {
  1: { // Meadows — warm green pastoral
    gradient: ['#1a2e1a', '#0f2a18', '#061a0b'],
    ambientGlow: 'rgba(144, 238, 144, 0.12)',
    vignetteColor: 'rgba(34, 60, 20, 0.45)',
    secondaryGlow: 'rgba(255, 215, 0, 0.05)',
  },
  2: { // Springs — cool cyan water
    gradient: ['#1a1a2e', '#0a2a3a', '#061a2a'],
    ambientGlow: 'rgba(0, 220, 255, 0.10)',
    vignetteColor: 'rgba(0, 40, 60, 0.50)',
    secondaryGlow: 'rgba(100, 200, 255, 0.06)',
  },
  3: { // Caverns — deep purple crystal
    gradient: ['#1a1a2e', '#1a0a2e', '#120620'],
    ambientGlow: 'rgba(160, 80, 255, 0.12)',
    vignetteColor: 'rgba(40, 10, 60, 0.50)',
    secondaryGlow: 'rgba(255, 100, 200, 0.05)',
  },
  4: { // Archipelago — warm tropical sunset
    gradient: ['#2e1a1a', '#2a1a0a', '#1a1208'],
    ambientGlow: 'rgba(255, 160, 80, 0.12)',
    vignetteColor: 'rgba(60, 30, 10, 0.45)',
    secondaryGlow: 'rgba(255, 220, 100, 0.06)',
  },
  5: { // Canyon — dusty red desert
    gradient: ['#2e1a1a', '#2a1510', '#1a0a08'],
    ambientGlow: 'rgba(255, 100, 60, 0.10)',
    vignetteColor: 'rgba(60, 15, 5, 0.50)',
    secondaryGlow: 'rgba(255, 150, 50, 0.06)',
  },
  6: { // Labyrinth — surreal pink maze
    gradient: ['#2e1a2a', '#1a0a1a', '#120812'],
    ambientGlow: 'rgba(255, 100, 180, 0.10)',
    vignetteColor: 'rgba(50, 10, 40, 0.50)',
    secondaryGlow: 'rgba(200, 100, 255, 0.05)',
  },
  7: { // Mirror Palace — icy silver blue
    gradient: ['#1a2030', '#0a1a2a', '#081520'],
    ambientGlow: 'rgba(140, 200, 255, 0.12)',
    vignetteColor: 'rgba(10, 30, 50, 0.50)',
    secondaryGlow: 'rgba(200, 230, 255, 0.06)',
  },
  8: { // Nebula — deep cosmic indigo
    gradient: ['#0a0a20', '#10082a', '#080418'],
    ambientGlow: 'rgba(100, 80, 255, 0.14)',
    vignetteColor: 'rgba(20, 5, 50, 0.55)',
    secondaryGlow: 'rgba(180, 100, 255, 0.06)',
  },
  9: { // Peaks — aurora teal
    gradient: ['#0a1a1a', '#0a2020', '#061815'],
    ambientGlow: 'rgba(50, 200, 180, 0.12)',
    vignetteColor: 'rgba(5, 30, 30, 0.50)',
    secondaryGlow: 'rgba(100, 255, 200, 0.05)',
  },
  10: { // Throne — regal gold
    gradient: ['#2a2010', '#1a1508', '#0a0a05'],
    ambientGlow: 'rgba(255, 200, 50, 0.14)',
    vignetteColor: 'rgba(50, 30, 5, 0.50)',
    secondaryGlow: 'rgba(255, 150, 30, 0.06)',
  },
};

// ==============================================
// MAIN COMPONENT
// ==============================================

const GameplayBackground = memo<GameplayBackgroundProps>(({ className, children }) => {
  const { theme } = useAdventureTheme();
  const worldId = theme?.id || 1;
  const atm = WORLD_ATMOSPHERES[worldId] || WORLD_ATMOSPHERES[1];

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden',
        className
      )}
    >
      {/* Combined CSS background: vignette + dual ambient glows + world gradient.
          Single DOM element, GPU-composited, zero JS animation cost. */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            // Layer 1: World-tinted vignette — darkens edges, draws eye to center
            `radial-gradient(ellipse at center, transparent 40%, ${atm.vignetteColor} 100%)`,
            // Layer 2: Primary ambient glow — world color, center-top
            `radial-gradient(ellipse at 50% 35%, ${atm.ambientGlow} 0%, transparent 55%)`,
            // Layer 3: Secondary ambient glow — offset for depth
            atm.secondaryGlow
              ? `radial-gradient(ellipse at 30% 70%, ${atm.secondaryGlow} 0%, transparent 45%)`
              : 'none',
            // Layer 4: World-specific gradient base
            `linear-gradient(to bottom, ${atm.gradient[0]} 0%, ${atm.gradient[1]} 50%, ${atm.gradient[2]} 100%)`,
          ].filter(l => l !== 'none').join(', '),
        }}
      />

      {/* Margin-only ambient particles — never cross the grid */}
      <MarginParticles worldId={worldId} className="z-5" />

      {/* Content layer */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
});

GameplayBackground.displayName = 'GameplayBackground';

export default GameplayBackground;
