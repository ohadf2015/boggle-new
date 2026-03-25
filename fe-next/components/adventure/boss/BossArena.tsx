/**
 * BossArena Component
 *
 * Renders world-specific arena visual effects as a subtle background overlay
 * during boss fights. Each world has a unique CSS-only arena effect.
 *
 * Effects are purely decorative and do not block gameplay.
 */

'use client';

import { memo } from 'react';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';

// ==============================================
// TYPES
// ==============================================

interface BossArenaProps {
  /** World ID (1-10) */
  worldId: number;
}

// ==============================================
// ARENA EFFECT COMPONENTS
// ==============================================

/** W1: Chalk marks on a green chalkboard */
function ChalkboardEffect() {
  return (
    <div
      data-testid="arena-effect-chalkboard"
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(135deg, rgba(34,139,34,0.08) 25%, transparent 25%, transparent 50%, rgba(34,139,34,0.08) 50%, rgba(34,139,34,0.08) 75%, transparent 75%)',
        backgroundSize: '40px 40px',
      }}
    />
  );
}

/** W2: Hexagonal honeycomb pattern */
function HoneycombEffect() {
  return (
    <div
      data-testid="arena-effect-honeycomb"
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(circle farthest-side at 0% 50%, rgba(255,193,7,0.06) 23.5%, transparent 0) 21px 30px,
          radial-gradient(circle farthest-side at 0% 50%, rgba(255,193,7,0.04) 24%, transparent 0) 19px 30px,
          linear-gradient(rgba(255,193,7,0.05) 14%, transparent 0, transparent 85%, rgba(255,193,7,0.05) 0) 0 0,
          linear-gradient(150deg, rgba(255,193,7,0.05) 24%, transparent 0) 0 0,
          linear-gradient(30deg, rgba(255,193,7,0.05) 24%, transparent 0) 0 0,
          linear-gradient(210deg, rgba(255,193,7,0.05) 24%, transparent 0) 0 0,
          linear-gradient(330deg, rgba(255,193,7,0.05) 24%, transparent 0) 0 0
        `,
        backgroundSize: '40px 60px',
      }}
    />
  );
}

/** W3: Crystal cavern with sparkling facets */
function CrystalCavernEffect() {
  return (
    <div
      data-testid="arena-effect-crystal-cavern"
      className="absolute inset-0"
      style={{
        background: `
          linear-gradient(60deg, rgba(138,43,226,0.06) 25%, transparent 25.5%, transparent 75%, rgba(138,43,226,0.06) 75%),
          linear-gradient(120deg, rgba(75,0,130,0.06) 25%, transparent 25.5%, transparent 75%, rgba(75,0,130,0.06) 75%)
        `,
        backgroundSize: '60px 100px',
      }}
    />
  );
}

/** W4: Ocean waves on a ship deck */
function OceanDeckEffect() {
  return (
    <div
      data-testid="arena-effect-ocean-deck"
      className="absolute inset-0 animate-[oceanSway_6s_ease-in-out_infinite] motion-reduce:animate-none"
      style={{
        background: `
          repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(0,119,190,0.04) 30px, rgba(0,119,190,0.04) 32px),
          repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(0,119,190,0.03) 50px, rgba(0,119,190,0.03) 52px)
        `,
      }}
    />
  );
}

/** W5: Industrial gears and cogs pattern */
function GearFactoryEffect() {
  return (
    <div
      data-testid="arena-effect-gear-factory"
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(circle at 30% 30%, rgba(169,169,169,0.06) 10%, transparent 10.5%),
          radial-gradient(circle at 70% 70%, rgba(169,169,169,0.06) 10%, transparent 10.5%),
          radial-gradient(circle at 50% 50%, rgba(169,169,169,0.04) 15%, transparent 15.5%)
        `,
        backgroundSize: '80px 80px',
      }}
    />
  );
}

/** W6: Labyrinth maze pattern */
function MazeEffect() {
  return (
    <div
      data-testid="arena-effect-maze"
      className="absolute inset-0"
      style={{
        background: `
          linear-gradient(to right, rgba(219,39,119,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(219,39,119,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
      }}
    />
  );
}

/** W7: Reflective mirror/glass shards */
function MirrorEffect() {
  return (
    <div
      data-testid="arena-effect-mirror"
      className="absolute inset-0"
      style={{
        background: `
          linear-gradient(45deg, rgba(192,192,192,0.04) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(192,192,192,0.04) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(192,192,192,0.04) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(192,192,192,0.04) 75%)
        `,
        backgroundSize: '50px 50px',
        backgroundPosition: '0 0, 0 25px, 25px -25px, -25px 0px',
      }}
    />
  );
}

/** W8: Star field with twinkling dots */
function StarfieldEffect() {
  return (
    <div
      data-testid="arena-effect-starfield"
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.15), transparent),
          radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.12), transparent),
          radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.1), transparent),
          radial-gradient(1.5px 1.5px at 80% 50%, rgba(255,255,255,0.18), transparent),
          radial-gradient(1px 1px at 10% 80%, rgba(255,255,255,0.08), transparent),
          radial-gradient(1.5px 1.5px at 90% 10%, rgba(255,255,255,0.14), transparent),
          radial-gradient(1px 1px at 50% 50%, rgba(138,43,226,0.08), transparent)
        `,
        backgroundSize: '200px 200px',
      }}
    />
  );
}

/** W9: Northern lights aurora borealis */
function AuroraEffect() {
  return (
    <div
      data-testid="arena-effect-aurora"
      className="absolute inset-0"
      style={{
        background: `
          linear-gradient(180deg,
            rgba(0,255,128,0.03) 0%,
            rgba(0,200,255,0.05) 30%,
            rgba(100,0,255,0.04) 60%,
            transparent 100%
          )
        `,
      }}
    />
  );
}

/** W10: Ancient dragon library with embers */
function DragonLibraryEffect() {
  return (
    <div
      data-testid="arena-effect-dragon-library"
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse at 50% 100%, rgba(255,165,0,0.06) 0%, transparent 60%),
          repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(139,69,19,0.03) 40px, rgba(139,69,19,0.03) 42px)
        `,
      }}
    />
  );
}

// ==============================================
// EFFECT MAP
// ==============================================

const ARENA_EFFECTS: Record<string, React.FC> = {
  chalkboard: ChalkboardEffect,
  honeycomb: HoneycombEffect,
  'crystal-cavern': CrystalCavernEffect,
  'ocean-deck': OceanDeckEffect,
  'gear-factory': GearFactoryEffect,
  maze: MazeEffect,
  mirror: MirrorEffect,
  starfield: StarfieldEffect,
  aurora: AuroraEffect,
  'dragon-library': DragonLibraryEffect,
};

// ==============================================
// COMPONENT
// ==============================================

const BossArena = memo<BossArenaProps>(({ worldId }) => {
  const bossFightTheme = useBossFightTheme();
  const { arenaEffect } = bossFightTheme;

  if (arenaEffect === 'none' || !arenaEffect) return null;

  const EffectComponent = ARENA_EFFECTS[arenaEffect];
  if (!EffectComponent) return null;

  return (
    <div
      data-testid="boss-arena"
      className="fixed inset-0 z-20 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <EffectComponent />
    </div>
  );
});

BossArena.displayName = 'BossArena';

export default BossArena;
