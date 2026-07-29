/**
 * World 10: Lexicon Throne Theme
 *
 * Grand golden library with wood textures and ember particles.
 * Mechanic: Final Word — all mechanics combined for the ultimate challenge
 */

import { Crown } from 'lucide-react';
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
  primary: 'amber-500',
  secondary: 'yellow-400',
  accent: 'orange-400',
  backgroundTint: 'amber-900/25',
  textLight: 'neo-white',
  textDark: 'neo-black',
  success: 'amber-500',
  warning: 'neo-yellow',
  danger: 'neo-red',
};

// ==============================================
// BACKGROUND CONFIGURATION
// ==============================================

const background: WorldBackground = {
  baseColor: 'bg-linear-to-b from-amber-950 via-yellow-950 to-orange-950',
  illustrationPath: '/images/adventure/backgrounds/throne.webp',
  layers: [
    {
      id: 'throne-hall',
      source: 'bg-linear-to-b from-amber-950 via-yellow-950 to-orange-950',
      depth: 0.1,
      opacity: 1,
      className: 'absolute inset-0',
    },
    {
      id: 'throne-shelves-far',
      source: '/images/adventure/parallax/throne-shelves-far.webp',
      depth: 0.25,
      opacity: 0.9,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    {
      id: 'throne-pillars',
      source: '/images/adventure/parallax/throne-pillars.webp',
      depth: 0.45,
      opacity: 0.95,
      className: 'absolute bottom-0 w-full h-2/3 object-cover',
    },
  ],
  texture: {
    type: 'wood',
    opacity: 0.08,
    blendMode: 'soft-light',
  },
  particles: {
    type: 'embers',
    count: 10,
    colors: ['rgba(245,158,11,0.7)', 'rgba(251,191,36,0.6)', 'rgba(217,119,6,0.5)'],
    speed: 0.6,
    sizeRange: [6, 12],
  },
};

// ==============================================
// TILE STYLES (Golden Library-themed)
// ==============================================

const tileStyles: TileStyleMap = {
  standard: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-100',
    gradientTo: 'yellow-200',
    borderColor: 'border-amber-500/40',
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
    shadowColor: 'rgba(245, 158, 11, 0.7)',
    badgeText: '3x',
    badgeBackground: 'bg-amber-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  ice: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-200',
    gradientTo: 'yellow-400',
    borderColor: 'border-amber-500',
    shadowStyle: 'glow',
    shadowColor: 'rgba(251, 191, 36, 0.5)',
    showTexture: false,
    overlayType: 'frost',
  },
  bomb: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'red-400',
    gradientTo: 'orange-600',
    borderColor: 'border-red-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(255, 80, 30, 0.6)',
    showTexture: false,
    overlayType: 'flames',
  },
  rainbow: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-300',
    gradientTo: 'orange-500',
    borderColor: 'border-amber-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(245, 158, 11, 0.6)',
    badgeText: '*',
    badgeBackground: 'bg-amber-900',
    showTexture: false,
    overlayType: 'sparkle',
  },
  chain: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'yellow-400',
    gradientTo: 'amber-600',
    borderColor: 'border-yellow-700',
    shadowStyle: 'glow',
    shadowColor: 'rgba(234, 179, 8, 0.5)',
    showTexture: false,
    overlayType: 'chain-link',
  },
  time: {
    baseClasses: 'rounded-neo border-2',
    gradientFrom: 'amber-300',
    gradientTo: 'yellow-500',
    borderColor: 'border-amber-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(245, 158, 11, 0.5)',
    badgeText: '+5s',
    badgeBackground: 'bg-amber-900',
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
    gradientFrom: 'amber-400',
    gradientTo: 'orange-500',
    borderColor: 'border-amber-600',
    shadowStyle: 'glow',
    shadowColor: 'rgba(245, 158, 11, 0.5)',
    badgeText: '2x',
    badgeBackground: 'bg-neo-black',
    showTexture: false,
    overlayType: 'sparkle',
  },
};

