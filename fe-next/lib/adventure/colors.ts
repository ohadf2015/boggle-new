/**
 * Adventure Mode - Centralized Color System
 *
 * Single source of truth for world color themes.
 * Used by WorldMap (glow effects) and LevelGrid (Tailwind classes).
 */

/**
 * Full color palette for a world theme
 */
export interface WorldColorPalette {
  /** Background class (e.g., 'bg-lime-400/20') */
  bg: string;
  /** Border class (e.g., 'border-lime-400') */
  border: string;
  /** Text class (e.g., 'text-lime-400') */
  text: string;
  /** Glow shadow class (e.g., 'shadow-[0_0_20px_rgba(...)]') */
  glow: string;
  /** Hover border class */
  hoverBorder: string;
  /** Star fill classes */
  starFill: string;
  /** RGBA glow for drop-shadow filter (e.g., 'rgba(163,230,53,0.5)') */
  glowRgba: string;
}

/**
 * Complete color definitions for all world themes
 */
const WORLD_COLOR_DEFINITIONS: Record<string, WorldColorPalette> = {
  'neo-lime': {
    bg: 'bg-lime-400/20',
    border: 'border-lime-400',
    text: 'text-lime-400',
    glow: 'shadow-[0_0_20px_rgba(163,230,53,0.3)]',
    hoverBorder: 'hover:border-lime-400',
    starFill: 'text-lime-400 fill-lime-400',
    glowRgba: 'rgba(163,230,53,0.5)',
  },
  'neo-cyan': {
    bg: 'bg-cyan-400/20',
    border: 'border-cyan-400',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
    hoverBorder: 'hover:border-cyan-400',
    starFill: 'text-cyan-400 fill-cyan-400',
    glowRgba: 'rgba(0,255,255,0.5)',
  },
  'neo-purple': {
    bg: 'bg-purple-400/20',
    border: 'border-purple-400',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_20px_rgba(192,132,252,0.3)]',
    hoverBorder: 'hover:border-purple-400',
    starFill: 'text-purple-400 fill-purple-400',
    glowRgba: 'rgba(139,92,246,0.5)',
  },
  'neo-orange': {
    bg: 'bg-orange-400/20',
    border: 'border-orange-400',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
    hoverBorder: 'hover:border-orange-400',
    starFill: 'text-orange-400 fill-orange-400',
    glowRgba: 'rgba(255,107,53,0.5)',
  },
  'neo-pink': {
    bg: 'bg-pink-400/20',
    border: 'border-pink-400',
    text: 'text-pink-400',
    glow: 'shadow-[0_0_20px_rgba(244,114,182,0.3)]',
    hoverBorder: 'hover:border-pink-400',
    starFill: 'text-pink-400 fill-pink-400',
    glowRgba: 'rgba(255,20,147,0.5)',
  },
  'neo-yellow': {
    bg: 'bg-yellow-400/20',
    border: 'border-yellow-400',
    text: 'text-yellow-400',
    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.3)]',
    hoverBorder: 'hover:border-yellow-400',
    starFill: 'text-yellow-400 fill-yellow-400',
    glowRgba: 'rgba(255,215,0,0.6)',
  },
  'neo-red': {
    bg: 'bg-red-400/20',
    border: 'border-red-400',
    text: 'text-red-400',
    glow: 'shadow-[0_0_20px_rgba(248,113,113,0.3)]',
    hoverBorder: 'hover:border-red-400',
    starFill: 'text-red-400 fill-red-400',
    glowRgba: 'rgba(239,68,68,0.5)',
  },
  'neo-teal': {
    bg: 'bg-teal-400/20',
    border: 'border-teal-400',
    text: 'text-teal-400',
    glow: 'shadow-[0_0_20px_rgba(45,212,191,0.3)]',
    hoverBorder: 'hover:border-teal-400',
    starFill: 'text-teal-400 fill-teal-400',
    glowRgba: 'rgba(45,212,191,0.5)',
  },
  'neo-indigo': {
    bg: 'bg-indigo-400/20',
    border: 'border-indigo-400',
    text: 'text-indigo-400',
    glow: 'shadow-[0_0_20px_rgba(129,140,248,0.3)]',
    hoverBorder: 'hover:border-indigo-400',
    starFill: 'text-indigo-400 fill-indigo-400',
    glowRgba: 'rgba(129,140,248,0.5)',
  },
  'neo-emerald': {
    bg: 'bg-emerald-400/20',
    border: 'border-emerald-400',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]',
    hoverBorder: 'hover:border-emerald-400',
    starFill: 'text-emerald-400 fill-emerald-400',
    glowRgba: 'rgba(52,211,153,0.5)',
  },
};

/** Default fallback color */
const DEFAULT_COLOR = 'neo-cyan';

/**
 * Get the full color palette for a world theme
 * @param colorPrimary - The color key (e.g., 'neo-lime')
 * @returns Complete WorldColorPalette
 */
export function getWorldColors(colorPrimary: string): WorldColorPalette {
  return WORLD_COLOR_DEFINITIONS[colorPrimary] || WORLD_COLOR_DEFINITIONS[DEFAULT_COLOR];
}

/**
 * Get just the RGBA glow value for drop-shadow effects
 * @param colorPrimary - The color key (e.g., 'neo-lime')
 * @returns RGBA string (e.g., 'rgba(163,230,53,0.5)')
 */
export function getWorldGlow(colorPrimary: string): string {
  const colors = getWorldColors(colorPrimary);
  return colors.glowRgba;
}

/**
 * All available world color keys
 */
export const WORLD_COLOR_KEYS = Object.keys(WORLD_COLOR_DEFINITIONS);
