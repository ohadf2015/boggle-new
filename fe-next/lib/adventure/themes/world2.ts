/**
 * World 2: Synonym Springs Theme
 *
 * Water-themed world with waterfalls and springs.
 * Mechanic: Synonym pairs bonus (+25%)
 */

import { RefreshCw } from 'lucide-react';
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
  primary: 'neo-cyan',
  secondary: 'neo-cyan-light',
  accent: 'neo-blue',
  backgroundTint: 'cyan-900/20',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'neo-cyan',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-gradient-to-b from-cyan-600 via-blue-500 to-cyan-400',
  illustrationPath: '/images/adventure/backgrounds/springs.webp',
  layers: [
    {
      id: 'springs-sky',
      source: 'bg-gradient-to-b from-cyan-700 to-blue-500',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'springs-waterfall',
      source: '/images/adventure/parallax/springs-waterfall.webp',
      depth: 0.25,
      opacity: 0.95,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'springs-mist',
      source: '/images/adventure/parallax/springs-mist.webp',
      depth: 0.4,
      opacity: 0.6,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
    {
      id: 'springs-rocks',
      source: '/images/adventure/parallax/springs-rocks.webp',
      depth: 0.55,
      opacity: 1,
      className: 'absolute bottom-0 w-full h-1/3 object-cover',
    },
  ],
  texture: {
    type: 'none',
    opacity: 0,
    blendMode: 'normal',
  },
  particles: {
    type: 'bubbles',
    count: 35,
    colors: ['rgba(255,255,255,0.6)', 'rgba(200,255,255,0.4)', 'rgba(150,220,255,0.5)'],
    speed: 1.2,
    sizeRange: [4, 12],
  },
};

// ==============================================
// TILE STYLES (Water-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'slate-100',
    gradientTo: 'slate-200',
    borderColor: 'border-slate-400/40',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-300',
    gradientTo: 'amber-500',
    borderColor: 'border-amber-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 215, 0, 0.6)',
    badgeText: '3x',
    badgeBackground: 'bg-amber-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'cyan-100',
    gradientTo: 'blue-400',
    borderColor: 'border-blue-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(100, 200, 255, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'orange-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 100, 50, 0.5)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'cyan-300',
    gradientTo: 'purple-400',
    borderColor: 'border-indigo-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(100, 150, 255, 0.5)',
    badgeText: '*',
    badgeBackground: 'bg-indigo-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'purple-300',
    gradientTo: 'violet-500',
    borderColor: 'border-purple-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(150, 100, 255, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'teal-300',
    gradientTo: 'cyan-500',
    borderColor: 'border-teal-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(50, 200, 180, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-teal-900',
    showTexture: false,
    overlayType: 'clock',
  },
};

// ==============================================
// MODIFIER DISPLAY (Synonym Pairs)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: RefreshCw,
  backgroundColor: 'bg-neo-cyan/20',
  borderColor: 'border-neo-cyan',
  textColor: 'text-neo-cyan',
  glowColor: 'rgba(0, 255, 255, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'wave',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-neo-cyan scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 1.1,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.springs.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'neo-cyan',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.springs.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'neo-cyan-light',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.springs.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'neo-blue',
  },
];

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_2_THEME: WorldTheme = {
  id: 2,
  nameKey: 'adventure.worlds.synonymSprings',
  themeId: 'waterfalls',
  mechanic: 'synonymPairs',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-springs',
};