// ==============================================
// MODIFIER DISPLAY (Final Word)
// ==============================================

const modifierDisplay: ModifierDisplayConfig = {
  visible: true,
  icon: Crown,
  backgroundColor: 'bg-amber-500/20',
  borderColor: 'border-amber-500',
  textColor: 'text-amber-400',
  glowColor: 'rgba(245, 158, 11, 0.5)',
  position: 'top-right',
};

// ==============================================
// ANIMATIONS
// ==============================================

const animations: WorldAnimations = {
  tileEntry: 'explode',
  tileHover: 'hover:scale-105 hover:-translate-y-1',
  tileSelect: 'ring-2 ring-amber-500 scale-110',
  tileClear: 'animate-neo-pop opacity-0',
  speedMultiplier: 1.1,
};

// ==============================================
// CHAPTERS (2-2-3 structure)
// ==============================================

const chapters: [ChapterConfig, ChapterConfig, ChapterConfig] = [
  {
    number: 1,
    nameKey: 'adventure.chapters.throne.zone1',
    levelCount: 2,
    startLevel: 1,
    isBossChapter: false,
    accentColor: 'amber-500',
  },
  {
    number: 2,
    nameKey: 'adventure.chapters.throne.zone2',
    levelCount: 2,
    startLevel: 3,
    isBossChapter: false,
    accentColor: 'yellow-400',
  },
  {
    number: 3,
    nameKey: 'adventure.chapters.throne.bossZone',
    levelCount: 3,
    startLevel: 5,
    isBossChapter: true,
    accentColor: 'orange-400',
  },
];

// ==============================================
// HUD THEME (Gold/amber — regal warm)
// ==============================================

const hud: HUDTheme = {
  headerBg: 'bg-amber-950/90',
  headerBorder: 'border-amber-700/40',
  sidebarBg: 'bg-amber-950/60',
  scoreAccent: 'text-amber-400',
  levelBadgeColor: 'bg-amber-900/60',
  levelBadgeText: 'text-amber-300',
  objectiveAccent: 'text-yellow-400',
  hintActiveColor: 'bg-amber-500',
  hintActiveText: 'text-amber-950',
};

// ==============================================
// TIMER URGENCY THEME
// ==============================================

const timerTheme: TimerUrgencyTheme = {
  normal: { bg: 'bg-amber-950/80', text: 'text-neo-white', shadow: '' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  danger: { bg: 'bg-red-500/20', text: 'text-red-400', shadow: 'shadow-[0_0_16px_rgba(239,68,68,0.4)]' },
  critical: { bg: 'bg-red-500/30', text: 'text-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]' },
};

// ==============================================
// BOSS FIGHT THEME
// ==============================================

const bossFight: BossFightTheme = {
  dialogueBg: 'bg-amber-950/95',
  dialogueBorder: 'border-amber-500/30',
  bossNameColor: 'text-amber-400',
  hpSegmentColors: ['bg-red-500', 'bg-amber-500', 'bg-yellow-500'],
  telegraphColor: 'bg-red-500/20',
  telegraphProgressColor: 'bg-red-500',
  playerHealthNormal: 'bg-amber-500',
  playerHealthLow: 'bg-red-500',
  phaseColors: {
    phase1: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    phase2: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    enraged: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  avatarGlow: 'rgba(245, 158, 11, 0.5)',
  victoryGlow: 'rgba(251, 191, 36, 0.7)',
  arenaEffect: 'dragon-library',
};

// ==============================================
// COMPLETE THEME EXPORT
// ==============================================

export const WORLD_10_THEME: WorldTheme = {
  id: 10,
  nameKey: 'adventure.worlds.lexiconThrone',
  themeId: 'golden-library',
  mechanic: 'finalWord',
  colors,
  background,
  tileStyles,
  modifierDisplay,
  animations,
  chapters,
  containerClass: 'world-throne',
  hud,
  timerTheme,
  bossFight,
};
