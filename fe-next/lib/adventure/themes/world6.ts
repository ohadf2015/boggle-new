/**
 * World 6: Anagram Labyrinth Theme
 *
 * Escher-inspired maze world with pink/magenta tones.
 * Mechanic: Scrambled Reality — anagram-based challenges
 */

import { Shuffle } from 'lucide-react';
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
  primary: 'pink-500',
  secondary: 'fuchsia-400',
  accent: 'magenta-400',
  backgroundTint: 'pink-900/25',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'pink-500',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-neo-navy via-slate-950 to-pink-950',
  illustrationPath: '/images/adventure/backgrounds/labyrinth.webp',
  layers: [
    {
      id: 'labyrinth-void',
      source: 'bg-linear-to-b from-neo-navy via-slate-950 to-pink-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'labyrinth-walls-far',
      source: '/images/adventure/parallax/labyrinth-walls-far.webp',
      depth: 0.25,
      opacity: 0.85,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'labyrinth-stairs',
      source: '/images/adventure/parallax/labyrinth-stairs.webp',
      depth: 0.45,
      opacity: 0.9,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
  ],
  texture: {
    type: 'stone',
    opacity: 0.07,
    blendMode: 'soft-light',
  },
  particles: {
    type: 'dust',
    count: 8,
    colors: ['rgba(236,72,153,0.5)', 'rgba(219,39,119,0.4)', 'rgba(190,24,93,0.3)'],
    speed: 0.5,
    sizeRange: [4, 10],
  },
};

// ==============================================
// TILE STYLES (Maze-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'pink-100',
    gradientTo: 'fuchsia-200',
    borderColor: 'border-pink-500/40',
    shadowStyle: 'hard',
    showTexture: true,
    overlayType: 'none',
  },
  gold: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-300',
    gradientTo: 'pink-400',
    borderColor: 'border-pink-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(236, 72, 153, 0.6)',
    badgeText: '3x',
    badgeBackground: 'bg-pink-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'pink-200',
    gradientTo: 'fuchsia-400',
    borderColor: 'border-fuchsia-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(217, 70, 239, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'pink-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 50, 100, 0.5)',
    showTexture: false,
    overlayType: 'none',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'fuchsia-400',
    gradientTo: 'purple-500',
    borderColor: 'border-fuchsia-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(192, 38, 211, 0.5)',
    badgeText: '*',
    badgeBackground: 'bg-fuchsia-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'pink-400',
    gradientTo: 'rose-600',
    borderColor: 'border-pink-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(236, 72, 153, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'fuchsia-300',
    gradientTo: 'pink-500',
    borderColor: 'border-fuchsia-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(217, 70, 239, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-fuchsia-900',
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
    gradientFrom: 'pink-400',
    gradientTo: 'fuchsia-500',
    borderColor: 'border-pink-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(236, 72, 153, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Scrambled Reality)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: Shuffle,
  backgroundColor: 'bg-pink-500/20',
  borderColor: 'border-pink-500',
  textColor: 'text-pink-400',
  glowColor: 'rgba(236, 72, 153, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'spiral',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-pink-500 scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 0.9,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.labyrinth.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'pink-500',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.labyrinth.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'fuchsia-400',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.labyrinth.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'rose-500',
  },
];

// ==============================================
// HUD THEME (Pink/magenta — maze mysterious)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-pink-950/90',
  headerBorder: 'border-pink-800/40',
  sidebarBg: 'bg-pink-950/60',
  scoreAccent: 'text-pink-400',
  levelBadgeColor: 'bg-pink-900/60',
  levelBadgeText: 'text-pink-300',
  objectiveAccent: 'text-fuchsia-400',
  hintActiveColor: 'bg-pink-500',
  hintActiveText: 'text-pink-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-pink-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-pink-950/95',
  dialogueBorder: 'border-pink-500/30',
  bossNameColor: 'text-pink-400',
  hpSegmentColors: ['bg-red-500', 'bg-amber-500', 'bg-pink-500'],
  telegraphColor: 'bg-red-500/20',
  telegraphProgressColor: 'bg-red-500',
  playerHealthNormal: 'bg-pink-500',
  playerHealthLow: 'bg-red-500',
  phaseColors: {
    phase1: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
    phase2: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    enraged: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(236, 72, 153, 0.4)',
  victoryGlow: 'rgba(244, 114, 182, 0.6)',
  arenaEffect: 'maze',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_6_THEME: WorldTheme = {
  id: 6,
  nameKey: 'adventure.worlds.anagramLabyrinth',
  themeId: 'escher-maze',
  mechanic: 'scrambledReality',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-labyrinth',
  hud,
  timerTheme,
  bossFight,
};
