/**
 * Adventure Mode Theme Type Definitions
 *
 * Defines the complete theming system for adventure mode worlds.
 * Each world has unique visual styling, backgrounds, tile variants, and modifiers.
 */

import type { TileType } from '@/types/adventure';
import type { LucideIcon } from 'lucide-react';

// ==============================================
// BACKGROUND TYPES
// ==============================================

/**
 * A single parallax background layer
 */
export interface ParallaxLayer {
  /** Unique identifier for the layer */
  id: string;
  /** Image path or CSS gradient */
  source: string;
  /** Parallax depth (0 = static, 1 = full parallax) */
  depth: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Optional CSS class for additional styling */
  className?: string;
}

/**
 * Texture overlay configuration
 */
export interface TextureConfig {
  /** Texture type identifier */
  type: 'halftone' | 'grain' | 'wood' | 'stone' | 'ice' | 'metal' | 'none';
  /** Opacity (0-1) */
  opacity: number;
  /** Blend mode for the texture */
  blendMode: 'multiply' | 'overlay' | 'soft-light' | 'normal';
  /** Optional tint color */
  tint?: string;
}

/**
 * Particle effect configuration
 */
export interface ParticleConfig {
  /** Particle type identifier */
  type: 'leaves' | 'snowflakes' | 'embers' | 'bubbles' | 'dust' | 'sparkles' | 'butterflies' | 'droplets' | 'crystals' | 'none';
  /** Number of particles (max 50 for performance) */
  count: number;
  /** Particle colors */
  colors: string[];
  /** Animation speed multiplier (1 = normal) */
  speed: number;
  /** Particle size range [min, max] in pixels */
  sizeRange: [number, number];
  /** Particle variant (for type-specific variations) */
  variant?: string;
  /** Enable foreground particles (render above content) */
  enableForeground?: boolean;
}

/**
 * Complete background configuration for a world
 */
export interface WorldBackground {
  /** Base background color (fallback) */
  baseColor: string;
  /** Illustrated background image path (optional) */
  illustrationPath?: string;
  /** Parallax layers (front to back) */
  layers: ParallaxLayer[];
  /** Texture overlay */
  texture: TextureConfig;
  /** Particle effects */
  particles: ParticleConfig;
}

// ==============================================
// TILE VISUAL TYPES
// ==============================================

/**
 * Visual configuration for a single tile type
 */
export interface TileVisualConfig {
  /** Tailwind base classes for the tile */
  baseClasses: string;
  /** Gradient start color */
  gradientFrom: string;
  /** Gradient end color */
  gradientTo: string;
  /** Border color class */
  borderColor: string;
  /** Shadow style */
  shadowStyle: 'hard' | 'glow' | 'none';
  /** Shadow color (for glow effects) */
  shadowColor?: string;
  /** Badge icon component (for special tiles) */
  badgeIcon?: LucideIcon;
  /** Badge text (e.g., "3x" for gold tiles) */
  badgeText?: string;
  /** Badge background color class */
  badgeBackground?: string;
  /** Whether to show texture overlay on tile */
  showTexture: boolean;
  /** Custom overlay component name (frost, flames, etc.) */
  overlayType?: 'frost' | 'flames' | 'sparkle' | 'chain-link' | 'clock' | 'none';
}

/**
 * Map of tile type to visual config for a world
 */
export type TileStyleMap = Record<TileType, TileVisualConfig>;

// ==============================================
// MODIFIER TYPES
// ==============================================

/**
 * World modifier display configuration
 */
export interface ModifierDisplayConfig {
  /** Whether to show the modifier banner */
  visible: boolean;
  /** Icon for the modifier */
  icon: LucideIcon;
  /** Background color class */
  backgroundColor: string;
  /** Border color class */
  borderColor: string;
  /** Text color class */
  textColor: string;
  /** Glow color for active state */
  glowColor: string;
  /** Position on screen */
  position: 'top-left' | 'top-right' | 'top-center';
}

// ==============================================
// ANIMATION TYPES
// ==============================================

/**
 * Entry animation type for tiles
 */
