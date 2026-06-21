/**
 * GameplayBackground Component
 *
 * World-themed background for active gameplay.
 *
 * Neo-brutalist atmosphere: bold FLAT color bands (hard horizon split) + a crisp
 * halftone dot texture + a hard graphic horizon line. This delivers per-world mood
 * through brand-native technique — NOT soft radial glows / vignette haze, which the
 * design system bans (no blur, no glassmorphism). The cream tiles pop against the
 * flat fields; the halftone gives the "arcade cabinet / graphic novel" grain.
 *
 * Performance: CSS-only — no JS animations, no parallax, ~3 static divs.
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

export interface WorldAtmosphere {
  /** Two flat color bands: [sky, ground]. Rendered as a hard-stop split — no gradient haze. */
  bands: [string, string];
  /** Percentage down the screen where the hard horizon split sits (0–100). */
  splitAt: number;
  /** Halftone dot color (rgba) — world-tinted graphic grain. */
  halftone: string;
  /** Hard graphic horizon accent line color. */
  horizon: string;
}

// ==============================================
// WORLD-SPECIFIC ATMOSPHERE CONFIG
// ==============================================

const WORLD_ATMOSPHERES: Record<number, WorldAtmosphere> = {
  1: { bands: ['#0e3b1f', '#07260f'], splitAt: 55, halftone: 'rgba(191,255,0,0.16)', horizon: '#06160b' }, // Meadows — lime green
  2: { bands: ['#0a3a4e', '#06222e'], splitAt: 55, halftone: 'rgba(0,255,255,0.15)', horizon: '#04101a' }, // Springs — cyan water
  3: { bands: ['#241040', '#14082a'], splitAt: 52, halftone: 'rgba(139,92,246,0.18)', horizon: '#0a0418' }, // Caverns — purple crystal
  4: { bands: ['#3a1e0c', '#241208'], splitAt: 55, halftone: 'rgba(255,107,53,0.15)', horizon: '#160a04' }, // Archipelago — tropical orange
  5: { bands: ['#3a160e', '#240c08'], splitAt: 58, halftone: 'rgba(255,80,50,0.14)', horizon: '#160604' }, // Canyon — red desert
  6: { bands: ['#3a1030', '#20081a'], splitAt: 52, halftone: 'rgba(255,20,147,0.14)', horizon: '#160812' }, // Labyrinth — pink maze
  7: { bands: ['#14304e', '#0a1c30'], splitAt: 55, halftone: 'rgba(140,200,255,0.16)', horizon: '#061018' }, // Mirror Palace — icy blue
  8: { bands: ['#160a3a', '#0a0620'], splitAt: 50, halftone: 'rgba(139,92,246,0.18)', horizon: '#060418' }, // Nebula — cosmic indigo
  9: { bands: ['#0a3434', '#062020'], splitAt: 55, halftone: 'rgba(50,220,200,0.15)', horizon: '#041514' }, // Peaks — aurora teal
  10: { bands: ['#3a2c0a', '#241a06'], splitAt: 55, halftone: 'rgba(255,225,53,0.16)', horizon: '#160f04' }, // Throne — regal gold
};

/**
 * Get the flat-band atmosphere config for a world. Falls back to World 1.
 */
export function getWorldAtmosphere(worldId: number): WorldAtmosphere {
  return WORLD_ATMOSPHERES[worldId] || WORLD_ATMOSPHERES[1];
}

// ==============================================
// MAIN COMPONENT
// ==============================================

const GameplayBackground = memo<GameplayBackgroundProps>(({ className, children }) => {
  const { theme } = useAdventureTheme();
  const worldId = theme?.id || 1;
  const atm = getWorldAtmosphere(worldId);

  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      {/* Layer 1: flat two-band field — hard color stops at the horizon, no haze.
          GPU-composited single element, zero JS cost. */}
      <div
        data-testid="atmosphere-bands"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${atm.bands[0]} 0%, ${atm.bands[0]} ${atm.splitAt}%, ${atm.bands[1]} ${atm.splitAt}%, ${atm.bands[1]} 100%)`,
        }}
      />

      {/* Layer 2: crisp halftone dot grain — graphic texture, world-tinted. */}
      <div
        data-testid="atmosphere-halftone"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${atm.halftone} 1.1px, transparent 1.2px)`,
          backgroundSize: '14px 14px',
        }}
      />

      {/* Layer 3: hard graphic horizon line — defines the band split with brutalist edge. */}
      <div
        data-testid="atmosphere-horizon"
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: `${atm.splitAt}%`,
          borderTop: `3px solid ${atm.horizon}`,
          opacity: 0.5,
        }}
      />

      {/* Margin-only ambient particles — never cross the grid */}
      <MarginParticles worldId={worldId} className="z-5" />

      {/* Content layer */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
});

GameplayBackground.displayName = 'GameplayBackground';

export default GameplayBackground;
