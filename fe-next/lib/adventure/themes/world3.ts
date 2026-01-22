/**
 * World 3: Root Caverns Theme
 *
 * Crystal cave world with glowing formations.
 * Mechanic: Etymology roots bonus (Latin/Greek)
 */

import { BookOpen } from 'lucide-react';
import type {
  WorldTheme,
  TileStyleMap,
  WorldBackground,
  WorldAnimations,
  WorldColorPalette,
  ModifierDisplayConfig,
  ChapterConfig,
} from './types';

// ==============================================
// COLOR PALETTE
// ==============================================

const colors: WorldColorPalette = {
  primary: 'neo-purple',
  secondary: 'neo-purple-light',
  accent: 'neo-pink',
  backgroundTint: 'purple-900/30',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'neo-purple',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-gradient-to-b from-slate-900 via-purple-900 to-slate-800',
  illustrationPath: '/images/adventure/backgrounds/caverns.webp',
  layers: [
    {
      id: 'caverns-deep',
      source: 'bg-gradient-to-b from-slate-950 to-purple-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'caverns-crystals-far',
      source: '/images/adventure/parallax/caverns-crystals-far.webp',
      depth: 0.2,
      opacity: 0.8,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'caverns-stalactites',
      source: '/images/adventure/parallax/caverns-stalactites.webp',
      depth: 0.35,
      opacity: 0.9,
      className: 'absolute top-0 w-full h-1/2 object-cover',
    },
    {
      id: 'caverns-crystals-near',
      source: '/images/adventure/parallax/caverns-crystals-near.webp',
      depth: 0.5,
      opacity: 1,
      className: 'absolute bottom-0 w-full h-1/2 object-cover',
    },
  ],
  texture: {
    type: 'stone',
    opacity: 0.08,
    blendMode: 'soft-light',
  },
  particles: {
    type: 'sparkles',
    count: 40,
    colors: ['rgba(200,150,255,0.7)', 'rgba(255,100,200,0.5)', 'rgba(150,200,255,0.6)'],
    speed: 0.6,
    sizeRange: [2, 6],
  },
};

// ==============================================
// TILE STYLES (Crystal/Cave-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'slate-300',
    gradientTo: 'slate-400',
    borderColor: 'border-slate-600/50',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-300',
    gradientTo: 'yellow-500',
    borderColor: 'border-amber-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 200, 50, 0.7)',
    badgeText: '3x',
    badgeBackground: 'bg-amber-800',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'violet-200',
    gradientTo: 'purple-400',
    borderColor: 'border-purple-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(180, 100, 255, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-500',
    gradientTo: 'orange-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 80, 30, 0.6)',
    showTexture: false,
    overlayType: 'flames',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'fuchsia-400',
    gradientTo: 'violet-600',
    borderColor: 'border-fuchsia-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(200, 100, 255, 0.6)',
    badgeText: '*',
    badgeBackground: 'bg-fuchsia-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'indigo-400',
    gradientTo: 'purple-600',
    borderColor: 'border-indigo-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(100, 80, 200, 0.6)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'emerald-300',
    gradientTo: 'teal-500',
    borderColor: 'border-emerald-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(50, 200, 150, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-emerald-900',
    showTexture: false,
    overlayType: 'clock',
  },
};

// ==============================================
// MODIFIER DISPLAY (Etymology Roots)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: BookOpen,
  backgroundColor: 'bg-neo-purple/20',
  borderColor: 'border-neo-purple',
  textColor: 'text-neo-purple-light',
  glowColor: 'rgba(139, 92, 246, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'spiral',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-neo-purple scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 0.9,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.caverns.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'neo-purple',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.caverns.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'neo-purple-light',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.caverns.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'neo-pink',
  },
];

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_3_THEME: WorldTheme = {
  id: 3,
  nameKey: 'adventure.worlds.rootCaverns',
  themeId: 'crystal-caves',
  mechanic: 'etymologyRoots',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-caverns',
};
