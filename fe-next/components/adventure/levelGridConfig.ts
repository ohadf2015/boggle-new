import React from 'react';
import {
  Coins,
  Snowflake,
  Bomb,
  Rainbow,
} from 'lucide-react';

// World images mapping (WebP for smaller file sizes)
export const WORLD_IMAGES: Record<number, string> = {
  1: '/images/adventure/world-meadows-3d.webp',
  2: '/images/adventure/world-springs-3d.webp',
  3: '/images/adventure/world-caverns-3d.webp',
  4: '/images/adventure/world-archipelago-3d.webp',
  5: '/images/adventure/world-canyon-3d.webp',
  6: '/images/adventure/world-labyrinth-3d.webp',
  7: '/images/adventure/world-palace-3d.webp',
  8: '/images/adventure/world-nebula-3d.webp',
  9: '/images/adventure/world-peaks-3d.webp',
  10: '/images/adventure/world-throne-3d.webp',
};

/**
 * World-specific parallax layer configuration
 * Each world can have up to 3 parallax layers (far, mid, near) using dedicated assets
 * Depth values: lower = slower movement (farther), higher = faster movement (closer)
 */
export interface ParallaxLayerConfig {
  src: string;
  depth: number;
  opacity: number;
  scale?: number;
  position?: 'top' | 'bottom' | 'center';
}

interface WorldParallaxConfig {
  far?: ParallaxLayerConfig;
  mid?: ParallaxLayerConfig;
  near?: ParallaxLayerConfig;
}

export const WORLD_PARALLAX_LAYERS: Record<number, WorldParallaxConfig> = {
  1: {
    far: { src: '/images/adventure/parallax/meadows-hills.webp', depth: 0.15, opacity: 0.5, scale: 1.3, position: 'bottom' },
    near: { src: '/images/adventure/parallax/meadows-grass.webp', depth: 0.5, opacity: 0.7, scale: 1.2, position: 'bottom' },
  },
  2: {
    far: { src: '/images/adventure/parallax/springs-rocks.webp', depth: 0.15, opacity: 0.4, scale: 1.3, position: 'center' },
    mid: { src: '/images/adventure/parallax/springs-waterfall.webp', depth: 0.3, opacity: 0.6, scale: 1.2, position: 'center' },
    near: { src: '/images/adventure/parallax/springs-mist.webp', depth: 0.55, opacity: 0.5, scale: 1.4, position: 'bottom' },
  },
  3: {
    far: { src: '/images/adventure/parallax/caverns-crystals-far.webp', depth: 0.12, opacity: 0.5, scale: 1.3, position: 'center' },
    mid: { src: '/images/adventure/parallax/caverns-stalactites.webp', depth: 0.25, opacity: 0.6, scale: 1.2, position: 'top' },
    near: { src: '/images/adventure/parallax/caverns-crystals-near.webp', depth: 0.5, opacity: 0.7, scale: 1.3, position: 'bottom' },
  },
  4: {}, 5: {}, 6: {}, 7: {}, 8: {}, 9: {}, 10: {},
};

export interface ParticleConfig {
  count: number;
  emoji: string[];
  colors: string[];
  sizeRange: [number, number];
  speedRange: [number, number];
}

export const WORLD_PARTICLES: Record<number, ParticleConfig> = {
  1: { count: 10, emoji: ['🌸', '🍃', '🦋', '✿', '❀'], colors: ['#a3e635', '#84cc16', '#22c55e', '#fbbf24'], sizeRange: [8, 14], speedRange: [15, 30] },
  2: { count: 12, emoji: ['💧', '✨', '💎', '🫧'], colors: ['#22d3ee', '#06b6d4', '#67e8f9', '#a5f3fc'], sizeRange: [8, 14], speedRange: [10, 25] },
  3: { count: 8, emoji: ['💜', '🔮', '💎', '✦'], colors: ['#a855f7', '#8b5cf6', '#c084fc', '#d8b4fe'], sizeRange: [8, 16], speedRange: [20, 35] },
  4: { count: 10, emoji: ['🌊', '🐚', '🌴', '☀️'], colors: ['#fb923c', '#f97316', '#fbbf24', '#fdba74'], sizeRange: [8, 16], speedRange: [12, 28] },
  5: { count: 8, emoji: ['🔶', '🧱', '⬛', '🏜️'], colors: ['#ef4444', '#dc2626', '#f97316', '#fbbf24'], sizeRange: [8, 14], speedRange: [18, 32] },
  6: { count: 12, emoji: ['🔷', '🔶', '✧', '◇'], colors: ['#ec4899', '#f472b6', '#f9a8d4', '#db2777'], sizeRange: [8, 14], speedRange: [15, 28] },
  7: { count: 10, emoji: ['❄️', '💠', '✧', '◈'], colors: ['#22d3ee', '#06b6d4', '#e0f2fe', '#ffffff'], sizeRange: [8, 16], speedRange: [12, 25] },
  8: { count: 14, emoji: ['⭐', '✨', '💫', '🌟'], colors: ['#a855f7', '#ec4899', '#8b5cf6', '#f472b6'], sizeRange: [6, 14], speedRange: [8, 22] },
  9: { count: 8, emoji: ['🏔️', '✦', '❄️', '🌌'], colors: ['#22d3ee', '#a3e635', '#67e8f9', '#84cc16'], sizeRange: [8, 16], speedRange: [15, 30] },
  10: { count: 12, emoji: ['👑', '⭐', '💫', '✧'], colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#fef08a'], sizeRange: [8, 16], speedRange: [10, 25] },
};

// Icon map for special tile types
export const TILE_ICONS: Record<string, React.ReactNode> = {
  gold: React.createElement(Coins, { className: 'w-3 h-3' }),
  ice: React.createElement(Snowflake, { className: 'w-3 h-3' }),
  bomb: React.createElement(Bomb, { className: 'w-3 h-3' }),
  rainbow: React.createElement(Rainbow, { className: 'w-3 h-3' }),
};

// Staggered animation variants for level cards
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
    },
  },
};
