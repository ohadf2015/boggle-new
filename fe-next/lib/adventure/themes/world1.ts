/**
 * World 1: Alphabet Meadows Theme
 *
 * Tutorial world with sunny pastoral visuals.
 * No special mechanic - introduces basic gameplay.
 */

import { Sparkles } from 'lucide-react';
import type {
  WorldTheme,
  TileStyleMap,
  WorldBackground,
  WorldAnimations,
  WorldColorPalette,
  ModifierDisplayConfig,
  ChapterConfig,
  HUDTheme,
  TimerUrgencyTheme,
  BossFightTheme,
} from './types';

// ==============================================
// COLOR PALETTE
// ==============================================

const colors: WorldColorPalette = {
  primary: 'neo-lime',
  secondary: 'neo-lime-light',
  accent: 'neo-yellow',
  backgroundTint: 'lime-900/20',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'neo-lime',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-neo-navy via-slate-900 to-emerald-950',
  illustrationPath: '/images/adventure/backgrounds/meadows.webp',
  layers: [
    {
      id: 'meadows-sky',
      source: 'bg-linear-to-b from-neo-navy via-slate-900 to-emerald-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'meadows-hills',
      source: '/images/adventure/parallax/meadows-hills.webp',
      depth: 0.3,
      opacity: 0.9,
      className: 'absolute bottom-0 w-full h-1/2 object-cover',
    },
    {
      id: 'meadows-grass',
      source: '/images/adventure/parallax/meadows-grass.webp',
      depth: 0.5,
      opacity: 1,
      className: 'absolute bottom-0 w-full h-1/3 object-cover',
    },
  ],
  texture: {
    type: 'grain',
    opacity: 0.05,
    blendMode: 'overlay',
  },
  particles: {
    type: 'butterflies',
    count: 8,
    colors: ['#90EE90', '#FFD700', '#98FB98'],
    speed: 0.8,
    sizeRange: [12, 20],
  },
};

// ==============================================
// TILE STYLES
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-50',
    gradientTo: 'amber-100',
    borderColor: 'border-amber-800/30',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-300',
    gradientTo: 'amber-400',
    borderColor: 'border-amber-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 215, 0, 0.5)',
    badgeText: '3x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'cyan-200',
    gradientTo: 'blue-300',
    borderColor: 'border-cyan-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(0, 255, 255, 0.3)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'orange-500',
    borderColor: 'border-red-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 69, 0, 0.4)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'pink-400',
    gradientTo: 'purple-500',
    borderColor: 'border-purple-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(138, 43, 226, 0.4)',
    badgeText: '*',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'purple-400',
    gradientTo: 'violet-600',
    borderColor: 'border-purple-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(138, 43, 226, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'emerald-400',
    gradientTo: 'teal-500',
    borderColor: 'border-emerald-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(16, 185, 129, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'clock',
  },
  locked: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'gray-600',
    gradientTo: 'gray-800',
    borderColor: 'border-gray-900',
    shadowStyle: 'hard',
    showTexture: false,
    overlayType: 'lock',
  },
  multiplier: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'purple-400',
    gradientTo: 'pink-500',
    borderColor: 'border-purple-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(168, 85, 247, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Tutorial - no mechanic)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: false, // No mechanic in tutorial world
  icon: Sparkles,
  backgroundColor: 'bg-neo-lime/20',
  borderColor: 'border-neo-lime',
  textColor: 'text-neo-lime',
  glowColor: 'rgba(191, 255, 0, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'cascade',
  tileHover: 'hover:scale-105 hover:-translate-y-0.5',
  tileSelect: 'ring-2 ring-neo-lime scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 1,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.meadows.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'neo-lime',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.meadows.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'neo-lime-light',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.meadows.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'neo-yellow',
  },
];

// ==============================================
// HUD THEME (Emerald/lime — pastoral warm)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-emerald-950/90',
  headerBorder: 'border-emerald-800/40',
  sidebarBg: 'bg-emerald-950/60',
  scoreAccent: 'text-lime-400',
  levelBadgeColor: 'bg-emerald-900/60',
  levelBadgeText: 'text-lime-300',
  objectiveAccent: 'text-lime-400',
  hintActiveColor: 'bg-lime-500',
  hintActiveText: 'text-emerald-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-emerald-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-emerald-950/95',
  dialogueBorder: 'border-lime-500/30',
  bossNameColor: 'text-lime-400',
  hpSegmentColors: ['bg-red-500', 'bg-amber-500', 'bg-lime-500'],
  telegraphColor: 'bg-red-500/20',
  telegraphProgressColor: 'bg-red-500',
  playerHealthNormal: 'bg-lime-500',
  playerHealthLow: 'bg-red-500',
  phaseColors: {
    phase1: { bg: 'bg-lime-500/20', text: 'text-lime-400' },
    phase2: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    enraged: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(132, 204, 22, 0.4)',
  victoryGlow: 'rgba(163, 230, 53, 0.6)',
  arenaEffect: 'chalkboard',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_1_THEME: WorldTheme = {
  id: 1,
  nameKey: 'adventure.worlds.alphabetMeadows',
  themeId: 'sunny-pastoral',
  mechanic: null,
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-meadows',
  hud,
  timerTheme,
  bossFight,
};