export type EntryAnimationType =
  | 'fade'
  | 'cascade'
  | 'spiral'
  | 'explode'
  | 'wave'
  | 'slide-up'
  | 'zoom';

/**
 * Animation configuration for a world
 */
export interface WorldAnimations {
  /** How tiles enter the grid */
  tileEntry: EntryAnimationType;
  /** Tailwind animation class for tile hover */
  tileHover: string;
  /** Tailwind animation class for tile selection */
  tileSelect: string;
  /** Tailwind animation class for tile clear */
  tileClear: string;
  /** Duration multiplier (1 = normal speed) */
  speedMultiplier: number;
}

// ==============================================
// COLOR PALETTE
// ==============================================

/**
 * Color palette for a world
 */
export interface WorldColorPalette {
  /** Primary brand color */
  primary: string;
  /** Secondary accent color */
  secondary: string;
  /** Tertiary highlight color */
  accent: string;
  /** Background tint */
  backgroundTint: string;
  /** Text color on dark backgrounds */
  textLight: string;
  /** Text color on light backgrounds */
  textDark: string;
  /** Success/positive color */
  success: string;
  /** Warning color */
  warning: string;
  /** Error/danger color */
  danger: string;
}

// ==============================================
// CHAPTER TYPES
// ==============================================

/**
 * Chapter configuration within a world
 */
export interface ChapterConfig {
  /** Chapter number (1-3) */
  number: 1 | 2 | 3;
  /** Translation key for chapter name */
  nameKey: string;
  /** Number of levels in this chapter */
  levelCount: number;
  /** Starting level index (1-based) */
  startLevel: number;
  /** Whether this is the boss chapter */
  isBossChapter: boolean;
  /** Chapter-specific visual accent (optional) */
  accentColor?: string;
}

// ==============================================
// MAIN WORLD THEME
// ==============================================

/**
 * Complete theme configuration for a world
 */
export interface WorldTheme {
  /** World ID (1-10) */
  id: number;
  /** Translation key for world name */
  nameKey: string;
  /** Visual theme identifier */
  themeId: string;
  /** World mechanic identifier (null for tutorial) */
  mechanic: string | null;
  /** Color palette */
  colors: WorldColorPalette;
  /** Background configuration */
  background: WorldBackground;
  /** Tile visual styles */
  tileStyles: TileStyleMap;
  /** Modifier display configuration */
  modifierDisplay: ModifierDisplayConfig;
  /** Animation settings */
  animations: WorldAnimations;
  /** Chapter configurations */
  chapters: [ChapterConfig, ChapterConfig, ChapterConfig];
  /** World-specific CSS class to apply */
  containerClass: string;
}

// ==============================================
// THEME CONTEXT TYPES
// ==============================================

/**
 * Context value for theme provider
 */
export interface ThemeContextValue {
  /** Current active theme */
  currentTheme: WorldTheme;
  /** Current world ID */
  currentWorldId: number;
  /** Set the active world */
  setWorld: (worldId: number) => void;
  /** Get tile visual config for current world */
  getTileConfig: (tileType: TileType) => TileVisualConfig;
  /** Get chapter config for a level */
  getChapterForLevel: (level: number) => ChapterConfig;
  /** Check if a level is a boss level */
  isBossLevel: (level: number) => boolean;
  /** Whether theme is currently transitioning */
  isTransitioning: boolean;
}

// ==============================================
// DEFAULT VALUES
// ==============================================

/**
 * Default tile visual config (used as fallback)
 */
export const DEFAULT_TILE_CONFIG: TileVisualConfig = {
  baseClasses: 'rounded-neo border-2',
  gradientFrom: 'neo-white',
  gradientTo: 'gray-200',
  borderColor: 'border-neo-black/30',
  shadowStyle: 'hard',
  showTexture: false,
  overlayType: 'none',
};

/**
 * Default particle config (no particles)
 */
export const DEFAULT_PARTICLES: ParticleConfig = {
  type: 'none',
  count: 0,
  colors: [],
  speed: 1,
  sizeRange: [4, 8],
};

/**
 * Default texture config (no texture)
 */
export const DEFAULT_TEXTURE: TextureConfig = {
  type: 'none',
  opacity: 0,
  blendMode: 'normal',
};
