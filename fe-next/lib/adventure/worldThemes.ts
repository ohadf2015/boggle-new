/**
 * World-themed visual configurations for adventure mode
 *
 * Defines particle burst effects, colors, and animations themed to each world.
 * Used by ChainParticleBurst and other world-aware components.
 */

export interface WorldParticleConfig {
  /** Primary particle color (hex) */
  color: string;
  /** Optional emoji particle */
  emoji?: string;
  /** Secondary color for variety */
  secondaryColor?: string;
  /** Particle size range in pixels */
  size: { min: number; max: number };
  /** Travel distance range in pixels */
  distance: { min: number; max: number };
  /** Animation duration in milliseconds */
  duration: number;
}

/**
 * Particle configurations for all 10 adventure worlds
 *
 * Each world has a unique visual theme:
 * 1. Alphabet Meadows - nature (green, leaves)
 * 2. Synonym Springs - water (turquoise, water drops)
 * 3. Root Caverns - earth/gems (gold, gems)
 * 4. Idiom Archipelago - tropical (orange, palm trees)
 * 5. Compound Canyon - desert (sandy brown, desert)
 * 6. Anagram Labyrinth - mystery (purple, sparkles)
 * 7. Mirror Palace - ice/reflection (cyan, snowflakes)
 * 8. Neologism Nebula - space (pink, stars)
 * 9. Polyglot Peaks - mountain (sky blue, mountains)
 * 10. Lexicon Throne - royal (yellow, crowns)
 */
export const WORLD_PARTICLE_CONFIGS: Record<number, WorldParticleConfig> = {
  1: {
    // Alphabet Meadows - nature
    color: '#90EE90', // light green
    emoji: '🌿',
    secondaryColor: '#98FB98',
    size: { min: 6, max: 10 },
    distance: { min: 40, max: 70 },
    duration: 600,
  },
  2: {
    // Synonym Springs - water
    color: '#00CED1', // dark turquoise
    emoji: '💧',
    secondaryColor: '#00FFFF',
    size: { min: 5, max: 9 },
    distance: { min: 45, max: 75 },
    duration: 550,
  },
  3: {
    // Root Caverns - earth/gems
    color: '#FFD700', // gold
    emoji: '💎',
    secondaryColor: '#FF6347',
    size: { min: 7, max: 12 },
    distance: { min: 35, max: 65 },
    duration: 700,
  },
  4: {
    // Idiom Archipelago - tropical
    color: '#FF6B35', // neo-orange
    emoji: '🌴',
    secondaryColor: '#FFE135',
    size: { min: 6, max: 11 },
    distance: { min: 50, max: 80 },
    duration: 600,
  },
  5: {
    // Compound Canyon - desert
    color: '#CD853F', // peru (sandy)
    emoji: '🏜️',
    secondaryColor: '#DEB887',
    size: { min: 5, max: 8 },
    distance: { min: 40, max: 65 },
    duration: 650,
  },
  6: {
    // Anagram Labyrinth - mystery
    color: '#9370DB', // medium purple
    emoji: '✨',
    secondaryColor: '#BA55D3',
    size: { min: 4, max: 8 },
    distance: { min: 45, max: 70 },
    duration: 550,
  },
  7: {
    // Mirror Palace - ice/reflection
    color: '#00FFFF', // cyan
    emoji: '❄️',
    secondaryColor: '#E0FFFF',
    size: { min: 8, max: 12 },
    distance: { min: 50, max: 80 },
    duration: 600,
  },
  8: {
    // Neologism Nebula - space
    color: '#FF1493', // deep pink
    emoji: '🌟',
    secondaryColor: '#8B5CF6',
    size: { min: 5, max: 10 },
    distance: { min: 55, max: 90 },
    duration: 700,
  },
  9: {
    // Polyglot Peaks - mountain
    color: '#87CEEB', // sky blue
    emoji: '⛰️',
    secondaryColor: '#B0C4DE',
    size: { min: 6, max: 10 },
    distance: { min: 40, max: 70 },
    duration: 600,
  },
  10: {
    // Lexicon Throne - royal
    color: '#FFE135', // neo-yellow
    emoji: '👑',
    secondaryColor: '#FFD700',
    size: { min: 8, max: 14 },
    distance: { min: 50, max: 85 },
    duration: 650,
  },
};

/**
 * Get particle configuration for a specific world
 *
 * @param world - World number (1-10)
 * @returns WorldParticleConfig for the world, falls back to world 1 if invalid
 *
 * @example
 * ```ts
 * const config = getWorldParticleConfig(7); // Mirror Palace (ice)
 * // config.emoji === '❄️'
 * // config.color === '#00FFFF' (cyan)
 * ```
 */
export function getWorldParticleConfig(world: number): WorldParticleConfig {
  return WORLD_PARTICLE_CONFIGS[world] || WORLD_PARTICLE_CONFIGS[1];
}
